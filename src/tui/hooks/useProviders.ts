import { useState, useEffect, useMemo } from "react";
import { listProviders, listModels } from "../../lib/providers.js";
import type { PickerItem } from "../../lib/types.js";

export function useProviders() {
  const [providers, setProviders] = useState<PickerItem[]>([]);

  useEffect(() => {
    setProviders(listProviders());
  }, []);

  return providers;
}

export function useModels(providerId: string) {
  const [models, setModels] = useState<PickerItem[]>([]);

  useEffect(() => {
    if (!providerId) {
      setModels([]);
      return;
    }
    setModels(listModels(providerId));
  }, [providerId]);

  return models;
}
