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

vi.mock("../../src/tui/app.js", () => ({
  App: () => null,
}));

import { Command } from "commander";

describe("config command", () => {
  it("creates a command named config", () => {
    const program = new Command();
    // Replicate what src/commands/config.tsx does structurally
    const cmd = new Command("config")
      .description("Edit benchgen configuration");
    expect(cmd.name()).toBe("config");
  });

  it("config command module exports a Command", async () => {
    const mod = await import("../../src/commands/config.js");
    expect(mod.configCmd).toBeDefined();
    expect(mod.configCmd.name()).toBe("config");
  });
});
