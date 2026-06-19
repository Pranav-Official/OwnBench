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
  it("emits subagent_init with file list and concurrency", async () => {
    const files = [
      { path: "src/a.ts", lines: 50, description: "A" },
      { path: "src/b.ts", lines: 60, description: "B" },
    ];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    expect(events[0]).toEqual({
      type: "subagent_init",
      files: [{ path: "src/a.ts" }, { path: "src/b.ts" }],
      concurrentLimit: 2,
    });
  });

  it("emits subagent_start and subagent_done/skip for each file", async () => {
    const files = [
      { path: "src/a.ts", lines: 50, description: "A" },
      { path: "src/b.ts", lines: 60, description: "B" },
    ];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    const startEvents = events.filter((e) => e.type === "subagent_start");
    expect(startEvents).toHaveLength(2);

    const doneOrSkip = events.filter(
      (e) => e.type === "subagent_done" || e.type === "subagent_skip",
    );
    expect(doneOrSkip).toHaveLength(2);
  });

  it("emits subagent_summary at the end", async () => {
    const files = [{ path: "src/a.ts", lines: 50, description: "A" }];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    const summaryEvent = events.find((e) => e.type === "subagent_summary");
    expect(summaryEvent).toBeDefined();
  });

  it("writes _all_candidates.json", async () => {
    const files = [{ path: "src/a.ts", lines: 50, description: "A" }];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    const allPath = join(
      tmpDir,
      ".ownbench",
      "metadata",
      "_all_candidates.json",
    );
    const data = JSON.parse(readFileSync(allPath, "utf-8"));
    expect(data).toHaveProperty("functions");
    expect(Array.isArray(data.functions)).toBe(true);
  });

  it("passes correct parameters to createBenchSession", async () => {
    const { createBenchSession } = await import(
      "../../../src/agents/session.js"
    );

    const files = [{ path: "src/a.ts", lines: 50, description: "A" }];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    expect(createBenchSession).toHaveBeenCalledWith(tmpDir);
  });

  it("creates _candidates directory", async () => {
    rmSync(join(tmpDir, ".ownbench", "metadata", "_candidates"), {
      recursive: true,
      force: true,
    });

    const files = [{ path: "src/a.ts", lines: 50, description: "A" }];

    await runFileSubagents(files, tmpDir, 2, { cwd: tmpDir, onEvent });

    const dirExists = await import("node:fs").then((fs) =>
      fs.existsSync(join(tmpDir, ".ownbench", "metadata", "_candidates")),
    );
    expect(dirExists).toBe(true);
  });

  it("emits subagent_summary for empty files array", async () => {
    await runFileSubagents([], tmpDir, 5, { cwd: tmpDir, onEvent });

    const summaryEvent = events.find((e) => e.type === "subagent_summary");
    expect(summaryEvent).toBeDefined();
    expect((summaryEvent as any).totalCandidates).toBe(0);
    expect((summaryEvent as any).totalFiles).toBe(0);
  });
});
