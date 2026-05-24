import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  mkdtempSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chdir, cwd } from "node:process";

let tmpDir = "";
let originalCwd = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-test-"));
  originalCwd = cwd();
  chdir(tmpDir);
});

afterEach(() => {
  chdir(originalCwd);
  rmSync(tmpDir, { recursive: true, force: true });
});

import { ensureInit, readConfig, writeConfig } from "../../src/lib/config.js";
import { DEFAULT_CONFIG } from "../../src/lib/types.js";

function ownbenchDir() {
  return join(tmpDir, ".ownbench");
}

function configPath() {
  return join(ownbenchDir(), "config.json");
}

function gitignorePath() {
  return join(tmpDir, ".gitignore");
}

describe("config", () => {
  describe("ensureInit", () => {
    it("creates .ownbench directory", () => {
      ensureInit();
      expect(existsSync(ownbenchDir())).toBe(true);
      expect(existsSync(configPath())).toBe(true);
    });

    it("creates default config when file does not exist", () => {
      ensureInit();
      const raw = readFileSync(configPath(), "utf-8");
      expect(JSON.parse(raw)).toEqual(DEFAULT_CONFIG);
    });

    it("does not overwrite an existing config file", () => {
      mkdirSync(ownbenchDir(), { recursive: true });
      const custom = { ...DEFAULT_CONFIG, llmProvider: "openai" };
      writeFileSync(configPath(), JSON.stringify(custom), "utf-8");
      ensureInit();
      const raw = readFileSync(configPath(), "utf-8");
      expect(JSON.parse(raw)).toEqual(custom);
    });

    it("appends .ownbench/ to .gitignore when not present", () => {
      writeFileSync(gitignorePath(), "node_modules/\n", "utf-8");
      ensureInit();
      const content = readFileSync(gitignorePath(), "utf-8");
      expect(content).toContain(".ownbench/");
    });

    it("does not duplicate .ownbench/ entry in .gitignore", () => {
      writeFileSync(
        gitignorePath(),
        "node_modules/\n.ownbench/\n",
        "utf-8",
      );
      ensureInit();
      const content = readFileSync(gitignorePath(), "utf-8");
      const matches = content.match(/\.ownbench\//g);
      expect(matches?.length).toBe(1);
    });

    it("handles .gitignore missing trailing newline", () => {
      writeFileSync(gitignorePath(), "node_modules/", "utf-8");
      ensureInit();
      const content = readFileSync(gitignorePath(), "utf-8");
      expect(content).toContain(".ownbench/");
    });

    it("skips gitignore update when .gitignore does not exist", () => {
      ensureInit();
      expect(existsSync(gitignorePath())).toBe(false);
    });
  });

  describe("readConfig", () => {
    it("returns default config when file does not exist", () => {
      expect(readConfig()).toEqual(DEFAULT_CONFIG);
    });

    it("reads and merges partial config with defaults", () => {
      mkdirSync(ownbenchDir(), { recursive: true });
      writeFileSync(
        configPath(),
        JSON.stringify({ llmProvider: "openai" }),
        "utf-8",
      );
      expect(readConfig()).toEqual({
        ...DEFAULT_CONFIG,
        llmProvider: "openai",
      });
    });

    it("returns default config on corrupt JSON", () => {
      mkdirSync(ownbenchDir(), { recursive: true });
      writeFileSync(configPath(), "{ bad json", "utf-8");
      expect(readConfig()).toEqual(DEFAULT_CONFIG);
    });

    it("reads full config with api keys", () => {
      const full = {
        llmProvider: "anthropic",
        primaryModel: "claude-sonnet",
        secondaryModel: "claude-haiku",
        apiKeys: { anthropic: "sk-key" },
      };
      mkdirSync(ownbenchDir(), { recursive: true });
      writeFileSync(configPath(), JSON.stringify(full), "utf-8");
      expect(readConfig()).toEqual({ ...DEFAULT_CONFIG, ...full });
    });
  });

  describe("writeConfig", () => {
    it("writes config JSON to file", () => {
      const cfg = { ...DEFAULT_CONFIG, llmProvider: "anthropic" };
      writeConfig(cfg);
      const raw = readFileSync(configPath(), "utf-8");
      expect(JSON.parse(raw)).toEqual(cfg);
    });

    it("creates parent directory automatically", () => {
      writeConfig(DEFAULT_CONFIG);
      expect(existsSync(configPath())).toBe(true);
    });

    it("overwrites existing config", () => {
      mkdirSync(ownbenchDir(), { recursive: true });
      writeFileSync(
        configPath(),
        JSON.stringify({ llmProvider: "openai" }),
        "utf-8",
      );
      const newCfg = { ...DEFAULT_CONFIG, llmProvider: "anthropic" };
      writeConfig(newCfg);
      const raw = readFileSync(configPath(), "utf-8");
      expect(JSON.parse(raw)).toEqual(newCfg);
    });
  });
});
