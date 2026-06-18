import type { WorkflowOption, WorkflowContext } from "./types.js";
import { generateMetadata } from "./workflows/generateMetadata.js";
import { runUnitTestsToCode } from "./workflows/unit-tests-to-code.js";
import {
  clearCheckpoints,
  isCheckpointComplete,
  writeCheckpoint,
} from "../lib/checkpoint.js";

export const WORKFLOW_OPTIONS: WorkflowOption[] = [
  {
    id: "unit-tests-to-code",
    label: "Unit Tests to Code",
    description:
      "Generate test suits that test models capabilities to generate code from unit tests",
    status: "active",
  },
  {
    id: "functional-variants",
    label: "Functional Variants",
    description:
      "Generate tests that test models capabilities to generate functional variants of existing code",
    status: "coming_soon",
  },
  {
    id: "codebase-understanding",
    label: "Codebase Understanding",
    description:
      "Generate tests that test models capabilities to understand the codebase and answer questions about it",
    status: "coming_soon",
  },
  {
    id: "codebase-conventions",
    label: "Codebase Conventions",
    description:
      "Generate tests that test models capabilities following codebase conventions and best practices",
    status: "coming_soon",
  },
];

const WORKFLOW_RUNNERS: Record<
  string,
  (ctx: WorkflowContext) => Promise<void>
> = {
  "unit-tests-to-code": runUnitTestsToCode,
};

async function runWorkflowById(
  id: string,
  ctx: WorkflowContext,
): Promise<void> {
  const runner = WORKFLOW_RUNNERS[id];
  if (runner) {
    await runner(ctx);
    writeCheckpoint(ctx.cwd, `workflow.${id}`, "completed");
  }
}

export async function runSelectedWorkflows(
  ids: string[],
  ctx: WorkflowContext,
): Promise<void> {
  if (ctx.stale) {
    clearCheckpoints(ctx.cwd);
  }

  await generateMetadata(ctx);

  for (const id of ids) {
    if (!isCheckpointComplete(ctx.cwd, `workflow.${id}`)) {
      await runWorkflowById(id, ctx);
    }
  }
}

export function getActiveWorkflowIds(): string[] {
  return WORKFLOW_OPTIONS.filter((w) => w.status === "active").map((w) => w.id);
}
