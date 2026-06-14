import { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import {
  WORKFLOW_OPTIONS,
  runSelectedWorkflows,
} from "../../generate/registry.js";
import type { LogEvent } from "../../generate/types.js";
import { LogView } from "./LogView.js";
import type { StreamBlock } from "./LogView.js";

interface WorkflowSelectorProps {
  projectDir: string;
}

type ViewState =
  | { type: "select" }
  | { type: "running"; label: string }
  | { type: "done"; message: string }
  | { type: "error"; message: string };

export function WorkflowSelector({ projectDir }: WorkflowSelectorProps) {
  const [viewState, setViewState] = useState<ViewState>({ type: "select" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [stream, setStream] = useState<StreamBlock>({
    thinking: "",
    text: "",
  });

  const handleEvent = useCallback((event: LogEvent) => {
    if (event.type === "thinking") {
      setStream((prev) => ({
        thinking: prev.thinking + event.delta,
        text: "",
      }));
    } else if (event.type === "text") {
      setStream((prev) => ({
        thinking: "",
        text: prev.text + event.delta,
      }));
    } else {
      setStream((prev) => {
        if (prev.thinking.length > 0 || prev.text.length > 0) {
          return { thinking: "", text: "" };
        }
        return prev;
      });
      setEvents((prev) => [...prev, event]);
    }
  }, []);

  const toggleCheck = (id: string) => {
    const option = WORKFLOW_OPTIONS.find((o) => o.id === id);
    if (!option || option.status !== "active") return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runSelected = async () => {
    const ids = Array.from(checked);
    if (ids.length === 0) return;

    setEvents([]);
    setStream({ thinking: "", text: "" });
    setViewState({ type: "running", label: "Generating metadata…" });

    try {
      await runSelectedWorkflows(ids, {
        cwd: projectDir,
        onEvent: handleEvent,
      });
    } catch (err) {
      setViewState({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    setViewState({ type: "done", message: "All workflows completed." });
  };

  useInput((input, key) => {
    if (viewState.type !== "select") return;

    if (key.upArrow) {
      setSelectedIndex(
        (prev) =>
          (prev - 1 + WORKFLOW_OPTIONS.length) % WORKFLOW_OPTIONS.length,
      );
    } else if (key.downArrow || (key.tab && !key.shift)) {
      setSelectedIndex((prev) => (prev + 1) % WORKFLOW_OPTIONS.length);
    } else if (input === " ") {
      toggleCheck(WORKFLOW_OPTIONS[selectedIndex].id);
    } else if (key.return) {
      runSelected();
    } else if (key.escape) {
      process.exit(0);
    }
  });

  if (viewState.type === "running") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>ownbench generate</Text>
        <Box marginY={1}>
          <Text>
            Running: <Text color="yellow">{viewState.label}</Text>
          </Text>
        </Box>
        <LogView events={events} stream={stream} />
      </Box>
    );
  }

  if (viewState.type === "done") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>ownbench generate</Text>
        <Box marginY={1}>
          <Text color="green">{viewState.message}</Text>
        </Box>
        <Text>Output written to .ownbench/metadata/</Text>
      </Box>
    );
  }

  if (viewState.type === "error") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>ownbench generate</Text>
        <Box marginY={1}>
          <Text color="red">Error: {viewState.message}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>ownbench generate</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>Select workflows to run:</Text>
      </Box>

      {WORKFLOW_OPTIONS.map((option, i) => {
        const isSelected = i === selectedIndex;
        const isChecked = checked.has(option.id);
        const isDisabled = option.status !== "active";
        const prefix = isSelected ? "▶" : " ";
        const checkbox = isChecked ? "[*]" : "[ ]";

        return (
          <Box key={option.id} flexDirection="column" marginLeft={1}>
            <Box>
              <Box width={2}>
                <Text
                  dimColor={!isSelected || isDisabled}
                  color={isSelected && !isDisabled ? "cyan" : undefined}
                >
                  {prefix}
                </Text>
              </Box>
              <Box width={4}>
                <Text
                  dimColor={isDisabled}
                  color={isChecked ? "green" : undefined}
                >
                  {checkbox}
                </Text>
              </Box>
              <Box marginRight={1}>
                <Text
                  dimColor={isDisabled}
                  bold={!isDisabled}
                  color={isSelected && !isDisabled ? "cyan" : undefined}
                >
                  {option.label}
                </Text>
              </Box>
              {isDisabled && <Text dimColor>(coming soon)</Text>}
            </Box>
            <Box marginLeft={8} marginBottom={0}>
              <Text dimColor>{option.description}</Text>
            </Box>
          </Box>
        );
      })}

      <Box marginTop={1} marginLeft={1}>
        <Text dimColor>
          ↑↓ navigate · space toggle · enter confirm · esc quit
        </Text>
      </Box>
    </Box>
  );
}
