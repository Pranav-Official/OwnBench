import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chdir, cwd } from "node:process";

let tmpDir = "";
let originalCwd = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-workflow-test-"));
  originalCwd = cwd();
  chdir(tmpDir);
  mkdirSync(join(tmpDir, ".ownbench"), { recursive: true });
});

afterEach(() => {
  chdir(originalCwd);
  rmSync(tmpDir, { recursive: true, force: true });
});

vi.mock("../../../src/agents/session.js", () => ({
  createBenchSession: vi.fn(),
}));

vi.mock("../../../src/lib/config.js", () => ({
  readConfig: vi.fn(() => ({
    llmProvider: "anthropic",
    primaryModel: "claude",
    secondaryModel: "",
    apiKeys: {},
  })),
}));

describe("runUnitTestsToCode", () => {
  it("creates .ownbench/metadata directory before running agent", async () => {
    const { createBenchSession } = await import(
      "../../../src/agents/session.js"
    );
    const { runUnitTestsToCode } = await import(
      "../../../src/generate/workflows/unit-tests-to-code.js"
    );

    const mockSession = {
      agent: { waitForIdle: vi.fn() },
      prompt: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
      dispose: vi.fn(),
    };

    vi.mocked(createBenchSession).mockResolvedValue({
      session: mockSession as any,
      dispose: vi.fn(),
    });

    await runUnitTestsToCode({ cwd: tmpDir });

    const { existsSync } = await import("node:fs");
    expect(existsSync(join(tmpDir, ".ownbench", "metadata"))).toBe(true);
    expect(mockSession.prompt).toHaveBeenCalledTimes(1);
  });

  it("calls dispose even when prompt fails", async () => {
    const { createBenchSession } = await import(
      "../../../src/agents/session.js"
    );
    const { runUnitTestsToCode } = await import(
      "../../../src/generate/workflows/unit-tests-to-code.js"
    );

    const dispose = vi.fn();
    const mockSession = {
      agent: { waitForIdle: vi.fn() },
      prompt: vi.fn().mockRejectedValue(new Error("API error")),
      subscribe: vi.fn(),
      dispose: vi.fn(),
    };

    vi.mocked(createBenchSession).mockResolvedValue({
      session: mockSession as any,
      dispose,
    });

    await expect(
      runUnitTestsToCode({ cwd: tmpDir }),
    ).rejects.toThrow("API error");
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
