import { readFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { WorkflowContext } from "../types.js";
import { runPromptWithRetry } from "./runPromptWithRetry.js";
import { resolveCandidates } from "../resolveCandidates.js";
import type { FunctionalFilesJson } from "./generateFunctionalFiles.js";
import { runFileSubagents } from "./runFileSubagents.js";

const MAX_FUNCTIONS = 100;
const MIN_FUNCTIONS = 80;
const STEP_KEY = "metadata.candidateFunctions";

function validate(ctx: WorkflowContext): string | null {
  const filePath = join(
    ctx.cwd,
    ".ownbench",
    "metadata",
    "candidate_functions.json",
  );
  if (!existsSync(filePath)) {
    return "output file candidate_functions.json was not created";
  }
  try {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    if (!data || !Array.isArray(data.functions)) {
      return "JSON is valid but missing 'functions' array";
    }
    if (data.functions.length === 0) {
      return "JSON is valid but 'functions' array is empty";
    }
    for (const fn of data.functions) {
      if (!fn.functionDescription || typeof fn.functionDescription !== "string" || fn.functionDescription.trim().length === 0) {
        return `Function "${fn.name ?? "unknown"}" is missing a non-empty functionDescription`;
      }
    }
    return null;
  } catch {
    return "output file exists but is not valid JSON";
  }
}

export async function generateCandidateFunctions(
  ctx: WorkflowContext,
): Promise<void> {
  const metadataDir = join(ctx.cwd, ".ownbench", "metadata");
  mkdirSync(metadataDir, { recursive: true });

  const functionalFilesPath = join(metadataDir, "functional_files.json");
  const raw = readFileSync(functionalFilesPath, "utf-8");
  const functionalData: FunctionalFilesJson = JSON.parse(raw);

  if (!functionalData.files || functionalData.files.length === 0) {
    throw new Error("functional_files.json contains no files to analyze.");
  }

  const concurrentAgents = ctx.concurrentAgents ?? 5;
  await runFileSubagents(functionalData.files, ctx.cwd, concurrentAgents, ctx);

  const mainAgentPrompt = `You are OwnBench, a code analysis agent. Subagents have analyzed source files and identified candidate functions.

## Input
Read \`.ownbench/metadata/_all_candidates.json\` which contains candidate functions identified by subagents across the codebase.

## CRITICAL RULE
Do NOT read source files. Do NOT use bash, grep, find, or ls.
Make your selection ENTIRELY from the metadata in the JSON file.
You may use the \`read\` tool ONLY to read \`.ownbench/metadata/_all_candidates.json\`.

## Task
Review all candidates and select the best ${MIN_FUNCTIONS}-${MAX_FUNCTIONS} functions. Prioritize:
1. **complexityLevel** — prefer functions with score 3+ (moderate to highly complex)
2. **lines** — skip functions with fewer than 10 lines
3. **testFile** — must be present (non-null)
4. **Diversity** — maximum 3 functions per file, spread across the codebase
5. **functionDescription** — prioritize functions with clear, meaningful purpose descriptions

Sort by file path, then by function name.

## Output
Use the \`write_ownbench\` tool to write: \`metadata/candidate_functions.json\`

Format:
{
  "functions": [
    {
      "file": "src/lib/config.ts",
      "name": "readConfig",
      "testFile": "tests/lib/config.test.ts",
      "functionDescription": "Reads and parses a JSON configuration file..."
    }
  ]
}

## Rules
- Stop after collecting ${MIN_FUNCTIONS}-${MAX_FUNCTIONS} functions
- Only write via the \`write_ownbench\` tool
- Do NOT use the write or edit built-in tools — they are disabled
- The output directory \`.ownbench/metadata/\` already exists`;

  await runPromptWithRetry(ctx, STEP_KEY, mainAgentPrompt, () => validate(ctx));

  const candidatesPath = join(ctx.cwd, ".ownbench", "metadata", "candidate_functions.json");
  const candidatesRaw = JSON.parse(readFileSync(candidatesPath, "utf-8"));
  const llmOutput: { file: string; name: string; testFile: string; functionDescription: string }[] = candidatesRaw.functions;
  const resolved = resolveCandidates(ctx.cwd, llmOutput);

  const resolvedPath = join(ctx.cwd, ".ownbench", "metadata", "candidate_functions.json");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    resolvedPath,
    JSON.stringify({ functions: resolved }, null, 2),
    "utf-8",
  );

  ctx.onEvent?.({
    type: "info",
    id: 0,
    message: `Resolved ${resolved.length} of ${llmOutput.length} candidate functions (AST + test file lookup)`,
  });

  const candidatesDir = join(ctx.cwd, ".ownbench", "metadata", "_candidates");
  const allCandidatesPath = join(ctx.cwd, ".ownbench", "metadata", "_all_candidates.json");
  if (existsSync(candidatesDir)) {
    rmSync(candidatesDir, { recursive: true, force: true });
  }
  if (existsSync(allCandidatesPath)) {
    rmSync(allCandidatesPath);
  }
}
