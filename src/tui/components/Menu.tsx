import { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import type {
  Config,
  ConfigField,
  MenuItemData,
  PickerItem,
  FooterAction,
} from "../../lib/types.js";
import { MenuItem } from "./MenuItem.js";
import { Picker } from "./Picker.js";
import { KeyManager } from "./KeyManager.js";
import { useModels } from "../hooks/useProviders.js";

interface MenuProps {
  items: MenuItemData[];
  config: Config;
  onUpdate: (key: ConfigField, value: string) => void;
  onUpdateKey: (providerId: string, key: string) => void;
  providers: PickerItem[];
  footerActions: FooterAction[];
}

type ViewState = "menu" | { type: "picker"; field: ConfigField };

export function Menu({
  items,
  config,
  onUpdate,
  onUpdateKey,
  providers,
  footerActions,
}: MenuProps) {
  const models = useModels(config.llmProvider);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [pickerField, setPickerField] = useState<ConfigField | null>(null);
  const [showKeyManager, setShowKeyManager] = useState(false);

  const totalRows = items.length + footerActions.length;

  const openPicker = useCallback((fieldKey: ConfigField) => {
    setPickerField(fieldKey);
  }, []);

  const closePicker = useCallback(() => {
    setPickerField(null);
  }, []);

  const handlePickerSelect = useCallback(
    (value: string) => {
      if (pickerField) {
        onUpdate(pickerField, value);
      }
      setPickerField(null);
    },
    [pickerField, onUpdate],
  );

  const startEditing = useCallback(
    (index: number) => {
      const key = items[index].key;
      setEditingIndex(index);
      setEditBuffer(config[key]);
    },
    [items, config],
  );

  const stopEditing = useCallback(
    (save: boolean) => {
      if (editingIndex === null) return;
      if (save) {
        const key = items[editingIndex].key;
        onUpdate(key, editBuffer);
      }
      setEditingIndex(null);
      setEditBuffer("");
    },
    [editingIndex, items, onUpdate, editBuffer],
  );

  useInput((input, key) => {
    if (pickerField !== null || showKeyManager) return;

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
      setSelectedIndex((prev) => (prev - 1 + totalRows) % totalRows);
    } else if (key.downArrow || (key.tab && !key.shift)) {
      setSelectedIndex((prev) => (prev + 1) % totalRows);
    } else if (key.return) {
      if (selectedIndex >= items.length) {
        const action =
          footerActions[selectedIndex - items.length];
        if (action.id === "manageKeys") {
          setShowKeyManager(true);
        }
      } else {
        const item = items[selectedIndex];
        if (item.mode === "picker") {
          openPicker(item.key);
        } else {
          startEditing(selectedIndex);
        }
      }
    } else if (key.escape) {
      process.exit(0);
    }
  });

  if (showKeyManager) {
    return (
      <KeyManager
        providers={providers}
        apiKeys={config.apiKeys}
        onUpdateKey={onUpdateKey}
        onBack={() => setShowKeyManager(false)}
      />
    );
  }

  if (pickerField !== null) {
    const pickerTitle =
      items.find((i) => i.key === pickerField)?.label ?? "";
    const isProviderPicker = pickerField === "llmProvider";

    return (
      <Picker
        title={pickerTitle}
        items={isProviderPicker ? providers : models}
        onSelect={handlePickerSelect}
        onCancel={closePicker}
      />
    );
  }

  return (
    <Box flexDirection="column">
      {items.map((item, i) => (
        <MenuItem
          key={item.key}
          label={item.label}
          value={config[item.key]}
          isSelected={i === selectedIndex}
          isEditing={i === editingIndex}
          editBuffer={i === editingIndex ? editBuffer : ""}
          mode={item.mode}
        />
      ))}
      <Box paddingLeft={1}>
        <Text dimColor>
          {"\u2500".repeat(42)}
        </Text>
      </Box>
      {footerActions.map((action, i) => {
        const idx = items.length + i;
        return (
          <Box key={action.id} paddingLeft={1}>
            <Box width={2}>
              <Text>{idx === selectedIndex ? "▶" : " "}</Text>
            </Box>
            <Box width={32}>
              <Text dimColor={idx !== selectedIndex}>
                {action.label}
              </Text>
            </Box>
            <Box>
              <Text dimColor={idx !== selectedIndex}>[...]</Text>
            </Box>
          </Box>
        );
      })}
      <Box marginTop={1} paddingLeft={1}>
        <Text dimColor>
          ↑↓ navigate  ·  enter select/edit  ·  esc quit
        </Text>
      </Box>
    </Box>
  );
}
