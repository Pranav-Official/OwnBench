import { existsSync } from "node:fs";
import { join, dirname, basename, extname, normalize } from "node:path";

function norm(p: string): string {
  return normalize(p).replace(/\\/g, "/");
}

export function findTestFile(projectDir: string, sourcePath: string): string | null {
  const dir = dirname(sourcePath);
  const ext = extname(sourcePath);
  const base = basename(sourcePath, ext);
  const nameNoExt = extname(base);
  const stem = nameNoExt ? basename(base, nameNoExt) : base;

  const patterns: string[] = [];

  if (ext === ".ts" || ext === ".tsx") {
    const testExt = ext === ".tsx" ? ".test.tsx" : ".test.ts";
    patterns.push(norm(join(dir, `${stem}${testExt}`)));
  } else if (ext === ".js" || ext === ".jsx") {
    const testExt = ext === ".jsx" ? ".test.jsx" : ".test.js";
    patterns.push(norm(join(dir, `${stem}${testExt}`)));
  }

  patterns.push(norm(join(dir, `${stem}.test.${ext.replace(".", "")}`)));

  const relSegments = dir.split(/[/\\]/);
  if (dir !== "." && relSegments.length >= 1 && relSegments[0] !== ".") {
    patterns.push(norm(join("tests", dir, `${stem}.test.ts`)));
    patterns.push(norm(join("__tests__", dir, `${stem}.test.ts`)));
  }

  patterns.push(norm(join(dir, "__tests__", `${stem}.test.${ext.replace(".", "")}`)));
  patterns.push(norm(join(dir, "__tests__", `${stem}.spec.${ext.replace(".", "")}`)));

  for (const p of patterns) {
    if (existsSync(join(projectDir, p))) {
      return p;
    }
  }

  return null;
}
