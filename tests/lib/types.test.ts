import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG } from "../../src/lib/types.js";

describe("types", () => {
  describe("DEFAULT_CONFIG", () => {
    it("has empty defaults for all fields", () => {
      expect(DEFAULT_CONFIG).toEqual({
        llmProvider: "",
        primaryModel: "",
        secondaryModel: "",
        apiKeys: {},
      });
    });

    it("returns a new object each access", () => {
      const a = { ...DEFAULT_CONFIG };
      const b = { ...DEFAULT_CONFIG };
      a.llmProvider = "openai";
      expect(b.llmProvider).toBe("");
    });
  });
});
