import { useState, useEffect, useCallback } from "react";
import type { Config, ConfigField } from "../../lib/types.js";
import { readConfig, writeConfig } from "../../lib/config.js";

export function useConfig() {
  const [config, setConfig] = useState<Config>(() => readConfig());

  useEffect(() => {
    writeConfig(config);
  }, [config]);

  const updateField = useCallback(
    (key: ConfigField, value: string) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateApiKey = useCallback(
    (providerId: string, apiKey: string) => {
      setConfig((prev) => ({
        ...prev,
        apiKeys: { ...prev.apiKeys, [providerId]: apiKey },
      }));
    },
    [],
  );

  return { config, updateField, updateApiKey };
}
