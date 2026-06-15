import type { WorkflowContext } from "../types.js";
import { generateFunctionalFiles } from "./generateFunctionalFiles.js";
import { generateCandidateFunctions } from "./generateCandidateFunctions.js";
import { generateDashboard } from "./generateDashboard.js";
import {
  clearCheckpoints,
  isCheckpointComplete,
} from "../../lib/checkpoint.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

const STEPS = [
  {
    key: "metadata.functionalFiles",
    run: generateFunctionalFiles,
    validate: (cwd: string) =>
      existsSync(join(cwd, ".ownbench", "metadata", "functional_files.json")),
  },
  {
    key: "metadata.candidateFunctions",
    run: generateCandidateFunctions,
    validate: (cwd: string) =>
      existsSync(
        join(cwd, ".ownbench", "metadata", "candidate_functions.json"),
      ),
  },
  {
    key: "metadata.dashboard",
    run: generateDashboard,
    validate: (cwd: string) =>
      existsSync(join(cwd, ".ownbench", "metadata", "index.html")),
  },
];

export async function generateMetadata(ctx: WorkflowContext): Promise<void> {
  if (ctx.stale) {
    clearCheckpoints(ctx.cwd);
  }

  for (const step of STEPS) {
    if (!isCheckpointComplete(ctx.cwd, step.key, () => step.validate(ctx.cwd))) {
      await step.run(ctx);
    }
  }
}
