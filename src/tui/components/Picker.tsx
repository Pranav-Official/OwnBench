import { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { PickerItem } from "../../lib/types.js";

interface PickerProps {
  title: string;
  items: PickerItem[];
  onSelect: (id: string) => void;
  onCancel: () => void;
}

export function Picker({ title, items, onSelect, onCancel }: PickerProps) {
  const [index, setIndex] = useState(0);

  useInput((_input, key) => {
    if (key.upArrow) {
      setIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (key.downArrow || key.tab) {
      setIndex((prev) => (prev + 1) % items.length);
    } else if (key.return) {
      if (items.length > 0) onSelect(items[index].id);
    } else if (key.escape) {
      onCancel();
    }
  });

  if (items.length === 0) {
    return (
      <Box flexDirection="column" paddingLeft={1}>
        <Text bold>{title}</Text>
        <Box marginTop={1} paddingLeft={1}>
          <Text dimColor>No items available</Text>
        </Box>
        <Box marginTop={1} paddingLeft={1}>
          <Text dimColor>esc to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1} marginBottom={1}>
        <Text bold>{title}</Text>
      </Box>
      {items.map((item, i) => (
        <Box key={item.id} paddingLeft={1}>
          <Box width={2}>
            <Text>{i === index ? "▶" : " "}</Text>
          </Box>
          <Box width={28}>
            <Text dimColor={i !== index}>{item.label}</Text>
          </Box>
          {item.detail ? (
            <Text dimColor>  {item.detail}</Text>
          ) : null}
        </Box>
      ))}
      <Box marginTop={1} paddingLeft={1}>
        <Text dimColor>
          ↑↓ navigate  ·  enter select  ·  esc back
        </Text>
      </Box>
    </Box>
  );
}
