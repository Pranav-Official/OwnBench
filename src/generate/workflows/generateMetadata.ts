import type { WorkflowContext } from "../types.js";
import { generateFunctionalFiles } from "./generateFunctionalFiles.js";
import { generateCandidateFunctions } from "./generateCandidateFunctions.js";
import { generateDashboard } from "./generateDashboard.js";
import {
  clearCheckpoints,
  writeCheckpoint,
  isCheckpointComplete,
} from "../../lib/checkpoint.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface MetadataStep {
  key: string;
  run: (ctx: WorkflowContext) => Promise<void>;
  validate: (cwd: string) => boolean;
}

const STEPS: MetadataStep[] = [
  {
    key: "metadata.functionalFiles",
    run: generateFunctionalFiles,
    validate: (cwd: string) =>
      existsSync(join(cwd, ".ownbench", "metadata", "functional_files.json")),
  },
  {
    key: "metadata.candidateFunctions",
    run: generateCandidateFunctions,
    validate: (cwd: string) => {
      const filePath = join(
        cwd,
        ".ownbench",
        "metadata",
        "candidate_functions.json",
      );
      if (!existsSync(filePath)) return false;
      try {
        const data = JSON.parse(readFileSync(filePath, "utf-8"));
        return !!(data && Array.isArray(data.functions) && data.functions.length > 0);
      } catch {
        return false;
      }
    },
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
    if (!isCheckpointComplete(ctx.cwd, step.key)) {
      await step.run(ctx);
      if (!step.validate(ctx.cwd)) {
        throw new Error(
          `Metadata step "${step.key}" failed: output artifact is missing or invalid after execution.`,
        );
      }
      writeCheckpoint(ctx.cwd, step.key, "completed");
    }
  }
}
