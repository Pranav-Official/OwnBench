import { Box, Text } from "ink";

interface MenuItemProps {
  label: string;
  value: string;
  isSelected: boolean;
  isEditing: boolean;
  editBuffer: string;
  mode: "text" | "picker";
}

export function MenuItem({
  label,
  value,
  isSelected,
  isEditing,
  editBuffer,
  mode,
}: MenuItemProps) {
  const displayValue = isEditing ? editBuffer : value || "\u001b[2m<unset>\u001b[0m";
  const pickerHint = mode === "picker" ? "  [...]" : "";

  return (
    <Box paddingLeft={1}>
      <Box width={2}>
        <Text>{isSelected ? "▶" : " "}</Text>
      </Box>
      <Box width={32}>
        <Text dimColor={!isSelected && !isEditing}>{label}</Text>
      </Box>
      <Box>
        {isEditing ? (
          <Text>
            {"\u001b[7m "}
            {displayValue || " "}
            {"\u001b[0m"}
          </Text>
        ) : (
          <Text dimColor={!isSelected}>
            {displayValue}
            {pickerHint && !value ? (
              <Text dimColor>{pickerHint}</Text>
            ) : null}
          </Text>
        )}
      </Box>
    </Box>
  );
}
