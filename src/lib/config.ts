import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { cwd } from "node:process";
import type { Config } from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";

const CONFIG_FILE = ".ownbench/config.json";
const OWNBENCH_DIR = ".ownbench";
const GITIGNORE_ENTRY = ".ownbench/";

function configPath(): string {
  return join(cwd(), CONFIG_FILE);
}

export function ensureInit(): void {
  const dir = join(cwd(), OWNBENCH_DIR);
  mkdirSync(dir, { recursive: true });

  const config = configPath();
  if (!existsSync(config)) {
    writeFileSync(config, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
  }

  const gitignore = join(cwd(), ".gitignore");
  if (existsSync(gitignore)) {
    const content = readFileSync(gitignore, "utf-8");
    if (!content.split("\n").some((line) => line.trim() === GITIGNORE_ENTRY)) {
      appendFileSync(
        gitignore,
        content.endsWith("\n")
          ? `${GITIGNORE_ENTRY}\n`
          : `\n${GITIGNORE_ENTRY}\n`,
      );
    }
  }
}

export function readConfig(): Config {
  const path = configPath();
  if (!existsSync(path)) return { ...DEFAULT_CONFIG };
  try {
    const raw = readFileSync(path, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config: Config): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2), "utf-8");
}
