import { Command } from "commander";
import { render } from "ink";
import { WorkflowSelector } from "../tui/generate/WorkflowSelector.js";
import { ensureInit, readConfig } from "../lib/config.js";
import { cwd } from "node:process";

export const generateCmd = new Command("generate")
  .description("Run code analysis and generation workflows")
  .action(() => {
    const config = readConfig();
    if (!config.llmProvider || !config.primaryModel) {
      console.error(
        "Error: No LLM provider or model configured.",
      );
      console.error(
        "Run `ownbench config` first to select a provider and model.",
      );
      process.exit(1);
    }

    let hasKey = false;
    for (const [provider, key] of Object.entries(config.apiKeys)) {
      if (key) {
        hasKey = true;
        break;
      }
    }
    if (!hasKey) {
      console.error(
        "Error: No API key configured for the selected provider.",
      );
      console.error(
        `Run \`ownbench config\` and use "Manage API Keys" to add your ${config.llmProvider} API key.`,
      );
      process.exit(1);
    }

    ensureInit();
    const { waitUntilExit } = render(
      <WorkflowSelector projectDir={cwd()} />,
    );
    waitUntilExit();
  });
