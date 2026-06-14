import { createBenchSession } from "../../agents/session.js";
import type { WorkflowContext, LogEvent } from "../types.js";

export async function runPrompt(
  ctx: WorkflowContext,
  prompt: string,
): Promise<void> {
  const { session, dispose } = await createBenchSession(ctx.cwd);

  let nextId = 0;
  const emit = (event: LogEvent) => ctx.onEvent?.(event);

  session.subscribe((event) => {
    if (event.type === "tool_execution_start") {
      emit({
        type: "tool_start",
        id: nextId++,
        toolName: event.toolName,
        args: event.args as Record<string, unknown>,
      });
    } else if (event.type === "tool_execution_end") {
      emit({
        type: "tool_end",
        id: nextId++,
        toolName: event.toolName,
        result: event.result,
        isError: event.isError,
      });
    } else if (event.type === "tool_execution_update") {
      emit({
        type: "tool_update",
        id: nextId++,
        partialResult: event.partialResult,
      });
    } else if (
      event.type === "message_update" &&
      event.assistantMessageEvent.type === "thinking_delta"
    ) {
      emit({
        type: "thinking",
        id: nextId++,
        delta: event.assistantMessageEvent.delta,
      });
    } else if (
      event.type === "message_update" &&
      event.assistantMessageEvent.type === "text_delta"
    ) {
      emit({
        type: "text",
        id: nextId++,
        delta: event.assistantMessageEvent.delta,
      });
    }
  });

  try {
    await session.prompt(prompt);
  } finally {
    dispose();
  }
}
