import { createBenchSession } from "../../agents/session.js";
import type { WorkflowContext } from "../types.js";
import type { FunctionalFilesJson } from "./generateFunctionalFiles.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface FileCandidate {
  file: string;
  name: string;
  testFile: string | null;
  functionDescription: string;
  lines: number;
  complexityLevel: number;
}

interface SubagentOutput {
  functions: FileCandidate[];
}

export function buildAnalyzeFilePrompt(
  filePath: string,
  fileLines: number,
  fileDescription: string,
  cwd: string,
  index: number,
): string {
  return `You are a code analysis agent. Analyze ONE source file and identify candidate functions.

## File
${filePath} (${fileLines} lines — ${fileDescription})

## Task
1. Read the file at ${filePath}
2. Identify up to 3 functions that meet ALL criteria:
   - Good functional structure: clear input/output, does one thing well, not a trivial wrapper or getter/setter
   - Not trivial: skip functions < 10 lines, simple getters/setters, thin wrappers around a single library call
   - Has a corresponding test file with meaningful tests for the function
3. For each function, find the test file using common patterns:
   - same path with .test/.spec before extension (e.g. src/foo.ts → src/foo.test.ts)
   - __tests__ directory (e.g. src/foo.ts → src/__tests__/foo.ts)
   - tests/ directory (e.g. src/foo.ts → tests/foo.ts)
4. Count each function's lines (from function signature to closing brace)
5. Score complexity 1-5:
   - 1 = trivial (simple arithmetic, simple return)
   - 2 = straightforward (basic control flow, simple conditions)
   - 3 = moderate (multiple conditions, loops, error handling)
   - 4 = complex (nested logic, state management, multiple dependencies)
   - 5 = highly complex (deep nesting, async orchestration, concurrent logic)

## Output
Use the write_ownbench tool to write: metadata/_candidates/${index}.json

Write valid JSON:

{
  "functions": [
    {
      "file": "src/lib/config.ts",
      "name": "readConfig",
      "testFile": "tests/lib/config.test.ts",
      "functionDescription": "Reads and parses a JSON configuration file from the project directory.",
      "lines": 45,
      "complexityLevel": 3
    }
  ]
}

If no functions qualify, write: {"functions": []}

## Rules
- Only write via write_ownbench tool
- Do NOT modify source files — this is read-only analysis
- Do NOT use the write or edit built-in tools — they are disabled
- Be thorough: read the entire file, not just the first few lines
- Include the file path exactly as given to you (${filePath})`;
}

export interface AnalyzeFileResult {
  file: string;
  candidates: FileCandidate[];
}

export async function analyzeFile(
  file: FunctionalFilesJson["files"][number],
  index: number,
  cwd: string,
  onEvent: WorkflowContext["onEvent"],
): Promise<AnalyzeFileResult> {
  const prompt = buildAnalyzeFilePrompt(file.path, file.lines, file.description, cwd, index);

  let sessionResult;
  try {
    sessionResult = await createBenchSession(cwd);
  } catch (err) {
    return {
      file: file.path,
      candidates: [],
    };
  }

  const { session, dispose } = sessionResult;

  try {
    await session.prompt(prompt);

    const outputPath = join(cwd, ".ownbench", "metadata", "_candidates", `${index}.json`);
    if (!existsSync(outputPath)) {
      return {
        file: file.path,
        candidates: [],
      };
    }

    const raw = readFileSync(outputPath, "utf-8");
    const data: SubagentOutput = JSON.parse(raw);

    if (!data || !Array.isArray(data.functions)) {
      return {
        file: file.path,
        candidates: [],
      };
    }

    const validated: FileCandidate[] = data.functions.filter(
      (fn) =>
        fn.file &&
        fn.name &&
        typeof fn.functionDescription === "string" &&
        fn.functionDescription.trim().length > 0 &&
        typeof fn.lines === "number" &&
        typeof fn.complexityLevel === "number",
    );

    return {
      file: file.path,
      candidates: validated,
    };
  } catch {
    return {
      file: file.path,
      candidates: [],
    };
  } finally {
    dispose();
  }
}
