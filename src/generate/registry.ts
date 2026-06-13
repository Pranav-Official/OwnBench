import type { WorkflowOption, WorkflowContext } from "./types.js";
import { runUnitTestsToCode } from "./workflows/unit-tests-to-code.js";

export const WORKFLOW_OPTIONS: WorkflowOption[] = [
  {
    id: "unit-tests-to-code",
    label: "Unit Tests to Code",
    description: "Scan codebase and map functional source files sorted by size",
    status: "active",
  },
  {
    id: "functional-variants",
    label: "Functional Variants",
    description: "Generate alternative implementations of existing functions",
    status: "coming_soon",
  },
  {
    id: "codebase-understanding",
    label: "Codebase Understanding",
    description: "Generate comprehensive documentation of codebase structure",
    status: "coming_soon",
  },
  {
    id: "codebase-conventions",
    label: "Codebase Conventions",
    description: "Extract and document coding conventions from the codebase",
    status: "coming_soon",
  },
];

export async function runWorkflow(
  id: string,
  ctx: WorkflowContext,
): Promise<void> {
  switch (id) {
    case "unit-tests-to-code":
      return runUnitTestsToCode(ctx);
    default:
      throw new Error(`Workflow "${id}" is not yet implemented.`);
  }
}

export function getActiveWorkflowIds(): string[] {
  return WORKFLOW_OPTIONS.filter((w) => w.status === "active").map(
    (w) => w.id,
  );
}
