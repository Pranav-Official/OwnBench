import { extractFunctions } from "./extractFunctions.js";

export interface CandidateFunction {
  file: string;
  name: string;
  testFile: string | null;
  functionDescription?: string;
}

export function resolveCandidates(
  projectDir: string,
  llmOutput: { file: string; name: string; testFile: string; functionDescription: string }[],
): CandidateFunction[] {
  const files = [...new Set(llmOutput.map((c) => c.file))];
  const astFunctions = extractFunctions(projectDir, files);

  const astNamesByFile = new Map<string, Set<string>>();
  for (const fn of astFunctions) {
    if (!astNamesByFile.has(fn.file)) astNamesByFile.set(fn.file, new Set());
    astNamesByFile.get(fn.file)!.add(fn.name);
  }

  const result: CandidateFunction[] = [];
  for (const c of llmOutput) {
    const names = astNamesByFile.get(c.file);
    if (!names?.has(c.name)) continue;
    result.push({
      file: c.file,
      name: c.name,
      testFile: c.testFile,
      functionDescription: c.functionDescription,
    });
  }

  return result;
}
