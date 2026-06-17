import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorkflowContext } from "../../../src/generate/types.js";

vi.mock("../../../src/agents/session.js", () => ({
  createPersistentSession: vi.fn(),
  clearStepSession: vi.fn(),
}));

const { createPersistentSession, clearStepSession } = await import(
  "../../../src/agents/session.js"
);
const mockCreatePersistentSession = vi.mocked(createPersistentSession);
const mockClearStepSession = vi.mocked(clearStepSession);

function makeSession(overrides?: {
  promptFn?: () => Promise<void>;
  followUpFn?: () => Promise<void>;
}) {
  return {
    session: {
      prompt: overrides?.promptFn ?? vi.fn(async () => {}),
      followUp: overrides?.followUpFn ?? vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
    },
    dispose: vi.fn(),
  };
}

function makeCtx(overrides?: Partial<WorkflowContext>): WorkflowContext {
  return {
    cwd: "/test",
    maxRetries: 3,
    ...overrides,
  };
}

// We need to import runPromptWithRetry AFTER setting up the mocks.
// Use dynamic import inside tests or import at the top level after vi.mock.
// Since vi.mock is hoisted, importing here gets the mocked session module.
const { runPromptWithRetry } = await import(
  "../../../src/generate/workflows/runPromptWithRetry.js"
);

describe("runPromptWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls prompt once and succeeds when validator passes on first attempt", async () => {
    const sess = makeSession();
    mockCreatePersistentSession.mockResolvedValue(sess);

    const validator = vi.fn(() => null);

    await runPromptWithRetry(makeCtx(), "test.step", "do something", validator);

    expect(sess.session.prompt).toHaveBeenCalledTimes(1);
    expect(sess.session.followUp).not.toHaveBeenCalled();
    expect(sess.dispose).toHaveBeenCalled();
  });

  it("retries with follow-up when validator fails, then succeeds", async () => {
    const sess = makeSession();
    mockCreatePersistentSession.mockResolvedValue(sess);

    let calls = 0;
    const validator = vi.fn(() => {
      calls++;
      if (calls <= 1) return "file not found";
      return null;
    });

    const p = runPromptWithRetry(makeCtx(), "test.step", "do something", validator);
    await vi.advanceTimersByTimeAsync(2000);
    await p;

    expect(sess.session.prompt).toHaveBeenCalledTimes(1);
    expect(sess.session.followUp).toHaveBeenCalledTimes(1);
    expect(sess.session.followUp).toHaveBeenCalledWith(
      expect.stringContaining("[ownbench-retry attempt=1 max=3]"),
    );
    expect(sess.session.followUp).toHaveBeenCalledWith(
      expect.stringContaining("file not found"),
    );
    expect(validator).toHaveBeenCalledTimes(2);
    expect(sess.dispose).toHaveBeenCalled();
  });

  it("retries multiple times and throws after maxRetries exhausted", async () => {
    const sess = makeSession();
    mockCreatePersistentSession.mockResolvedValue(sess);

    const validator = vi.fn(() => "always fails");

    const p = runPromptWithRetry(
      makeCtx({ maxRetries: 2 }),
      "test.step",
      "do something",
      validator,
    );
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(5000);
    await expect(p).rejects.toThrow("failed after 3 attempt(s)");
    expect(sess.session.followUp).toHaveBeenCalledTimes(2);
    expect(validator).toHaveBeenCalledTimes(3);
  });

  it("retries when session.prompt throws, then succeeds on follow-up", async () => {
    let promptCalls = 0;
    const promptFn = vi.fn(async () => {
      promptCalls++;
      if (promptCalls === 1) throw new Error("network timeout");
    });
    const sess = makeSession({ promptFn });
    mockCreatePersistentSession.mockResolvedValue(sess);

    const validator = vi.fn(() => null);

    const p = runPromptWithRetry(makeCtx(), "test.step", "do something", validator);
    await vi.advanceTimersByTimeAsync(2000);
    await p;

    // First prompt failed, so a follow-up was sent
    expect(sess.session.prompt).toHaveBeenCalledTimes(1);
    expect(sess.session.followUp).toHaveBeenCalledTimes(1);
    expect(sess.session.followUp).toHaveBeenCalledWith(
      expect.stringContaining("network timeout"),
    );
    expect(validator).toHaveBeenCalledTimes(1);
    expect(sess.dispose).toHaveBeenCalled();
  });

  it("retries session.prompt throw, then throws if retries exhausted", async () => {
    const promptFn = vi.fn(async () => {
      throw new Error("always fails");
    });
    const sess = makeSession({ promptFn });
    mockCreatePersistentSession.mockResolvedValue(sess);

    const validator = vi.fn(() => "bad output");

    const p = runPromptWithRetry(
      makeCtx({ maxRetries: 1 }),
      "test.step",
      "do something",
      validator,
    );
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(3000);
    await expect(p).rejects.toThrow("failed after 2 attempt(s)");
    expect(sess.session.followUp).toHaveBeenCalledTimes(1);
  });

  it("clears session when stale is true", async () => {
    const sess = makeSession();
    mockCreatePersistentSession.mockResolvedValue(sess);

    await runPromptWithRetry(
      makeCtx({ stale: true }),
      "test.step",
      "do something",
      () => null,
    );

    expect(mockClearStepSession).toHaveBeenCalledWith("test.step");
  });

  it("does not clear session when stale is false", async () => {
    const sess = makeSession();
    mockCreatePersistentSession.mockResolvedValue(sess);

    await runPromptWithRetry(
      makeCtx({ stale: false }),
      "test.step",
      "do something",
      () => null,
    );

    expect(mockClearStepSession).not.toHaveBeenCalled();
  });

  it("emits info events on each retry attempt", async () => {
    const sess = makeSession();
    mockCreatePersistentSession.mockResolvedValue(sess);

    const events: any[] = [];
    const ctx = makeCtx({
      onEvent: (e) => events.push(e),
    });

    let calls = 0;
    const validator = vi.fn(() => {
      calls++;
      if (calls <= 2) return "bad output";
      return null;
    });

    const p = runPromptWithRetry(ctx, "test.step", "do something", validator);
    await vi.advanceTimersByTimeAsync(5000);
    await p;

    const infoEvents = events.filter((e: any) => e.type === "info");
    expect(infoEvents).toHaveLength(2);
    expect(infoEvents[0].message).toContain("Attempt 1/3");
    expect(infoEvents[1].message).toContain("Attempt 2/3");
  });

  it("uses ctx.maxRetries as default when options.maxRetries is not set", async () => {
    const sess = makeSession();
    mockCreatePersistentSession.mockResolvedValue(sess);

    const validator = vi.fn(() => "always fails");

    const p = runPromptWithRetry(
      makeCtx({ maxRetries: 1 }),
      "test.step",
      "do something",
      validator,
    );
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(3000);
    await expect(p).rejects.toThrow("failed after 2 attempt(s)");
    expect(sess.session.followUp).toHaveBeenCalledTimes(1);
  });

  it("options.maxRetries overrides ctx.maxRetries", async () => {
    const sess = makeSession();
    mockCreatePersistentSession.mockResolvedValue(sess);

    const validator = vi.fn(() => "always fails");

    const p = runPromptWithRetry(
      makeCtx({ maxRetries: 5 }),
      "test.step",
      "do something",
      validator,
      { maxRetries: 1 },
    );
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(3000);
    await expect(p).rejects.toThrow("failed after 2 attempt(s)");
    expect(sess.session.followUp).toHaveBeenCalledTimes(1);
  });

  it("disposes session on success", async () => {
    const sess = makeSession();
    mockCreatePersistentSession.mockResolvedValue(sess);

    await runPromptWithRetry(makeCtx(), "test.step", "do something", () => null);

    expect(sess.dispose).toHaveBeenCalledTimes(1);
  });

  it("disposes session on failure after exhausting retries", async () => {
    const sess = makeSession();
    mockCreatePersistentSession.mockResolvedValue(sess);

    const p = runPromptWithRetry(
      makeCtx({ maxRetries: 1 }),
      "test.step",
      "do something",
      () => "bad",
    );
    p.catch(() => {});
    await vi.advanceTimersByTimeAsync(3000);
    await expect(p).rejects.toThrow();

    expect(sess.dispose).toHaveBeenCalledTimes(1);
  });

  it("includes final attempt message in follow-up on last retry", async () => {
    const sess = makeSession();
    mockCreatePersistentSession.mockResolvedValue(sess);

    let calls = 0;
    const validator = vi.fn(() => {
      calls++;
      // Fail on calls 1-3 (initial + 2 retries), succeed on call 4
      if (calls <= 3) return "bad";
      return null;
    });

    const p = runPromptWithRetry(
      makeCtx({ maxRetries: 3 }),
      "test.step",
      "do something",
      validator,
    );
    await vi.advanceTimersByTimeAsync(10000);
    await p;

    // 3 follow-ups: attempt 1, 2, 3
    expect(sess.session.followUp).toHaveBeenCalledTimes(3);
    const followUpCalls = (sess.session.followUp as any).mock.calls;
    expect(followUpCalls[2][0]).toContain("This is the final attempt");
  });
});
