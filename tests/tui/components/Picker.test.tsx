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
import { Picker } from "../../../src/tui/components/Picker.js";

describe("Picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state message when no items", () => {
    const { container } = render(
      <Picker
        title="Select Model"
        items={[]}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("Select Model");
    expect(container.textContent).toContain("No items available");
  });

  it("renders all items when list is populated", () => {
    const items = [
      { id: "gpt-4", label: "GPT-4", detail: "128k ctx" },
      { id: "gpt-3.5", label: "GPT-3.5" },
    ];
    const { container } = render(
      <Picker
        title="Select Model"
        items={items}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("GPT-4");
    expect(container.textContent).toContain("128k ctx");
    expect(container.textContent).toContain("GPT-3.5");
  });

  it("renders items without detail", () => {
    const items = [{ id: "simple", label: "Simple" }];
    const { container } = render(
      <Picker
        title="T"
        items={items}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("Simple");
  });

  it("shows the title", () => {
    render(
      <Picker
        title="Pick a provider"
        items={[{ id: "x", label: "X" }]}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Pick a provider")).toBeTruthy();
  });

  it("displays navigation help text", () => {
    const items = [{ id: "a", label: "A" }];
    const { container } = render(
      <Picker
        title="T"
        items={items}
        onSelect={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("navigate");
    expect(container.textContent).toContain("esc");
  });
});
