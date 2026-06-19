import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LogEvent } from "../../../src/generate/types.js";
import { runFileSubagents } from "../../../src/generate/workflows/runFileSubagents.js";

vi.mock("../../../src/agents/session.js", () => ({
  createBenchSession: vi.fn(async (cwd: string) => ({
    session: {
      prompt: vi.fn(async () => {}),
      dispose: vi.fn(),
    },
    dispose: vi.fn(),
  })),
}));

let tmpDir = "";
let events: LogEvent[];

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-subagent-test-"));
  mkdirSync(join(tmpDir, ".ownbench", "metadata", "_candidates"), {
    recursive: true,
  });
  events = [];
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function onEvent(e: LogEvent) {
  events.push(e);
}

describe("runFileSubagents", () => {
  it("emits starting event with file count and concurrency", async () => {
    const files = [
      { path: "src/a.ts", lines: 50, description: "A" },
      { path: "src/b.ts", lines: 60, description: "B" },
    ];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    expect(events[0]).toEqual({
      type: "info",
      id: 0,
      message: "Starting file analysis: 2 files, 2 concurrent agents",
    });
  });

  it("emits analyzing events for each file", async () => {
    const files = [
      { path: "src/a.ts", lines: 50, description: "A" },
      { path: "src/b.ts", lines: 60, description: "B" },
    ];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    const analyzingEvents = events.filter(
      (e) => e.type === "info" && typeof e.message === "string" && e.message.startsWith("Analyzing file"),
    );
    expect(analyzingEvents).toHaveLength(2);
  });

  it("emits collected summary at the end", async () => {
    const files = [
      { path: "src/a.ts", lines: 50, description: "A" },
    ];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    const summaryEvent = events.find(
      (e) => e.type === "info" && typeof e.message === "string" && e.message.startsWith("Collected"),
    );
    expect(summaryEvent).toBeDefined();
  });

  it("writes _all_candidates.json", async () => {
    const files = [
      { path: "src/a.ts", lines: 50, description: "A" },
    ];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    const allPath = join(tmpDir, ".ownbench", "metadata", "_all_candidates.json");
    const data = JSON.parse(readFileSync(allPath, "utf-8"));
    expect(data).toHaveProperty("functions");
    expect(Array.isArray(data.functions)).toBe(true);
  });

  it("passes correct parameters to createBenchSession", async () => {
    const { createBenchSession } = await import(
      "../../../src/agents/session.js"
    );

    const files = [
      { path: "src/a.ts", lines: 50, description: "A" },
    ];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    expect(createBenchSession).toHaveBeenCalledWith(tmpDir);
  });

  it("creates _candidates directory", async () => {
    rmSync(join(tmpDir, ".ownbench", "metadata", "_candidates"), {
      recursive: true,
      force: true,
    });

    const files = [
      { path: "src/a.ts", lines: 50, description: "A" },
    ];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    const dirExists = await import("node:fs").then((fs) =>
      fs.existsSync(join(tmpDir, ".ownbench", "metadata", "_candidates")),
    );
    expect(dirExists).toBe(true);
  });

  it("handles empty files array", async () => {
    await runFileSubagents([], tmpDir, 5, { cwd: tmpDir, onEvent });

    const summaryEvent = events.find(
      (e) => e.type === "info" && typeof e.message === "string" && e.message.startsWith("Collected"),
    );
    expect(summaryEvent).toBeDefined();
    expect((summaryEvent as any).message).toContain("0 candidates");
  });
});
