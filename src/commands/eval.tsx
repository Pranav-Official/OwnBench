import { Command } from "commander";
import { render } from "ink";
import { ModelSelector } from "../tui/eval/ModelSelector.js";
import { EvalWorkflowSelector } from "../tui/eval/EvalWorkflowSelector.js";
import { readConfig, ensureInit } from "../lib/config.js";
import { cwd } from "node:process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const TEST_SUITES_DIR = ".ownbench/unit-test-to-code-tests";

export const evalCmd = new Command("eval")
  .description("Test the models on respective test suite")
  .option("--model <model-id>", "Model to evaluate (e.g. openai/gpt-5.5)")
  .option("--stale", "Regenerate everything from scratch")
  .action((options) => {
    ensureInit();

    if (!existsSync(join(cwd(), TEST_SUITES_DIR))) {
      console.error(
        "Error: No staged test suites found.",
      );
      console.error(
        "Run `ownbench generate` first to stage test suites.",
      );
      process.exit(1);
    }

    if (options.model) {
      const model = options.model;
      const slashIdx = model.indexOf("/");
      if (slashIdx === -1) {
        console.error(
          "Error: --model must be in provider/model format (e.g. openai/gpt-5.5)",
        );
        process.exit(1);
      }

      const provider = model.substring(0, slashIdx);
      const config = readConfig();

      if (!config.apiKeys[provider]) {
        console.error(
          `Error: No API key configured for ${provider}.`,
        );
        console.error(
          "Run `ownbench config` to add your API key.",
        );
        process.exit(1);
      }

      const { waitUntilExit } = render(
        <EvalWorkflowSelector
          projectDir={cwd()}
          model={model}
          provider={provider}
          stale={options.stale}
        />,
      );
      waitUntilExit();
      return;
    }

    const { waitUntilExit } = render(
      <ModelSelector
        onSelect={(modelId, providerId) => {
          const { waitUntilExit: wait2 } = render(
            <EvalWorkflowSelector
              projectDir={cwd()}
              model={modelId}
              provider={providerId}
              stale={options.stale}
            />,
          );
          wait2();
        }}
      />,
    );
    waitUntilExit();
  });
