import { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import type { PickerItem } from "../../lib/types.js";

interface KeyManagerProps {
  providers: PickerItem[];
  apiKeys: Record<string, string>;
  onUpdateKey: (providerId: string, key: string) => void;
  onBack: () => void;
}

export function KeyManager({
  providers,
  apiKeys,
  onUpdateKey,
  onBack,
}: KeyManagerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState("");

  const startEditing = useCallback((index: number) => {
    setEditingIndex(index);
    setEditBuffer("");
  }, []);

  const stopEditing = useCallback(
    (save: boolean) => {
      if (editingIndex === null) return;
      if (save && editBuffer.length > 0 && editingIndex < providers.length) {
        onUpdateKey(providers[editingIndex].id, editBuffer);
      }
      setEditingIndex(null);
      setEditBuffer("");
    },
    [editingIndex, providers, onUpdateKey, editBuffer],
  );

  useInput((input, key) => {
    if (editingIndex !== null) {
      if (key.return) {
        stopEditing(true);
      } else if (key.escape) {
        stopEditing(false);
      } else if (key.backspace || key.delete) {
        setEditBuffer((prev) => prev.slice(0, -1));
      } else if (input.length > 0 && !key.ctrl && !key.meta) {
        setEditBuffer((prev) => prev + input);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) =>
        (prev - 1 + providers.length) % providers.length,
      );
    } else if (key.downArrow || key.tab) {
      setSelectedIndex((prev) => (prev + 1) % providers.length);
    } else if (key.return) {
      if (providers.length > 0) startEditing(selectedIndex);
    } else if (key.escape) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1} marginBottom={1}>
        <Text bold>Manage API Keys</Text>
      </Box>
      {providers.map((p, i) => {
        const hasKey = apiKeys[p.id] && apiKeys[p.id].length > 0;
        const isSelected = i === selectedIndex;
        const isEditing = i === editingIndex;

        return (
          <Box key={p.id} paddingLeft={1}>
            <Box width={2}>
              <Text>{isSelected ? "▶" : " "}</Text>
            </Box>
            <Box width={28}>
              <Text dimColor={!isSelected && !isEditing}>
                {p.label}
              </Text>
            </Box>
            <Box>
              {isEditing ? (
                <Text>
                  {"\u001b[7m "}
                  {editBuffer || " "}
                  {"\u001b[0m"}
                </Text>
              ) : (
                <Text dimColor={!isSelected}>
                  {hasKey ? "\u001b[2m****\u001b[0m" : "\u001b[2m<no key>\u001b[0m"}
                </Text>
              )}
            </Box>
          </Box>
        );
      })}
      <Box marginTop={1} paddingLeft={1}>
        <Text dimColor>
          {editingIndex !== null
            ? "enter save  ·  esc cancel"
            : "↑↓ navigate  ·  enter set key  ·  esc back"}
        </Text>
      </Box>
    </Box>
  );
}
