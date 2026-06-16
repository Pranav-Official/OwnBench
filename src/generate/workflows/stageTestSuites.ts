import { existsSync, readFileSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { obfuscateFunction } from "../obfuscateFunction.js";

export interface CandidateFunction {
  file: string;
  name: string;
  testFile: string | null;
}

export interface StageResult {
  status: "staged" | "skipped";
  folderName?: string;
  reason?: string;
}

export function flattenPath(relPath: string): string {
  return relPath.replace(/[/\\]/g, "_");
}

export function sanitizeFolderName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function uniqueFolderName(
  name: string,
  sourceFile: string,
  used: Set<string>,
): string {
  let candidate = name;
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }

  const suffix = flattenPath(sourceFile);
  candidate = `${name}__${suffix}`;
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }

  let n = 2;
  while (used.has(`${candidate}_${n}`)) {
    n++;
  }
  const final = `${candidate}_${n}`;
  used.add(final);
  return final;
}

export function stageTestSuite(
  projectDir: string,
  fn: CandidateFunction,
  used: Set<string>,
  outDir: string,
): StageResult {
  if (!fn.testFile) {
    return { status: "skipped", reason: "testFile is null" };
  }

  const srcPath = join(projectDir, fn.file);
  const testPath = join(projectDir, fn.testFile);

  if (!existsSync(srcPath)) {
    return { status: "skipped", reason: `source file missing: ${fn.file}` };
  }

  if (!existsSync(testPath)) {
    return { status: "skipped", reason: `test file missing: ${fn.testFile}` };
  }

  const folderName = uniqueFolderName(
    sanitizeFolderName(fn.name),
    fn.file,
    used,
  );
  const folderPath = join(outDir, folderName);

  mkdirSync(folderPath, { recursive: true });

  const srcDest = join(folderPath, flattenPath(fn.file));
  const testDest = join(folderPath, flattenPath(fn.testFile));

  const obfuscated = obfuscateFunction(projectDir, fn.file, fn.name);
  writeFileSync(srcDest, obfuscated, "utf-8");
  copyFileSync(testPath, testDest);

  return { status: "staged", folderName };
}
