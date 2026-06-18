import type { WorkflowContext } from "../generate/types.js";

export type EvalStatus = "active" | "coming_soon";

export interface EvalWorkflowOption {
  id: string;
  label: string;
  description: string;
  status: EvalStatus;
}

export interface EvalContext extends WorkflowContext {
  model: string;
  provider: string;
}
