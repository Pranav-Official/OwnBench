import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WorkflowContext } from "../types.js";
import type { FunctionalFilesJson } from "./generateFunctionalFiles.js";
import {
  analyzeFile,
  type FileCandidate,
} from "./analyzeFile.js";

export interface SubagentResult {
  allCandidates: FileCandidate[];
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      await fn(items[i], i);
    }
  }

  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
}

export async function runFileSubagents(
  files: FunctionalFilesJson["files"],
  cwd: string,
  concurrentLimit: number,
  ctx: WorkflowContext,
): Promise<SubagentResult> {
  const candidatesDir = join(cwd, ".ownbench", "metadata", "_candidates");
  mkdirSync(candidatesDir, { recursive: true });

  const allCandidates: FileCandidate[] = [];
  let analyzedFiles = 0;
  let skippedFiles = 0;

  ctx.onEvent?.({
    type: "info",
    id: 0,
    message: `Starting file analysis: ${files.length} files, ${concurrentLimit} concurrent agents`,
  });

  await runWithConcurrency(files, concurrentLimit, async (file, index) => {
    const idx = index + 1;

    ctx.onEvent?.({
      type: "info",
      id: idx,
      message: `Analyzing file ${idx}/${files.length}: ${file.path}`,
    });

    const result = await analyzeFile(file, index, cwd, ctx.onEvent);

    if (result.candidates.length > 0) {
      allCandidates.push(...result.candidates);
      analyzedFiles++;
      ctx.onEvent?.({
        type: "info",
        id: idx + files.length,
        message: `Analyzed file ${idx}/${files.length}: ${result.candidates.length} candidate${result.candidates.length === 1 ? "" : "s"} found`,
      });
    } else {
      skippedFiles++;
      ctx.onEvent?.({
        type: "info",
        id: idx + files.length,
        message: `Skipped file ${idx}/${files.length}: ${file.path} (no candidates or invalid output)`,
      });
    }
  });

  const allPath = join(cwd, ".ownbench", "metadata", "_all_candidates.json");
  writeFileSync(
    allPath,
    JSON.stringify({ functions: allCandidates }, null, 2),
    "utf-8",
  );

  ctx.onEvent?.({
    type: "info",
    id: files.length * 2 + 1,
    message: `Collected ${allCandidates.length} candidates from ${analyzedFiles} files (${skippedFiles} skipped)`,
  });

  return {
    allCandidates,
    totalFiles: files.length,
    analyzedFiles,
    skippedFiles,
  };
}
