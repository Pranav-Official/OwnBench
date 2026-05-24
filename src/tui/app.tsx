import { Box } from "ink";
import { Header } from "./components/Header.js";
import { Menu } from "./components/Menu.js";
import { useConfig } from "./hooks/useConfig.js";
import { useProviders } from "./hooks/useProviders.js";
import type { MenuItemData, FooterAction } from "../lib/types.js";

const MENU_ITEMS: MenuItemData[] = [
  { label: "Benchmark LLM Provider", key: "llmProvider", mode: "picker" },
  { label: "Primary Benchmark Model", key: "primaryModel", mode: "picker" },
  { label: "Secondary Benchmark Model", key: "secondaryModel", mode: "picker" },
];

const ACTIONS: FooterAction[] = [
  { label: "Manage API Keys", id: "manageKeys" },
];

export function App() {
  const { config, updateField, updateApiKey } = useConfig();
  const providers = useProviders();

  return (
    <Box flexDirection="column" padding={1}>
      <Header />
      <Menu
        items={MENU_ITEMS}
        config={config}
        onUpdate={updateField}
        onUpdateKey={updateApiKey}
        providers={providers}
        footerActions={ACTIONS}
      />
    </Box>
  );
}
