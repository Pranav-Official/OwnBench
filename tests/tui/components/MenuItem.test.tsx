import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("ink", () => ({
  Box: (props: Record<string, unknown>) =>
    React.createElement("box", props, props.children as React.ReactNode),
  Text: (props: Record<string, unknown>) =>
    React.createElement("text", props, props.children as React.ReactNode),
  useInput: vi.fn(),
}));

import { render } from "@testing-library/react";
import { MenuItem } from "../../../src/tui/components/MenuItem.js";

function renderItem(props: Partial<Parameters<typeof MenuItem>[0]> = {}) {
  return render(
    <MenuItem
      label="Test Label"
      value=""
      isSelected={false}
      isEditing={false}
      editBuffer=""
      mode="text"
      {...props}
    />,
  );
}

describe("MenuItem", () => {
  it("shows unset placeholder when value is empty", () => {
    const { container } = renderItem({ value: "" });
    expect(container.textContent).toContain("unset");
  });

  it("shows the configured value", () => {
    const { container } = renderItem({ value: "openai" });
    expect(container.textContent).toContain("openai");
  });

  it("shows arrow pointer when selected", () => {
    const { container } = renderItem({ isSelected: true });
    expect(container.textContent).toContain("\u25b6");
  });

  it("shows picker hint for picker mode when value is empty", () => {
    const { container } = renderItem({ mode: "picker", value: "" });
    expect(container.textContent).toContain("...");
  });

  it("shows edit buffer when editing", () => {
    const { container } = renderItem({
      isEditing: true,
      editBuffer: "newval",
    });
    expect(container.textContent).toContain("newval");
  });

  it("does not show picker hint when value is set", () => {
    const { container } = renderItem({
      mode: "picker",
      value: "selected-value",
    });
    expect(container.textContent).toContain("selected-value");
  });
});
