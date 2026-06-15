import {
  createPersistentSession,
  clearStepSession,
} from "../../agents/session.js";
import type { WorkflowContext, LogEvent } from "../types.js";

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms between retries — doubled each attempt (default: 1000) */
  baseDelayMs?: number;
}

/**
 * Diagnostic function called after each attempt to determine if a retry is
 * needed.  Return `null` if the output is valid.  Return a human-readable
 * explanation of what went wrong when a retry should happen.
 */
export type RetryValidator = () => string | null;

/**
 * Run an LLM prompt with automatic retry on failure or invalid output.
 *
 * The session is persisted to disk so each retry continues the full
 * conversation history (file reads, tool calls, prior analysis).  On retry
 * a follow-up message is injected describing the failure and what to fix.
 *
 * Handles two failure modes:
 * 1. **Session error** — `session.prompt()` throws (network, auth, API).
 *    The error is caught, and a follow-up explains what happened.
 * 2. **Validation error** — prompt succeeds but the output artifact is
 *    missing or invalid (validator returns a string).
 *
 * @param ctx       workflow context (cwd, onEvent, maxRetries)
 * @param stepKey   unique key for this step (e.g. "metadata.candidateFunctions")
 * @param prompt    the initial prompt to send to the agent
 * @param validator called after each attempt — return null on success, error string on failure
 */
export async function runPromptWithRetry(
  ctx: WorkflowContext,
  stepKey: string,
  prompt: string,
  validator: RetryValidator,
  options?: RetryOptions,
): Promise<void> {
  const maxRetries = options?.maxRetries ?? ctx.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;

  // Clear any stale persisted session from a previous run (e.g. if --stale
  // was used).
  if (ctx.stale) {
    clearStepSession(stepKey);
  }

  const { session, dispose } = await createPersistentSession(
    ctx.cwd,
    stepKey,
  );

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
    let validationError: string | null = null;
    let lastError: string | null = null;

    // ── Initial prompt ──────────────────────────────────────────────
    try {
      await session.prompt(prompt);
      validationError = validator();
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      validationError = lastError;
    }

    // ── Retry loop ──────────────────────────────────────────────────
    let attempt = 1;
    while (validationError !== null && attempt <= maxRetries) {
      emit({
        type: "info",
        id: nextId++,
        message:
          `[ownbench-retry] Attempt ${attempt}/${maxRetries}: ` +
          `previous attempt did not produce valid output. ` +
          `Reason: ${validationError}`,
      });

      const followUp = buildRetryFollowUp(
        attempt,
        maxRetries,
        validationError,
      );
      await session.followUp(followUp);

      // Re-validate — if the follow-up succeeded the agent should have
      // written the output file.
      validationError = validator();

      if (validationError !== null) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delayMs);
        attempt++;
      }
    }

    // ── Final result ────────────────────────────────────────────────
    if (validationError !== null) {
      throw new Error(
        `Step "${stepKey}" failed after ${maxRetries + 1} attempt(s). ` +
          `Last error: ${validationError}`,
      );
    }
  } finally {
    dispose();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function buildRetryFollowUp(
  attempt: number,
  maxRetries: number,
  reason: string,
): string {
  const remaining = maxRetries - attempt;
  return (
    `[ownbench-retry attempt=${attempt} max=${maxRetries}]\n\n` +
    `The previous attempt did not produce the required output artifact.\n\n` +
    `Diagnosis: ${reason}\n\n` +
    `Fix the issue described above and retry the task. ` +
    `Use the \`write_ownbench\` tool to write the output file.\n\n` +
    (remaining > 0
      ? `${remaining} attempt(s) remaining after this one.`
      : `This is the final attempt — make it count.`)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
