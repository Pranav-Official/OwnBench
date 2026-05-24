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
import { Header } from "../../../src/tui/components/Header.js";

describe("Header", () => {
  it("renders the title text", () => {
    const { container } = render(<Header />);
    expect(container.textContent).toContain("OwnBench Configuration");
  });

  it("wraps title in a box", () => {
    const { container } = render(<Header />);
    const box = container.querySelector("box");
    expect(box).toBeTruthy();
  });
});
