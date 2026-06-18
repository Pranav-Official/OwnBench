import { describe, it, expect, vi } from "vitest";

vi.mock("ink", () => ({
  Box: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  useInput: vi.fn(),
}));

import { readEvalCheckpoint, writeEvalCheckpoint, clearEvalCheckpoints, isEvalCheckpointComplete } from "../../src/lib/evalCheckpoint.js";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-eval-cp-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("evalCheckpoint", () => {
  it("returns empty state when no checkpoint file exists", () => {
    const state = readEvalCheckpoint(tmpDir);
    expect(state.steps).toEqual({});
  });

  it("writes and reads a checkpoint", () => {
    writeEvalCheckpoint(tmpDir, "workflow.unit-tests-to-code", "completed");
    const state = readEvalCheckpoint(tmpDir);
    expect(state.steps["workflow.unit-tests-to-code"]).toBeDefined();
    expect(state.steps["workflow.unit-tests-to-code"].status).toBe("completed");
  });

  it("isEvalCheckpointComplete returns true for written step", () => {
    writeEvalCheckpoint(tmpDir, "workflow.unit-tests-to-code", "completed");
    expect(isEvalCheckpointComplete(tmpDir, "workflow.unit-tests-to-code")).toBe(true);
  });

  it("isEvalCheckpointComplete returns false for missing step", () => {
    expect(isEvalCheckpointComplete(tmpDir, "workflow.unit-tests-to-code")).toBe(false);
  });

  it("clearEvalCheckpoints resets the checkpoint file", () => {
    writeEvalCheckpoint(tmpDir, "workflow.unit-tests-to-code", "completed");
    clearEvalCheckpoints(tmpDir);
    const state = readEvalCheckpoint(tmpDir);
    expect(state.steps).toEqual({});
  });
});
