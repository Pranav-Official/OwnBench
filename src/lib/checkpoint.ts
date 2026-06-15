import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

interface StepState {
  status: "completed";
  completedAt: string;
}

export interface CheckpointState {
  steps: Record<string, StepState>;
}

function checkpointPath(projectDir: string): string {
  return join(projectDir, ".ownbench", "checkpoint.json");
}

export function readCheckpoint(projectDir: string): CheckpointState {
  const path = checkpointPath(projectDir);
  if (!existsSync(path)) return { steps: {} };
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    return { steps: parsed.steps || {} };
  } catch {
    return { steps: {} };
  }
}

export function writeCheckpoint(
  projectDir: string,
  step: string,
  status: "completed",
): void {
  const path = checkpointPath(projectDir);
  mkdirSync(dirname(path), { recursive: true });
  const state = readCheckpoint(projectDir);
  state.steps[step] = { status, completedAt: new Date().toISOString() };
  writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
}

export function clearCheckpoints(projectDir: string): void {
  const path = checkpointPath(projectDir);
  if (existsSync(path)) {
    writeFileSync(path, JSON.stringify({ steps: {} }, null, 2), "utf-8");
  }
}

export function isCheckpointComplete(
  projectDir: string,
  step: string,
  validator?: () => boolean,
): boolean {
  const state = readCheckpoint(projectDir);
  if (!state.steps[step]) return false;
  if (validator && !validator()) return false;
  return true;
}
