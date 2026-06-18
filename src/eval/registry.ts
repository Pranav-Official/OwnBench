import type { EvalWorkflowOption, EvalContext } from "./types.js";
import { runUnitTestsToCodeEval } from "./workflows/unit-tests-to-code-eval.js";
import {
  clearEvalCheckpoints,
  isEvalCheckpointComplete,
  writeEvalCheckpoint,
} from "../lib/evalCheckpoint.js";

export const EVAL_WORKFLOW_OPTIONS: EvalWorkflowOption[] = [
  {
    id: "unit-tests-to-code",
    label: "Unit Tests to Code",
    description:
      "Test the model's capability to generate code from unit tests",
    status: "active",
  },
  {
    id: "functional-variants",
    label: "Functional Variants",
    description:
      "Test the model's capability to generate functional variants of existing code",
    status: "coming_soon",
  },
  {
    id: "codebase-understanding",
    label: "Codebase Understanding",
    description:
      "Test the model's capability to understand the codebase and answer questions about it",
    status: "coming_soon",
  },
  {
    id: "codebase-conventions",
    label: "Codebase Conventions",
    description:
      "Test the model's capability to follow codebase conventions and best practices",
    status: "coming_soon",
  },
];

const EVAL_WORKFLOW_RUNNERS: Record<
  string,
  (ctx: EvalContext) => Promise<void>
> = {
  "unit-tests-to-code": runUnitTestsToCodeEval,
};

async function runEvalWorkflowById(
  id: string,
  ctx: EvalContext,
): Promise<void> {
  const runner = EVAL_WORKFLOW_RUNNERS[id];
  if (runner) {
    await runner(ctx);
    writeEvalCheckpoint(ctx.cwd, `workflow.${id}`, "completed");
  }
}

export async function runSelectedEvalWorkflows(
  ids: string[],
  ctx: EvalContext,
): Promise<void> {
  if (ctx.stale) {
    clearEvalCheckpoints(ctx.cwd);
  }

  for (const id of ids) {
    if (!isEvalCheckpointComplete(ctx.cwd, `workflow.${id}`)) {
      await runEvalWorkflowById(id, ctx);
    }
  }
}

export function getActiveEvalWorkflowIds(): string[] {
  return EVAL_WORKFLOW_OPTIONS.filter((w) => w.status === "active").map(
    (w) => w.id,
  );
}
