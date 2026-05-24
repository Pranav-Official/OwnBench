import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("ink", () => ({
  Box: (props: Record<string, unknown>) =>
    React.createElement("box", props, props.children as React.ReactNode),
  Text: (props: Record<string, unknown>) =>
    React.createElement("text", props, props.children as React.ReactNode),
  useInput: vi.fn(),
}));

vi.mock("../../src/lib/config.js", () => ({
  readConfig: vi.fn(() => ({
    llmProvider: "",
    primaryModel: "",
    secondaryModel: "",
    apiKeys: {},
  })),
  writeConfig: vi.fn(),
  ensureInit: vi.fn(),
}));

vi.mock("../../src/lib/providers.js", () => ({
  listProviders: vi.fn(() => []),
  listModels: vi.fn(() => []),
}));

import { render } from "@testing-library/react";
import { App } from "../../src/tui/app.js";

describe("App", () => {
  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it("renders the configuration title", () => {
    const { container } = render(<App />);
    expect(container.textContent).toContain("OwnBench Configuration");
  });

  it("renders menu items", () => {
    const { container } = render(<App />);
    expect(container.textContent).toContain("Benchmark LLM Provider");
    expect(container.textContent).toContain("Manage API Keys");
  });
});
