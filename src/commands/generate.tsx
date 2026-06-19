import { Command } from "commander";
import { render } from "ink";
import { WorkflowSelector } from "../tui/generate/WorkflowSelector.js";
import { ensureInit, readConfig } from "../lib/config.js";
import { cwd } from "node:process";

export const generateCmd = new Command("generate")
  .description("Run code analysis and generation workflows")
  .option("--stale", "Regenerate everything from scratch")
  .option("--concurrentAgents <n>", "Number of concurrent subagents for file analysis", "5")
  .action((options) => {
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

    if (!config.apiKeys[config.llmProvider]) {
      console.error(
        "Error: No API key configured for the selected provider.",
      );
      console.error(
        `Run \`ownbench config\` and use "Manage API Keys" to add your ${config.llmProvider} API key.`,
      );
      process.exit(1);
    }

    ensureInit();
    const concurrentAgents = parseInt(options.concurrentAgents, 10) || 5;
    const { waitUntilExit } = render(
      <WorkflowSelector projectDir={cwd()} stale={options.stale} concurrentAgents={concurrentAgents} />,
    );
    waitUntilExit();
  });
