export type WorkflowStatus = "active" | "coming_soon";

export interface WorkflowOption {
  id: string;
  label: string;
  description: string;
  status: WorkflowStatus;
}

export interface WorkflowContext {
  cwd: string;
  onEvent?: (event: LogEvent) => void;
  stale?: boolean;
  maxRetries?: number;
  concurrentAgents?: number;
}

export type LogEvent =
  | {
      type: "tool_start";
      id: number;
      toolName: string;
      args: Record<string, unknown>;
    }
  | {
      type: "tool_end";
      id: number;
      toolName: string;
      result: unknown;
      isError: boolean;
    }
  | {
      type: "tool_update";
      id: number;
      partialResult: unknown;
    }
  | {
      type: "thinking";
      id: number;
      delta: string;
    }
  | {
      type: "text";
      id: number;
      delta: string;
    }
  | {
      type: "info";
      id: number;
      message: string;
    }
  | {
      type: "subagent_init";
      files: { path: string }[];
      concurrentLimit: number;
    }
  | {
      type: "subagent_start";
      index: number;
      path: string;
      total: number;
    }
  | {
      type: "subagent_done";
      index: number;
      path: string;
      candidateCount: number;
    }
  | {
      type: "subagent_skip";
      index: number;
      path: string;
      reason: string;
    }
  | {
      type: "subagent_summary";
      totalCandidates: number;
      analyzedFiles: number;
      skippedFiles: number;
      totalFiles: number;
    }
  | {
      type: "phase";
      phase: "metadata" | "subagent_analysis" | "main_agent" | "workflow";
      label: string;
    };
