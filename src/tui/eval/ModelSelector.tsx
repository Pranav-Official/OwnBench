import { listProviders, listModels } from "../../lib/providers.js";
import { readConfig } from "../../lib/config.js";
import { FilterablePicker } from "../components/FilterablePicker.js";
import type { PickerItem } from "../../lib/types.js";

interface ModelSelectorProps {
  onSelect: (modelId: string, providerId: string) => void;
}

const NOTE =
  "Configure API keys with `ownbench config` to see models from more providers.";

export function ModelSelector({ onSelect }: ModelSelectorProps) {
  const providers = listProviders();
  const config = readConfig();

  const providersWithKeys = providers.filter(
    (p) => config.apiKeys[p.id] && config.apiKeys[p.id].length > 0,
  );

  const allModels: PickerItem[] = [];
  for (const provider of providersWithKeys) {
    const models = listModels(provider.id);
    for (const model of models) {
      allModels.push({
        id: `${provider.id}/${model.id}`,
        label: model.label,
        detail: provider.label,
      });
    }
  }

  return (
    <FilterablePicker
      title="Select model to evaluate"
      items={allModels}
      note={NOTE}
      onSelect={(id) => {
        const slashIdx = id.indexOf("/");
        const provider = id.substring(0, slashIdx);
        onSelect(id, provider);
      }}
      onCancel={() => process.exit(0)}
    />
  );
}
