import { describe, it, expect, vi } from "vitest";

const { mockGetProviders, mockGetModels, mockGetModel } = vi.hoisted(() => ({
  mockGetProviders: vi.fn(),
  mockGetModels: vi.fn(),
  mockGetModel: vi.fn(),
}));

vi.mock("@earendil-works/pi-ai", () => ({
  getProviders: mockGetProviders,
  getModels: mockGetModels,
  getModel: mockGetModel,
}));

import { listProviders, listModels, resolveModel } from "../../src/lib/providers.js";

describe("providers", () => {
  describe("listProviders", () => {
    it("returns mapped provider items with display names", () => {
      mockGetProviders.mockReturnValue(["openai", "anthropic", "google"]);
      expect(listProviders()).toEqual([
        { id: "openai", label: "OpenAI" },
        { id: "anthropic", label: "Anthropic" },
        { id: "google", label: "Google" },
      ]);
    });

    it("falls back to title-cased label for unknown providers", () => {
      mockGetProviders.mockReturnValue(["my-custom-provider"]);
      expect(listProviders()).toEqual([
        { id: "my-custom-provider", label: "My Custom Provider" },
      ]);
    });

    it("capitalises each hyphenated word for unknown providers", () => {
      mockGetProviders.mockReturnValue(["some-lower-case-id"]);
      expect(listProviders()).toEqual([
        { id: "some-lower-case-id", label: "Some Lower Case Id" },
      ]);
    });

    it("returns empty array when getProviders throws", () => {
      mockGetProviders.mockImplementation(() => {
        throw new Error("network error");
      });
      expect(listProviders()).toEqual([]);
    });
  });

  describe("listModels", () => {
    it("returns model picker items with detail string", () => {
      mockGetModels.mockReturnValue([
        {
          id: "gpt-4",
          name: "GPT-4",
          contextWindow: 128000,
          input: ["text", "image"],
          reasoning: true,
        },
      ]);
      const result = listModels("openai");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("gpt-4");
      expect(result[0].label).toBe("GPT-4");
      expect(result[0].detail).toContain("ctx");
      expect(result[0].detail).toContain("vision");
      expect(result[0].detail).toContain("reasoning");
    });

    it("returns detail with only context window when no extras", () => {
      mockGetModels.mockReturnValue([
        {
          id: "basic-model",
          name: "Basic Model",
          contextWindow: 4096,
          input: ["text"],
          reasoning: false,
        },
      ]);
      const result = listModels("openai");
      expect(result[0].detail).toContain("ctx");
      expect(result[0].detail).not.toContain("vision");
      expect(result[0].detail).not.toContain("reasoning");
    });

    it("returns detail with vision but no reasoning", () => {
      mockGetModels.mockReturnValue([
        {
          id: "vision-model",
          name: "Vision Model",
          contextWindow: 32000,
          input: ["text", "image"],
          reasoning: false,
        },
      ]);
      const result = listModels("openai");
      expect(result[0].detail).toContain("vision");
      expect(result[0].detail).not.toContain("reasoning");
    });

    it("handles multiple image input types", () => {
      mockGetModels.mockReturnValue([
        {
          id: "multi-model",
          name: "Multi Model",
          contextWindow: 200000,
          input: ["text", "image", "audio"],
          reasoning: false,
        },
      ]);
      const result = listModels("openai");
      expect(result[0].detail).toContain("vision");
    });

    it("returns empty array when getModels throws", () => {
      mockGetModels.mockImplementation(() => {
        throw new Error("not found");
      });
      expect(listModels("invalid-provider")).toEqual([]);
    });

    it("handles empty models list", () => {
      mockGetModels.mockReturnValue([]);
      expect(listModels("openai")).toEqual([]);
    });
  });

  describe("resolveModel", () => {
    it("delegates to getModel with provider and model id", () => {
      const model = { id: "gpt-4", name: "GPT-4" };
      mockGetModel.mockReturnValue(model);
      expect(resolveModel("openai", "gpt-4")).toBe(model);
      expect(mockGetModel).toHaveBeenCalledWith("openai", "gpt-4");
    });

    it("returns undefined when model not found", () => {
      mockGetModel.mockReturnValue(undefined);
      expect(resolveModel("openai", "nonexistent")).toBeUndefined();
    });
  });
});
