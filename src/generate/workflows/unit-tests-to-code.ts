import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { WorkflowContext } from "../types.js";
import {
  stageTestSuite,
  type CandidateFunction,
} from "./stageTestSuites.js";

const OUT_DIR = "unit-test-to-code-tests";

export async function runUnitTestsToCode(ctx: WorkflowContext): Promise<void> {
  const metaPath = join(ctx.cwd, ".ownbench", "metadata", "candidate_functions.json");
  const raw = readFileSync(metaPath, "utf-8");
  const data: { functions: CandidateFunction[] } = JSON.parse(raw);

  const outDir = join(ctx.cwd, ".ownbench", OUT_DIR);
  mkdirSync(outDir, { recursive: true });

  const used = new Set<string>();
  let staged = 0;
  let skipped = 0;
  const total = data.functions.length;

  for (let i = 0; i < data.functions.length; i++) {
    const fn = data.functions[i];
    const idx = i + 1;

    const result = stageTestSuite(ctx.cwd, fn, used, outDir);

    if (result.status === "staged") {
      staged++;
      ctx.onEvent?.({
        type: "info",
        id: idx,
        message: `Staged ${result.folderName} (${idx}/${total})`,
      });
    } else {
      skipped++;
      ctx.onEvent?.({
        type: "info",
        id: idx,
        message: `Skipped ${fn.name} (${idx}/${total}): ${result.reason}`,
      });
    }
  }

  ctx.onEvent?.({
    type: "info",
    id: total + 1,
    message: `Staged ${staged} of ${total} candidate functions (${skipped} skipped)`,
  });
}
