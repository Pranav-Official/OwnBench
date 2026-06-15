import { useState, useCallback, useEffect } from "react";
import { Box, Text, useInput, useWindowSize } from "ink";
import {
  WORKFLOW_OPTIONS,
  runSelectedWorkflows,
} from "../../generate/registry.js";
import type { LogEvent } from "../../generate/types.js";
import { LogView, appendEvent, type LogState } from "./LogView.js";
import { readConfig } from "../../lib/config.js";

interface WorkflowSelectorProps {
  projectDir: string;
  stale?: boolean;
}

type ViewState =
  | { type: "select" }
  | { type: "running"; label: string }
  | { type: "done"; message: string }
  | { type: "error"; message: string };

export function WorkflowSelector({ projectDir, stale }: WorkflowSelectorProps) {
  const [viewState, setViewState] = useState<ViewState>({ type: "select" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [log, setLog] = useState<LogState>({
    items: [],
    stream: { thinking: "", text: "" },
  });
  const [scrollOffset, setScrollOffset] = useState(0);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(
    new Set(),
  );
  const [autoScroll, setAutoScroll] = useState(true);

  const { rows } = useWindowSize();
  const visibleHeight = Math.max(10, rows - 8);

  const handleEvent = useCallback((event: LogEvent) => {
    setLog((prev) => appendEvent(prev, event));
  }, []);

  useEffect(() => {
    if (!autoScroll) return;
    const len = log.items.length;
    setSelectedIndex(len - 1);
    setScrollOffset(Math.max(0, len - visibleHeight));
  }, [log.items.length, autoScroll, visibleHeight]);

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

    setLog({ items: [], stream: { thinking: "", text: "" } });
    setSelectedIndex(0);
    setScrollOffset(0);
    setExpandedBlocks(new Set());
    setAutoScroll(true);
    setViewState({ type: "running", label: "Generating metadata…" });

    try {
      const config = readConfig();
      await runSelectedWorkflows(ids, {
        cwd: projectDir,
        onEvent: handleEvent,
        stale,
        maxRetries: config.maxRetries,
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
    if (viewState.type === "running") {
      if (key.upArrow) {
        setAutoScroll(false);
        setSelectedIndex((prev) => {
          const next = Math.max(0, prev - 1);
          setScrollOffset((so) => Math.min(so, next));
          return next;
        });
      } else if (key.downArrow) {
        setSelectedIndex((prev) => {
          const max = log.items.length - 1;
          const next = Math.min(max, prev + 1);
          if (next >= max) setAutoScroll(true);
          setScrollOffset((so) => Math.max(so, next - visibleHeight + 1));
          return next;
        });
      } else if (key.pageUp) {
        setAutoScroll(false);
        setSelectedIndex((prev) => {
          const next = Math.max(0, prev - visibleHeight + 1);
          setScrollOffset((so) => Math.max(0, so - visibleHeight + 1));
          return next;
        });
      } else if (key.pageDown) {
        setSelectedIndex((prev) => {
          const max = log.items.length - 1;
          const next = Math.min(max, prev + visibleHeight - 1);
          setScrollOffset((so) => Math.min(max - visibleHeight + 1, so + visibleHeight - 1));
          return next;
        });
      } else if (key.home) {
        setAutoScroll(false);
        setSelectedIndex(0);
        setScrollOffset(0);
      } else if (key.end) {
        setAutoScroll(true);
        const max = log.items.length - 1;
        setSelectedIndex(max);
        setScrollOffset(Math.max(0, max - visibleHeight + 1));
      } else if (input === " ") {
        const item = log.items[selectedIndex];
        if (item?.type === "toolBlock") {
          setExpandedBlocks((prev) => {
            const next = new Set(prev);
            if (next.has(selectedIndex)) next.delete(selectedIndex);
            else next.add(selectedIndex);
            return next;
          });
        }
      } else if (key.escape) {
        process.exit(0);
      }
      return;
    }

    if (viewState.type !== "select") return;

    if (key.upArrow) {
      setSelectedIndex(
        (prev) =>
          (prev - 1 + WORKFLOW_OPTIONS.length) % WORKFLOW_OPTIONS.length,
      );
    } else if (key.downArrow || (key.tab && !key.shift)) {
      setSelectedIndex(
        (prev) => (prev + 1) % WORKFLOW_OPTIONS.length,
      );
    } else if (input === " ") {
      const option = WORKFLOW_OPTIONS[selectedIndex];
      if (option && option.status === "active") toggleCheck(option.id);
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
        <LogView
          items={log.items}
          stream={log.stream}
          selectedIndex={selectedIndex}
          scrollOffset={scrollOffset}
          expandedBlocks={expandedBlocks}
          height={visibleHeight}
        />
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

  const activeOptions = WORKFLOW_OPTIONS.filter((o) => o.status === "active");

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
