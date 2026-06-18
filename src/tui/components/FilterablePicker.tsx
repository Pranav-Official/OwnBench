import { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import type { PickerItem } from "../../lib/types.js";

interface FilterablePickerProps {
  title: string;
  items: PickerItem[];
  note?: string;
  onSelect: (id: string) => void;
  onCancel: () => void;
}

export function FilterablePicker({
  title,
  items,
  note,
  onSelect,
  onCancel,
}: FilterablePickerProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q),
    );
  }, [items, query]);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (key.return) {
      if (filtered.length > 0) onSelect(filtered[selectedIndex].id);
    } else if (key.escape) {
      if (query.length > 0) {
        setQuery("");
        setSelectedIndex(0);
      } else {
        onCancel();
      }
    } else if (key.backspace) {
      setQuery((prev) => prev.slice(0, -1));
      setSelectedIndex(0);
    } else if (input.length > 0 && !key.ctrl && !key.meta) {
      setQuery((prev) => prev + input);
      setSelectedIndex(0);
    }
  });

  return (
    <Box flexDirection="column" paddingLeft={1}>
      <Box marginBottom={1}>
        <Text bold>{title}</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>
          <Text color="cyan">{'>'} </Text>
          <Text>{query}</Text>
          <Text dimColor>{query.length === 0 ? "type to filter..." : ""}</Text>
        </Text>
      </Box>
      <Box flexDirection="column">
        {filtered.length === 0 ? (
          <Box paddingLeft={1}>
            <Text dimColor>No models match your search</Text>
          </Box>
        ) : (
          filtered.map((item, i) => {
            const isSelected = i === selectedIndex;
            const prefix = isSelected ? "▶" : " ";
            return (
              <Box key={item.id} paddingLeft={1}>
                <Box width={2}>
                  <Text color={isSelected ? "cyan" : undefined}>{prefix}</Text>
                </Box>
                <Box width={30}>
                  <Text dimColor={!isSelected}>{item.label}</Text>
                </Box>
                {item.detail ? (
                  <Text dimColor>  {item.detail}</Text>
                ) : null}
              </Box>
            );
          })
        )}
      </Box>
      {note ? (
        <Box marginTop={1} paddingLeft={1}>
          <Text dimColor>{note}</Text>
        </Box>
      ) : null}
      <Box marginTop={1} paddingLeft={1}>
        <Text dimColor>
          ↑↓ navigate · type to filter · enter select · esc back
        </Text>
      </Box>
    </Box>
  );
}
