import { describe, it, expect } from "vitest";
import { WORKFLOW_OPTIONS, runWorkflow, getActiveWorkflowIds } from "../../src/generate/registry.js";

describe("generate registry", () => {
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

  describe("runWorkflow", () => {
    it("rejects coming_soon workflows", async () => {
      await expect(
        runWorkflow("functional-variants", { cwd: "/fake" }),
      ).rejects.toThrow("not yet implemented");
    });

    it("rejects unknown workflow ids", async () => {
      await expect(
        runWorkflow("nonexistent", { cwd: "/fake" }),
      ).rejects.toThrow("not yet implemented");
    });
  });
});
