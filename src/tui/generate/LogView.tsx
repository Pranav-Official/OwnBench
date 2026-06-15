import { Box, Text } from "ink";
import type { LogEvent } from "../../generate/types.js";

const MAX_VISIBLE_EXPANDED_ROWS = 10;

export type ToolCall = {
  id: number;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  isError?: boolean;
  updates: unknown[];
};

export type LogItem =
  | { type: "thought"; id: number; text: string }
  | { type: "text"; id: number; text: string }
  | { type: "toolBlock"; id: number; calls: ToolCall[] }
  | { type: "info"; id: number; message: string };

export interface StreamBlock {
  thinking: string;
  text: string;
}

export interface LogState {
  items: LogItem[];
  stream: StreamBlock;
}

export function appendEvent(state: LogState, event: LogEvent): LogState {
  const { items, stream } = state;

  if (event.type === "thinking") {
    const flushed = stream.text
      ? [...items, { type: "text" as const, id: event.id, text: stream.text }]
      : items;
    return {
      items: flushed,
      stream: { thinking: stream.thinking + event.delta, text: "" },
    };
  }

  if (event.type === "text") {
    const flushed = stream.thinking
      ? [...items, { type: "thought" as const, id: event.id, text: stream.thinking }]
      : items;
    return {
      items: flushed,
      stream: { thinking: "", text: stream.text + event.delta },
    };
  }

  let flushedItems = items;
  if (stream.thinking || stream.text) {
    const item: LogItem = stream.thinking
      ? { type: "thought", id: event.id, text: stream.thinking }
      : { type: "text", id: event.id, text: stream.text };
    flushedItems = [...items, item];
  }

  if (event.type === "info") {
    return {
      items: [
        ...flushedItems,
        { type: "info", id: event.id, message: event.message },
      ],
      stream: { thinking: "", text: "" },
    };
  }

  if (event.type === "tool_start") {
    const last = flushedItems[flushedItems.length - 1];
    const call: ToolCall = {
      id: event.id,
      toolName: event.toolName,
      args: event.args,
      updates: [],
    };
    if (last?.type === "toolBlock") {
      const next = [...flushedItems];
      next[next.length - 1] = { ...last, calls: [...last.calls, call] };
      return { items: next, stream: { thinking: "", text: "" } };
    }
    return {
      items: [
        ...flushedItems,
        { type: "toolBlock", id: event.id, calls: [call] },
      ],
      stream: { thinking: "", text: "" },
    };
  }

  if (event.type === "tool_update") {
    const last = flushedItems[flushedItems.length - 1];
    if (last?.type === "toolBlock") {
      const calls = [...last.calls];
      const lastCall = { ...calls[calls.length - 1] };
      lastCall.updates = [...lastCall.updates, event.partialResult];
      calls[calls.length - 1] = lastCall;
      const next = [...flushedItems];
      next[next.length - 1] = { ...last, calls };
      return { items: next, stream: { thinking: "", text: "" } };
    }
    return state;
  }

  if (event.type === "tool_end") {
    const last = flushedItems[flushedItems.length - 1];
    if (last?.type === "toolBlock") {
      const calls = [...last.calls];
      calls[calls.length - 1] = {
        ...calls[calls.length - 1],
        result: event.result,
        isError: event.isError,
      };
      const next = [...flushedItems];
      next[next.length - 1] = { ...last, calls };
      return { items: next, stream: { thinking: "", text: "" } };
    }
    return state;
  }

  return state;
}

function formatArgs(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "bash":
      return typeof args.command === "string"
        ? args.command
        : JSON.stringify(args);
    case "read":
      return typeof args.filePath === "string"
        ? args.filePath
        : JSON.stringify(args);
    case "grep":
      return typeof args.pattern === "string"
        ? args.pattern
        : JSON.stringify(args);
    case "find":
      return typeof args.pattern === "string"
        ? args.pattern
        : JSON.stringify(args);
    case "ls":
      return typeof args.path === "string" ? args.path : "";
    case "write_ownbench":
      return typeof args.relativePath === "string" ? args.relativePath : "";
    default:
      return JSON.stringify(args);
  }
}

function formatResult(result: unknown): string {
  if (typeof result === "string") {
    return result.slice(0, 80);
  }
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    if ("stdout" in r && typeof r.stdout === "string") {
      const lines = r.stdout.split("\n").length - 1;
      return `${lines} lines`;
    }
    if ("matches" in r && Array.isArray(r.matches)) {
      return `${r.matches.length} matches`;
    }
    if ("files" in r && Array.isArray(r.files)) {
      return `${r.files.length} files`;
    }
    if ("entries" in r && Array.isArray(r.entries)) {
      return `${r.entries.length} entries`;
    }
    return JSON.stringify(r).slice(0, 80);
  }
  return String(result).slice(0, 80);
}

interface LogViewProps {
  items: LogItem[];
  stream: StreamBlock;
  selectedIndex: number;
  scrollOffset: number;
  expandedBlocks: Set<number>;
  height: number;
  onToggleExpand?: (index: number) => void;
}

function ThoughtRow({ item }: { item: LogItem & { type: "thought" } }) {
  const text =
    item.text.length > 120 ? item.text.slice(0, 117) + "..." : item.text;
  return (
    <Box flexDirection="row">
      <Text dimColor>{"  "}💭 {text}</Text>
    </Box>
  );
}

function TextRow({ item }: { item: LogItem & { type: "text" } }) {
  const text =
    item.text.length > 120 ? item.text.slice(0, 117) + "..." : item.text;
  return (
    <Box flexDirection="row">
      <Text>{text}</Text>
    </Box>
  );
}

function InfoRow({ item }: { item: LogItem & { type: "info" } }) {
  return (
    <Box flexDirection="row">
      <Text dimColor>{"  "}ℹ {item.message}</Text>
    </Box>
  );
}

function ToolCallRow({ call }: { call: ToolCall }) {
  const argStr = formatArgs(call.toolName, call.args);
  const truncated = argStr.length > 55 ? argStr.slice(0, 52) + "..." : argStr;

  if (call.result === undefined) {
    return (
      <Box flexDirection="row">
        <Text color="cyan">{"    "}🔧</Text>
        <Text bold color="cyan">
          {" "}
          {call.toolName}
        </Text>
        <Text dimColor>
          {" "}
          {truncated}
        </Text>
      </Box>
    );
  }

  const summary = formatResult(call.result);
  const symbol = call.isError ? "✗" : "✓";
  const color = call.isError ? "red" : "green";
  return (
    <Box flexDirection="row">
      <Text color={color}>
        {"    "}
        {symbol}
      </Text>
      <Text dimColor>
        {" "}
        {call.toolName}
      </Text>
      {summary ? (
        <Text dimColor>
          {" — "}
          {summary}
        </Text>
      ) : null}
    </Box>
  );
}

function ToolBlockRow({
  item,
  isExpanded,
  isSelected,
  displayIndex,
}: {
  item: LogItem & { type: "toolBlock" };
  isExpanded: boolean;
  isSelected: boolean;
  displayIndex: number;
}) {
  const n = item.calls.length;
  const indicator = isExpanded ? "▼" : "▶";
  const highlight = isSelected ? { inverse: true as const } : {};
  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color="cyan" {...highlight}>
          {"  "}
          {indicator} [{n} tool {n === 1 ? "call" : "calls"}]
        </Text>
      </Box>
      {isExpanded &&
        item.calls
          .slice(0, MAX_VISIBLE_EXPANDED_ROWS)
          .map((call, i) => <ToolCallRow key={call.id} call={call} />)}
      {isExpanded && item.calls.length > MAX_VISIBLE_EXPANDED_ROWS && (
        <Box flexDirection="row">
          <Text dimColor>
            {"    "}…and {item.calls.length - MAX_VISIBLE_EXPANDED_ROWS} more
          </Text>
        </Box>
      )}
    </Box>
  );
}

export function LogView({
  items,
  stream,
  selectedIndex,
  scrollOffset,
  expandedBlocks,
  height,
}: LogViewProps) {
  const visible = items.slice(scrollOffset, scrollOffset + height);

  return (
    <Box flexDirection="column">
      {visible.map((item, i) => {
        const globalIndex = scrollOffset + i;
        const isSelected = globalIndex === selectedIndex;

        if (item.type === "thought") {
          return (
            <Box key={`item-${globalIndex}`}>
              {isSelected ? (
                <Text inverse>
                  {"  "}💭{" "}
                  {item.text.length > 118
                    ? item.text.slice(0, 115) + "..."
                    : item.text}
                </Text>
              ) : (
                <ThoughtRow item={item} />
              )}
            </Box>
          );
        }

        if (item.type === "text") {
          return (
            <Box key={`item-${globalIndex}`}>
              {isSelected ? (
                <Text inverse>
                  {item.text.length > 120
                    ? item.text.slice(0, 117) + "..."
                    : item.text}
                </Text>
              ) : (
                <TextRow item={item} />
              )}
            </Box>
          );
        }

        if (item.type === "info") {
          return (
            <Box key={`item-${globalIndex}`}>
              {isSelected ? (
                <Text inverse>
                  {"  "}ℹ {item.message}
                </Text>
              ) : (
                <InfoRow item={item} />
              )}
            </Box>
          );
        }

        if (item.type === "toolBlock") {
          return (
            <Box key={`item-${globalIndex}`}>
              <ToolBlockRow
                item={item}
                isExpanded={expandedBlocks.has(globalIndex)}
                isSelected={isSelected}
                displayIndex={globalIndex}
              />
            </Box>
          );
        }

        return null;
      })}

      {stream.thinking.length > 0 && (
        <Box flexDirection="row">
          <Text dimColor>{"  "}💭 {stream.thinking}</Text>
        </Box>
      )}
      {stream.text.length > 0 && (
        <Box flexDirection="row">
          <Text>{stream.text}</Text>
        </Box>
      )}
    </Box>
  );
}
