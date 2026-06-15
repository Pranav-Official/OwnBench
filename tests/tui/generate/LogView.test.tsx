import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("ink", () => ({
  Box: (props: Record<string, unknown>) =>
    React.createElement("box", props, props.children as React.ReactNode),
  Text: (props: Record<string, unknown>) =>
    React.createElement("text", props, props.children as React.ReactNode),
  useInput: vi.fn(),
  useWindowSize: vi.fn(() => ({ rows: 40, columns: 120 })),
}));

import { render } from "@testing-library/react";
import {
  LogView,
  type LogItem,
  type StreamBlock,
} from "../../../src/tui/generate/LogView.js";

const emptyStream: StreamBlock = { thinking: "", text: "" };

describe("LogView", () => {
  it("renders thought items with emoji", () => {
    const items: LogItem[] = [
      { type: "thought", id: 1, text: "hello world" },
    ];
    const { container } = render(
      <LogView
        items={items}
        stream={emptyStream}
        selectedIndex={0}
        scrollOffset={0}
        expandedBlocks={new Set()}
        height={20}
      />,
    );
    expect(container.textContent).toContain("💭");
    expect(container.textContent).toContain("hello world");
  });

  it("renders collapsed tool block with count", () => {
    const items: LogItem[] = [
      {
        type: "toolBlock",
        id: 1,
        calls: [
          { id: 2, toolName: "read", args: {}, updates: [] },
          { id: 3, toolName: "grep", args: {}, updates: [] },
        ],
      },
    ];
    const { container } = render(
      <LogView
        items={items}
        stream={emptyStream}
        selectedIndex={0}
        scrollOffset={0}
        expandedBlocks={new Set()}
        height={20}
      />,
    );
    expect(container.textContent).toContain("▶");
    expect(container.textContent).toContain("2 tool calls");
  });

  it("renders expanded tool block with tool rows", () => {
    const items: LogItem[] = [
      {
        type: "toolBlock",
        id: 1,
        calls: [
          { id: 2, toolName: "read", args: { filePath: "test.ts" }, result: "ok", isError: false, updates: [] },
        ],
      },
    ];
    const { container } = render(
      <LogView
        items={items}
        stream={emptyStream}
        selectedIndex={0}
        scrollOffset={0}
        expandedBlocks={new Set([0])}
        height={20}
      />,
    );
    expect(container.textContent).toContain("▼");
    expect(container.textContent).toContain("1 tool call");
    expect(container.textContent).toContain("read");
    expect(container.textContent).toContain("ok");
  });

  it("renders stream thinking at bottom", () => {
    const { container } = render(
      <LogView
        items={[]}
        stream={{ thinking: "still thinking...", text: "" }}
        selectedIndex={-1}
        scrollOffset={0}
        expandedBlocks={new Set()}
        height={20}
      />,
    );
    expect(container.textContent).toContain("💭 still thinking...");
  });

  it("renders stream text at bottom", () => {
    const { container } = render(
      <LogView
        items={[]}
        stream={{ thinking: "", text: "output text" }}
        selectedIndex={-1}
        scrollOffset={0}
        expandedBlocks={new Set()}
        height={20}
      />,
    );
    expect(container.textContent).toContain("output text");
  });

  it("only renders window of items based on height", () => {
    const items: LogItem[] = Array.from({ length: 50 }, (_, i) => ({
      type: "thought" as const,
      id: i,
      text: `thought ${i}`,
    }));
    const { container } = render(
      <LogView
        items={items}
        stream={emptyStream}
        selectedIndex={0}
        scrollOffset={30}
        expandedBlocks={new Set()}
        height={5}
      />,
    );
    expect(container.textContent).toContain("thought 30");
    expect(container.textContent).toContain("thought 34");
    expect(container.textContent).not.toContain("thought 0");
    expect(container.textContent).not.toContain("thought 35");
  });
});
