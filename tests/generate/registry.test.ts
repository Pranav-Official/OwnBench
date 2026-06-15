import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/generate/workflows/generateMetadata.js", () => ({
  generateMetadata: vi.fn(),
}));

vi.mock("../../src/generate/workflows/unit-tests-to-code.js", () => ({
  runUnitTestsToCode: vi.fn(),
}));

vi.mock("../../src/lib/checkpoint.js", () => ({
  clearCheckpoints: vi.fn(),
  isCheckpointComplete: vi.fn(() => false),
  writeCheckpoint: vi.fn(),
}));

import { WORKFLOW_OPTIONS, runSelectedWorkflows, getActiveWorkflowIds } from "../../src/generate/registry.js";

describe("generate registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe("WORKFLOW_OPTIONS", () => {
    it("has 4 workflow options", () => {
      expect(WORKFLOW_OPTIONS).toHaveLength(4);
    });

    it("has correct ids", () => {
      const ids = WORKFLOW_OPTIONS.map((o) => o.id);
      expect(ids).toEqual([
        "unit-tests-to-code",
        "functional-variants",
        "codebase-understanding",
        "codebase-conventions",
      ]);
    });

    it("has only the first option as active", () => {
      const statuses = WORKFLOW_OPTIONS.map((o) => o.status);
      expect(statuses[0]).toBe("active");
      for (let i = 1; i < statuses.length; i++) {
        expect(statuses[i]).toBe("coming_soon");
      }
    });

    it("each option has label and description", () => {
      for (const opt of WORKFLOW_OPTIONS) {
        expect(opt.label).toBeTruthy();
        expect(opt.description).toBeTruthy();
      }
    });
  });

  describe("getActiveWorkflowIds", () => {
    it("returns only active workflow ids", () => {
      const active = getActiveWorkflowIds();
      expect(active).toEqual(["unit-tests-to-code"]);
    });
  });

  describe("runSelectedWorkflows", () => {
    it("calls generateMetadata before running workflows", async () => {
      const { generateMetadata } = await import(
        "../../src/generate/workflows/generateMetadata.js"
      );

      await runSelectedWorkflows(["unit-tests-to-code"], { cwd: "/fake" });

      expect(generateMetadata).toHaveBeenCalled();
    });

    it("skips unknown workflow ids", async () => {
      const { runUnitTestsToCode } = await import(
        "../../src/generate/workflows/unit-tests-to-code.js"
      );

      await runSelectedWorkflows(["nonexistent"], { cwd: "/fake" });

      expect(runUnitTestsToCode).not.toHaveBeenCalled();
    });
  });
});
