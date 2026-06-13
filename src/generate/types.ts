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
    };
