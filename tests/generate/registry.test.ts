import { describe, it, expect } from "vitest";
import { WORKFLOW_OPTIONS, runSelectedWorkflows, getActiveWorkflowIds } from "../../src/generate/registry.js";

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

  describe("runSelectedWorkflows", () => {
    it("fails before workflow validation when no config exists", async () => {
      await expect(
        runSelectedWorkflows(["functional-variants"], { cwd: "/fake" }),
      ).rejects.toThrow("No LLM provider");
    });

    it("fails before workflow validation for unknown ids", async () => {
      await expect(
        runSelectedWorkflows(["nonexistent"], { cwd: "/fake" }),
      ).rejects.toThrow("No LLM provider");
    });
  });
});
