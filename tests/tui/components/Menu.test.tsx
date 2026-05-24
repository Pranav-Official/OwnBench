import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

vi.mock("ink", () => ({
  Box: (props: Record<string, unknown>) =>
    React.createElement("box", props, props.children as React.ReactNode),
  Text: (props: Record<string, unknown>) =>
    React.createElement("text", props, props.children as React.ReactNode),
  useInput: vi.fn(),
}));

vi.mock("../../../src/tui/hooks/useProviders.js", () => ({
  useModels: vi.fn(() => []),
}));

import { render } from "@testing-library/react";
import { Menu } from "../../../src/tui/components/Menu.js";
import { DEFAULT_CONFIG } from "../../../src/lib/types.js";

const items = [
  {
    label: "Provider",
    key: "llmProvider" as const,
    mode: "picker" as const,
  },
  {
    label: "Model",
    key: "primaryModel" as const,
    mode: "picker" as const,
  },
];
const footerActions = [{ label: "Manage Keys", id: "manageKeys" }];

describe("Menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders menu items", () => {
    const { container } = render(
      <Menu
        items={items}
        config={DEFAULT_CONFIG}
        onUpdate={vi.fn()}
        onUpdateKey={vi.fn()}
        providers={[
          { id: "openai", label: "OpenAI" },
          { id: "anthropic", label: "Anthropic" },
        ]}
        footerActions={footerActions}
      />,
    );
    expect(container.textContent).toContain("Provider");
    expect(container.textContent).toContain("Model");
    expect(container.textContent).toContain("Manage Keys");
  });

  it("shows unset placeholders when config is empty", () => {
    const { container } = render(
      <Menu
        items={items}
        config={DEFAULT_CONFIG}
        onUpdate={vi.fn()}
        onUpdateKey={vi.fn()}
        providers={[]}
        footerActions={footerActions}
      />,
    );
    expect(container.textContent).toContain("unset");
  });

  it("shows configured values from config", () => {
    const config = { ...DEFAULT_CONFIG, llmProvider: "openai" };
    const { container } = render(
      <Menu
        items={items}
        config={config}
        onUpdate={vi.fn()}
        onUpdateKey={vi.fn()}
        providers={[]}
        footerActions={footerActions}
      />,
    );
    expect(container.textContent).toContain("openai");
  });

  it("displays navigation help text", () => {
    const { container } = render(
      <Menu
        items={items}
        config={DEFAULT_CONFIG}
        onUpdate={vi.fn()}
        onUpdateKey={vi.fn()}
        providers={[]}
        footerActions={footerActions}
      />,
    );
    expect(container.textContent).toContain("navigate");
    expect(container.textContent).toContain("esc");
  });
});
