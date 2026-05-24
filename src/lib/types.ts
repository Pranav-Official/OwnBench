export interface Config {
  llmProvider: string;
  primaryModel: string;
  secondaryModel: string;
  apiKeys: Record<string, string>;
}

export const DEFAULT_CONFIG: Config = {
  llmProvider: "",
  primaryModel: "",
  secondaryModel: "",
  apiKeys: {},
};

export type MenuItemMode = "text" | "picker";

export type ConfigField = Exclude<keyof Config, "apiKeys">;

export interface MenuItemData {
  label: string;
  key: ConfigField;
  mode: MenuItemMode;
}

export interface PickerItem {
  id: string;
  label: string;
  detail?: string;
}

export interface FooterAction {
  label: string;
  id: string;
}
