import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

interface StepState {
  status: "completed";
  completedAt: string;
}

export interface EvalCheckpointState {
  steps: Record<string, StepState>;
}

function evalCheckpointPath(projectDir: string): string {
  return join(projectDir, ".ownbench", "eval_checkpoint.json");
}

export function readEvalCheckpoint(projectDir: string): EvalCheckpointState {
  const path = evalCheckpointPath(projectDir);
  if (!existsSync(path)) return { steps: {} };
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    return { steps: parsed.steps || {} };
  } catch {
    return { steps: {} };
  }
}

export function writeEvalCheckpoint(
  projectDir: string,
  step: string,
  status: "completed",
): void {
  const path = evalCheckpointPath(projectDir);
  mkdirSync(dirname(path), { recursive: true });
  const state = readEvalCheckpoint(projectDir);
  state.steps[step] = { status, completedAt: new Date().toISOString() };
  writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
}

export function clearEvalCheckpoints(projectDir: string): void {
  const path = evalCheckpointPath(projectDir);
  if (existsSync(path)) {
    writeFileSync(path, JSON.stringify({ steps: {} }, null, 2), "utf-8");
  }
}

export function isEvalCheckpointComplete(
  projectDir: string,
  step: string,
  validator?: () => boolean,
): boolean {
  const state = readEvalCheckpoint(projectDir);
  if (!state.steps[step]) return false;
  if (validator && !validator()) return false;
  return true;
}
