import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, type Config } from "../../../src/lib/types.js";

type ConfigField = Exclude<keyof Config, "apiKeys">;

function updateField(prev: Config, key: ConfigField, value: string): Config {
  return { ...prev, [key]: value };
}

function updateApiKey(
  prev: Config,
  providerId: string,
  apiKey: string,
): Config {
  return {
    ...prev,
    apiKeys: { ...prev.apiKeys, [providerId]: apiKey },
  };
}

describe("config update logic", () => {
  let config: Config;

  beforeEach(() => {
    config = { ...DEFAULT_CONFIG };
  });

  describe("updateField", () => {
    it("updates llmProvider without mutating original", () => {
      const result = updateField(config, "llmProvider", "openai");
      expect(result.llmProvider).toBe("openai");
      expect(config.llmProvider).toBe("");
    });

    it("updates primaryModel", () => {
      const result = updateField(config, "primaryModel", "gpt-4");
      expect(result.primaryModel).toBe("gpt-4");
    });

    it("updates secondaryModel", () => {
      const result = updateField(config, "secondaryModel", "gpt-3.5");
      expect(result.secondaryModel).toBe("gpt-3.5");
    });

    it("preserves other fields when updating one", () => {
      const withProvider = updateField(config, "llmProvider", "openai");
      const result = updateField(withProvider, "primaryModel", "gpt-4");
      expect(result.llmProvider).toBe("openai");
      expect(result.primaryModel).toBe("gpt-4");
      expect(result.secondaryModel).toBe("");
    });
  });

  describe("updateApiKey", () => {
    it("adds a new key", () => {
      const result = updateApiKey(config, "openai", "sk-key");
      expect(result.apiKeys).toEqual({ openai: "sk-key" });
      expect(config.apiKeys).toEqual({});
    });

    it("overwrites an existing key", () => {
      const withKey = updateApiKey(config, "openai", "old-key");
      const result = updateApiKey(withKey, "openai", "new-key");
      expect(result.apiKeys).toEqual({ openai: "new-key" });
    });

    it("preserves other provider keys", () => {
      const withOai = updateApiKey(config, "openai", "sk-oai");
      const result = updateApiKey(withOai, "anthropic", "sk-ant");
      expect(result.apiKeys).toEqual({
        openai: "sk-oai",
        anthropic: "sk-ant",
      });
    });

    it("does not mutate previous apiKeys object", () => {
      const result1 = updateApiKey(config, "openai", "sk-oai");
      const result2 = updateApiKey(config, "anthropic", "sk-ant");
      expect(result1.apiKeys).toEqual({ openai: "sk-oai" });
      expect(result2.apiKeys).toEqual({ anthropic: "sk-ant" });
    });
  });
});
