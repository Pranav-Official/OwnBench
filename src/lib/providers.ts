import {
  getProviders,
  getModels,
  getModel,
} from "@earendil-works/pi-ai";
import type { PickerItem } from "./types.js";

export interface ModelInfo {
  id: string;
  name: string;
  detail: string;
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  vertex: "Google Vertex AI",
  mistral: "Mistral",
  groq: "Groq",
  cerebras: "Cerebras",
  xai: "xAI",
  openrouter: "OpenRouter",
  vercel: "Vercel AI Gateway",
  minimax: "MiniMax",
  together: "Together AI",
  fireworks: "Fireworks",
  kimi: "Kimi (Moonshot)",
  deepseek: "DeepSeek",
  copilot: "GitHub Copilot",
  bedrock: "Amazon Bedrock",
  "cloudflare-ai-gateway": "Cloudflare AI Gateway",
  "cloudflare-workers-ai": "Cloudflare Workers AI",
  "azure-openai-responses": "Azure OpenAI",
  "opencode-zen": "OpenCode Zen",
  "opencode-go": "OpenCode Go",
  "openai-codex": "OpenAI Codex",
  "github-copilot": "GitHub Copilot",
};

function providerLabel(id: string): string {
  if (PROVIDER_DISPLAY_NAMES[id]) return PROVIDER_DISPLAY_NAMES[id];
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function listProviders(): PickerItem[] {
  try {
    return getProviders().map((id) => ({ id, label: providerLabel(id) }));
  } catch {
    return [];
  }
}

export function listModels(providerId: string): PickerItem[] {
  try {
    const models = getModels(providerId as any);

    return models.map((m) => {
      const parts: string[] = [];
      parts.push(`${m.contextWindow.toLocaleString()} ctx`);
      if (m.input.includes("image")) parts.push("vision");
      if (m.reasoning) parts.push("reasoning");

      return {
        id: m.id,
        label: m.name,
        detail: parts.join(", "),
      };
    });
  } catch {
    return [];
  }
}

export function resolveModel(providerId: string, modelId: string) {
  return getModel(providerId as any, modelId);
}
