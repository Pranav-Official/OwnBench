import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/lib/config.js", () => ({
  ensureInit: vi.fn(),
  readConfig: vi.fn(() => ({
    llmProvider: "",
    primaryModel: "",
    secondaryModel: "",
    apiKeys: {},
  })),
  writeConfig: vi.fn(),
}));

vi.mock("ink", () => ({
  render: vi.fn(),
  Box: () => null,
  Text: () => null,
}));

vi.mock("../../src/tui/eval/ModelSelector.js", () => ({
  ModelSelector: () => null,
}));

vi.mock("../../src/tui/eval/EvalWorkflowSelector.js", () => ({
  EvalWorkflowSelector: () => null,
}));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual("node:fs");
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  };
});

import { Command } from "commander";

describe("eval command", () => {
  it("creates a command named eval", () => {
    const cmd = new Command("eval").description(
      "Test the models on respective test suite",
    );
    expect(cmd.name()).toBe("eval");
  });

  it("eval command module exports a Command", async () => {
    const mod = await import("../../src/commands/eval.js");
    expect(mod.evalCmd).toBeDefined();
    expect(mod.evalCmd.name()).toBe("eval");
  });
});
