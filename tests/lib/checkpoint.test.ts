import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readCheckpoint,
  writeCheckpoint,
  clearCheckpoints,
  isCheckpointComplete,
} from "../../src/lib/checkpoint.js";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-checkpoint-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("checkpoint", () => {
  it("returns empty state when no checkpoint file exists", () => {
    const state = readCheckpoint(tmpDir);
    expect(state.steps).toEqual({});
  });

  it("writes and reads checkpoint", () => {
    writeCheckpoint(tmpDir, "metadata.functionalFiles", "completed");
    const state = readCheckpoint(tmpDir);
    expect(state.steps["metadata.functionalFiles"]).toBeDefined();
    expect(state.steps["metadata.functionalFiles"].status).toBe("completed");
    expect(state.steps["metadata.functionalFiles"].completedAt).toBeTruthy();
  });

  it("isCheckpointComplete returns false for missing step", () => {
    expect(isCheckpointComplete(tmpDir, "metadata.functionalFiles")).toBe(false);
  });

  it("isCheckpointComplete returns true for completed step", () => {
    writeCheckpoint(tmpDir, "metadata.functionalFiles", "completed");
    expect(isCheckpointComplete(tmpDir, "metadata.functionalFiles")).toBe(true);
  });

  it("isCheckpointComplete runs validator when provided", () => {
    writeCheckpoint(tmpDir, "metadata.functionalFiles", "completed");
    expect(
      isCheckpointComplete(tmpDir, "metadata.functionalFiles", () => false),
    ).toBe(false);
    expect(
      isCheckpointComplete(tmpDir, "metadata.functionalFiles", () => true),
    ).toBe(true);
  });

  it("clearCheckpoints resets all checkpoints", () => {
    writeCheckpoint(tmpDir, "step.a", "completed");
    writeCheckpoint(tmpDir, "step.b", "completed");
    clearCheckpoints(tmpDir);
    expect(isCheckpointComplete(tmpDir, "step.a")).toBe(false);
    expect(isCheckpointComplete(tmpDir, "step.b")).toBe(false);
  });

  it("creates .ownbench/checkpoint.json file", () => {
    writeCheckpoint(tmpDir, "test.step", "completed");
    expect(existsSync(join(tmpDir, ".ownbench", "checkpoint.json"))).toBe(true);
  });
});
