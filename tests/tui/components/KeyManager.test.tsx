import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

vi.mock("ink", () => ({
  Box: (props: Record<string, unknown>) =>
    React.createElement("box", props, props.children as React.ReactNode),
  Text: (props: Record<string, unknown>) =>
    React.createElement("text", props, props.children as React.ReactNode),
  useInput: vi.fn(),
}));

import { render, screen } from "@testing-library/react";
import { KeyManager } from "../../../src/tui/components/KeyManager.js";

const providers = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
];

describe("KeyManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all providers", () => {
    const { container } = render(
      <KeyManager
        providers={providers}
        apiKeys={{}}
        onUpdateKey={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("OpenAI");
    expect(container.textContent).toContain("Anthropic");
  });

  it("shows masked key for providers with a saved key", () => {
    const { container } = render(
      <KeyManager
        providers={providers}
        apiKeys={{ openai: "sk-secret-key" }}
        onUpdateKey={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("****");
  });

  it("shows no-key placeholder for providers without a key", () => {
    const { container } = render(
      <KeyManager
        providers={providers}
        apiKeys={{}}
        onUpdateKey={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("no key");
  });

  it("displays the title", () => {
    render(
      <KeyManager
        providers={providers}
        apiKeys={{}}
        onUpdateKey={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("Manage API Keys")).toBeTruthy();
  });

  it("shows navigation help when not editing", () => {
    const { container } = render(
      <KeyManager
        providers={providers}
        apiKeys={{}}
        onUpdateKey={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("navigate");
    expect(container.textContent).toContain("esc");
  });
});
