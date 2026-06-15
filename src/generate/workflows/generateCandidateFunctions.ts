import { runPromptWithRetry } from "./runPromptWithRetry.js";
import type { WorkflowContext } from "../types.js";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const MAX_FUNCTIONS = 100;
const MIN_FUNCTIONS = 80;
const MAX_PER_FILE = 3;

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

  const prompt = `You are OwnBench, a code analysis agent. Your task is to identify candidate functions from the project at ${ctx.cwd}.

## Input
Read the file \`.ownbench/metadata/functional_files.json\` which contains a JSON array of source files:
\`\`\`json
{ "files": [{ "path": "src/foo.ts", "lines": 123, "description": "..." }, ...] }
\`\`\`

## Task
For each file in the list, read it and identify up to ${MAX_PER_FILE} functions that meet ALL of these criteria:
1. **Good functional structure**: Clear input/output, does one thing well, not a trivial wrapper or getter/setter
2. **Low global-scope dependency**: Doesn't rely heavily on module-level mutable state or external globals
3. **Well covered by unit tests**: Find the corresponding test file and verify it has meaningful tests for the function
IGNORE funtions that are
- very small (e.g. < 10 lines)
- simple getters/setters or trivial wrappers around a single library call
- data transformation pipelines that are just chaining calls without much logic
- simple conversion functions (e.g. formatting, parsing) unless they have complex logic or are well-tested

## How to find test files
For a source file like \`src/lib/config.ts\`, check for:
- \`src/lib/config.test.ts\`
- \`tests/lib/config.test.ts\`
- \`__tests__/lib/config.test.ts\`
- \`src/lib/__tests__/config.test.ts\`

## Rules
- Stop after collecting at least ${MIN_FUNCTIONS} and up to ${MAX_FUNCTIONS} functions total across all files
- Pick 0 functions from a file if none qualify — never force selections
- Include functions that are \`export\`ed, \`const\` arrow functions, class methods, or standalone function declarations
- For each function, record the exact start and end line numbers from the source file

## Output location
Use the \`write_ownbench\` tool to write the file to: \`metadata/candidate_functions.json\`

## Output format (JSON)
\`\`\`json
{
  "functions": [
    { "file": "src/lib/config.ts", "name": "readConfig", "startLine": 44, "endLine": 53, "testFile": "tests/lib/config.test.ts" },
    { "file": "src/lib/config.ts", "name": "writeConfig", "startLine": 55, "endLine": 59, "testFile": "tests/lib/config.test.ts" }
  ]
}
\`\`\`

- "file": path relative to project root (${ctx.cwd}), forward slashes
- "name": exact function/method/variable name as it appears in source
- "startLine" / "endLine": integer line numbers (1-indexed, inclusive)
- "testFile": path to the test file, or null if no test file found
- Sort by file path, then by startLine ascending

## Important rules
- Do NOT edit or modify any source files. This is a read-only analysis.
- Only write output via the \`write_ownbench\` tool — never use \`write\` or \`edit\` on project files.
- You do NOT have access to the \`write\` or \`edit\` built-in tools — they are disabled. Use \`write_ownbench\` instead.
- Be thorough: process ALL files in the functional_files.json list.
- The output directory \`.ownbench/metadata/\` already exists.`;

  await runPromptWithRetry(ctx, STEP_KEY, prompt, () => validate(ctx));
}
