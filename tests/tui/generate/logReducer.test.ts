import { describe, it, expect } from "vitest";
import {
  appendEvent,
  type LogState,
  type LogItem,
} from "../../../src/tui/generate/LogView.js";
import type { LogEvent } from "../../../src/generate/types.js";

const empty: LogState = { items: [], stream: { thinking: "", text: "" } };

function think(id: number, delta: string): LogEvent {
  return { type: "thinking", id, delta };
}
function text(id: number, delta: string): LogEvent {
  return { type: "text", id, delta };
}
function toolStart(id: number, toolName: string, args: Record<string, unknown> = {}): LogEvent {
  return { type: "tool_start", id, toolName, args };
}
function toolEnd(id: number, toolName: string, result: unknown = "ok"): LogEvent {
  return { type: "tool_end", id, toolName, result, isError: false };
}
function info(id: number, message: string): LogEvent {
  return { type: "info", id, message };
}

describe("appendEvent", () => {
  it("accumulates thinking deltas in stream", () => {
    let state = appendEvent(empty, think(1, "hello "));
    state = appendEvent(state, think(2, "world"));
    expect(state.stream.thinking).toBe("hello world");
    expect(state.items).toHaveLength(0);
  });

  it("accumulates text deltas in stream", () => {
    let state = appendEvent(empty, text(1, "foo "));
    state = appendEvent(state, text(2, "bar"));
    expect(state.stream.text).toBe("foo bar");
    expect(state.items).toHaveLength(0);
  });

  it("flushes text to item when thinking starts", () => {
    let state = appendEvent(empty, text(1, "hello"));
    state = appendEvent(state, think(2, "thinking now"));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].type).toBe("text");
    expect(state.stream.thinking).toBe("thinking now");
  });

  it("flushes thinking to item when text starts", () => {
    let state = appendEvent(empty, think(1, "thinking"));
    state = appendEvent(state, text(2, "new text"));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].type).toBe("thought");
    expect(state.stream.text).toBe("new text");
  });

  it("groups consecutive tool_start into one toolBlock", () => {
    let state = appendEvent(empty, toolStart(1, "read"));
    state = appendEvent(state, toolEnd(2, "read"));
    state = appendEvent(state, toolStart(3, "grep"));
    state = appendEvent(state, toolEnd(4, "grep"));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].type).toBe("toolBlock");
    const block = state.items[0] as LogItem & { type: "toolBlock" };
    expect(block.calls).toHaveLength(2);
    expect(block.calls[0].toolName).toBe("read");
    expect(block.calls[1].toolName).toBe("grep");
  });

  it("creates new toolBlock after thought", () => {
    let state = appendEvent(empty, toolStart(1, "read"));
    state = appendEvent(state, toolEnd(2, "read"));
    state = appendEvent(state, think(3, "thinking"));
    state = appendEvent(state, toolStart(4, "bash"));
    state = appendEvent(state, toolEnd(5, "bash"));
    expect(state.items).toHaveLength(3);
    expect(state.items[0].type).toBe("toolBlock");
    expect(state.items[1].type).toBe("thought");
    expect(state.items[2].type).toBe("toolBlock");
  });

  it("flushes stream on tool_start", () => {
    let state = appendEvent(empty, think(1, "thinking"));
    state = appendEvent(state, toolStart(2, "read"));
    expect(state.items).toHaveLength(2);
    expect(state.items[0].type).toBe("thought");
    expect(state.items[1].type).toBe("toolBlock");
  });

  it("creates info item", () => {
    const state = appendEvent(empty, info(1, "test info"));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].type).toBe("info");
    expect((state.items[0] as any).message).toBe("test info");
  });

  it("sets result on tool_end", () => {
    let state = appendEvent(empty, toolStart(1, "read", { filePath: "test.ts" }));
    state = appendEvent(state, toolEnd(2, "read", "file content"));
    const block = state.items[0] as LogItem & { type: "toolBlock" };
    expect(block.calls[0].result).toBe("file content");
    expect(block.calls[0].isError).toBe(false);
  });
});
