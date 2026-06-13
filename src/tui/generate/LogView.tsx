import { Box, Text } from "ink";
import type { LogEvent } from "../../generate/types.js";

const MAX_VISIBLE = 20;

export interface StreamBlock {
  thinking: string;
  text: string;
}

interface LogViewProps {
  events: LogEvent[];
  stream: StreamBlock;
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

function LogEntryRow({ event }: { event: LogEvent }) {
  const key = `log-${event.id}`;

  if (event.type === "tool_start") {
    const argStr = formatArgs(event.toolName, event.args);
    const truncated =
      argStr.length > 60 ? argStr.slice(0, 57) + "..." : argStr;
    return (
      <Box key={key} flexDirection="row">
        <Text color="cyan">{"  "}🔧</Text>
        <Text bold color="cyan">
          {" "}
          {event.toolName}
        </Text>
        <Text dimColor>{" "}{truncated}</Text>
      </Box>
    );
  }

  if (event.type === "tool_end") {
    const summary = formatResult(event.result);
    const symbol = event.isError ? "✗" : "✓";
    const color = event.isError ? "red" : "green";
    return (
      <Box key={key} flexDirection="row">
        <Text color={color}>
          {"    "}
          {symbol}
        </Text>
        <Text dimColor>{" "}{event.toolName}</Text>
        {summary ? (
          <Text dimColor>
            {" — "}{summary}
          </Text>
        ) : null}
      </Box>
    );
  }

  if (event.type === "tool_update") {
    const partial = formatResult(event.partialResult);
    return (
      <Box key={key} flexDirection="row">
        <Text dimColor>{"      "}· {partial}</Text>
      </Box>
    );
  }

  if (event.type === "info") {
    return (
      <Box key={key} flexDirection="row">
        <Text dimColor>{"  "}ℹ  {event.message}</Text>
      </Box>
    );
  }

  return null;
}

export function LogView({ events, stream }: LogViewProps) {
  return (
    <Box flexDirection="column">
      {events.length > MAX_VISIBLE && (
        <Box>
          <Text dimColor>
            ...{events.length - MAX_VISIBLE} older entries...
          </Text>
        </Box>
      )}
      {events
        .slice(events.length > MAX_VISIBLE ? -MAX_VISIBLE : 0)
        .map((event) => (
          <LogEntryRow key={event.id} event={event} />
        ))}
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
