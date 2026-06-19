import { useState, useEffect } from "react";
import { Box, Text, useInput, useWindowSize } from "ink";
import { useSpinner } from "../hooks/useSpinner.js";

export type FileStatus =
  | { state: "pending" }
  | { state: "analyzing" }
  | { state: "done"; candidateCount: number }
  | { state: "skipped"; reason: string };

interface FileAnalysisProgressProps {
  files: { path: string }[];
  statuses: FileStatus[];
  doneCount: number;
  activeCount: number;
}

export function FileAnalysisProgress({
  files,
  statuses,
  doneCount,
  activeCount,
}: FileAnalysisProgressProps) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);

  const { rows } = useWindowSize();
  const height = Math.max(10, rows - 10);

  const headerSpinner = useSpinner(activeCount > 0);
  const listSpinner = useSpinner(activeCount > 0);
  const total = files.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const barWidth = 20;
  const filled = Math.round((pct / 100) * barWidth);
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(barWidth - filled);

  useEffect(() => {
    if (!autoScroll) return;
    const firstAnalyzing = statuses.findIndex((s) => s.state === "analyzing");
    if (firstAnalyzing >= 0) {
      const target = Math.max(0, firstAnalyzing);
      setScrollOffset((prev) => {
        if (target < prev || target >= prev + height) return target;
        return prev;
      });
    }
  }, [statuses, autoScroll, height]);

  useInput((_input, key) => {
    if (key.upArrow) {
      setAutoScroll(false);
      setScrollOffset((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setAutoScroll(false);
      setScrollOffset((prev) =>
        Math.min(total - height, prev + 1),
      );
    } else if (key.pageUp) {
      setAutoScroll(false);
      setScrollOffset((prev) => Math.max(0, prev - height + 1));
    } else if (key.pageDown) {
      setAutoScroll(false);
      setScrollOffset((prev) => Math.min(total - height, prev + height - 1));
    } else if (key.home) {
      setAutoScroll(false);
      setScrollOffset(0);
    } else if (key.end) {
      setAutoScroll(true);
      setScrollOffset(Math.max(0, total - height));
    }
  });

  const visible = files.slice(scrollOffset, scrollOffset + height);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text>
          {activeCount > 0 ? (
            <Text color="cyan">{headerSpinner} </Text>
          ) : (
            <Text color="green">{"\u2713"} </Text>
          )}
          <Text bold>Analyzing files... </Text>
          <Text>
            ({doneCount}/{total}
            {activeCount > 0 ? `, ${activeCount} active` : ""})
          </Text>
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text>
          <Text color="cyan">{bar}</Text>
          <Text dimColor> {pct}%</Text>
        </Text>
      </Box>
      <Box flexDirection="column">
        {visible.map((file, i) => {
          const globalIndex = scrollOffset + i;
          const status = statuses[globalIndex];
          const pathDisplay =
            file.path.length > 50
              ? "..." + file.path.slice(file.path.length - 47)
              : file.path;

          let icon: string;
          let iconColor: string;
          let statusText: string;
          let textColor: string | undefined;

          if (!status || status.state === "pending") {
            icon = "\u23F3";
            iconColor = "gray";
            statusText = "pending";
            textColor = "gray";
          } else if (status.state === "analyzing") {
            icon = listSpinner;
            iconColor = "cyan";
            statusText = "analyzing...";
            textColor = undefined;
          } else if (status.state === "done") {
            icon = "\u2713";
            iconColor = "green";
            statusText =
              status.candidateCount === 1
                ? "1 candidate"
                : `${status.candidateCount} candidates`;
            textColor = undefined;
          } else {
            icon = "\u2717";
            iconColor = "yellow";
            statusText = status.reason || "skipped";
            textColor = "gray";
          }

          return (
            <Box key={globalIndex} flexDirection="row">
              <Box width={2}>
                <Text color={iconColor}>{icon} </Text>
              </Box>
              <Box width={52}>
                <Text dimColor={status?.state === "pending"}>{pathDisplay}</Text>
              </Box>
              <Text dimColor={textColor === "gray"} color={textColor}>
                {statusText}
              </Text>
            </Box>
          );
        })}
      </Box>
      {total > height && (
        <Box marginTop={1}>
          <Text dimColor>
            {scrollOffset > 0
              ? `\u25B2 ${scrollOffset} files above`
              : ""}
            {scrollOffset + height < total
              ? ` \u25BC ${total - scrollOffset - height} files below`
              : ""}
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor>
          {"\u2191\u2193"} scroll · esc quit
        </Text>
      </Box>
    </Box>
  );
}
