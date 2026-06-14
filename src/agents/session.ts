import {
  createAgentSession,
  SessionManager,
  AuthStorage,
  ModelRegistry,
  SettingsManager,
  defineTool,
} from "@earendil-works/pi-coding-agent";
import { getModel } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { readConfig } from "../lib/config.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const writeOwnbench = defineTool({
  name: "write_ownbench",
  label: "Write to .ownbench",
  description:
    "Write a file inside the .ownbench project metadata directory. The path is resolved relative to <cwd>/.ownbench/. Attempts to write outside .ownbench/ are rejected. Creates parent directories automatically.",
  promptSnippet: "write_ownbench(path, content) — write file to .ownbench/",
  parameters: Type.Object({
    relativePath: Type.String({
      description:
        "Path relative to .ownbench/ directory, e.g. 'metadata/functional_files.md'",
    }),
    content: Type.String({
      description: "File content to write",
    }),
  }),
  execute: async (_toolCallId, params) => {
    const ownbenchDir = join(process.cwd(), ".ownbench");
    const targetPath = resolve(ownbenchDir, params.relativePath);

    const rel = relative(ownbenchDir, targetPath);
    if (rel.startsWith("..")) {
      return {
        continue: false,
        content: [
          {
            type: "text",
            text: `write_ownbench: REJECTED — path "${params.relativePath}" resolves outside .ownbench/ directory`,
          },
        ],
        details: {},
      };
    }

    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, params.content, "utf-8");

    return {
      continue: true,
      content: [
        {
          type: "text",
          text: `Written ${params.content.length} bytes to .ownbench/${params.relativePath}`,
        },
      ],
      details: {},
    };
  },
});

export async function createBenchSession(projectDir: string) {
  const config = readConfig();

  if (!config.llmProvider || !config.primaryModel) {
    throw new Error(
      "No LLM provider or model configured. Run `ownbench config` first.",
    );
  }

  const authStorage = AuthStorage.create();

  for (const [provider, key] of Object.entries(config.apiKeys)) {
    if (key) {
      authStorage.setRuntimeApiKey(provider, key);
    }
  }

  const model = getModel(config.llmProvider as any, config.primaryModel);
  if (!model) {
    throw new Error(
      `Model not found: ${config.llmProvider}/${config.primaryModel}. Run \`ownbench config\` to select a valid model.`,
    );
  }

  const modelRegistry = ModelRegistry.create(authStorage);

  const { session } = await createAgentSession({
    cwd: projectDir,
    model,
    tools: [
      "read",
      "bash",
      "grep",
      "find",
      "ls",
      writeOwnbench.name,
    ],
    customTools: [writeOwnbench],
    sessionManager: SessionManager.inMemory(projectDir),
    authStorage,
    modelRegistry,
    settingsManager: SettingsManager.inMemory(),
  });

  return {
    session,
    dispose: () => {
      try {
        session.dispose();
      } catch {
        // ignore dispose errors
      }
    },
  };
}
