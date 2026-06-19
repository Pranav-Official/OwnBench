import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildAnalyzeFilePrompt, analyzeFile } from "../../../src/generate/workflows/analyzeFile.js";

vi.mock("../../../src/agents/session.js", () => ({
  createBenchSession: vi.fn(async (cwd: string) => ({
    session: {
      prompt: vi.fn(async () => {}),
      dispose: vi.fn(),
    },
    dispose: vi.fn(),
  })),
}));

let tmpDir = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-analyze-test-"));
  mkdirSync(join(tmpDir, ".ownbench", "metadata", "_candidates"), {
    recursive: true,
  });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("buildAnalyzeFilePrompt", () => {
  it("contains file path and line count", () => {
    const prompt = buildAnalyzeFilePrompt(
      "src/config.ts",
      120,
      "Configuration module",
      "/project",
      0,
    );
    expect(prompt).toContain("src/config.ts");
    expect(prompt).toContain("120 lines");
    expect(prompt).toContain("Configuration module");
  });

  it("contains the index in the write path", () => {
    const prompt = buildAnalyzeFilePrompt(
      "src/config.ts",
      120,
      "Configuration module",
      "/project",
      42,
    );
    expect(prompt).toContain("metadata/_candidates/42.json");
  });

  it("includes complexity scale description", () => {
    const prompt = buildAnalyzeFilePrompt(
      "src/config.ts",
      120,
      "Configuration module",
      "/project",
      0,
    );
    expect(prompt).toContain("1-5");
    expect(prompt).toContain("trivial");
    expect(prompt).toContain("highly complex");
  });

  it("includes test file patterns", () => {
    const prompt = buildAnalyzeFilePrompt(
      "src/config.ts",
      120,
      "Configuration module",
      "/project",
      0,
    );
    expect(prompt).toContain(".test");
    expect(prompt).toContain(".spec");
    expect(prompt).toContain("__tests__");
    expect(prompt).toContain("tests/");
  });

  it("includes rules about read-only analysis", () => {
    const prompt = buildAnalyzeFilePrompt(
      "src/config.ts",
      120,
      "Configuration module",
      "/project",
      0,
    );
    expect(prompt).toContain("read-only analysis");
    expect(prompt).toContain("Do NOT modify source files");
  });
});

describe("analyzeFile", () => {
  it("returns candidates when output file exists with valid data", async () => {
    const candidatesDir = join(
      tmpDir,
      ".ownbench",
      "metadata",
      "_candidates",
    );
    writeFileSync(
      join(candidatesDir, "0.json"),
      JSON.stringify({
        functions: [
          {
            file: "src/config.ts",
            name: "readConfig",
            testFile: "tests/config.test.ts",
            functionDescription: "Reads config file",
            lines: 30,
            complexityLevel: 2,
          },
        ],
      }),
    );

    const result = await analyzeFile(
      { path: "src/config.ts", lines: 120, description: "Configuration" },
      0,
      tmpDir,
      undefined,
    );

    expect(result.file).toBe("src/config.ts");
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].name).toBe("readConfig");
    expect(result.candidates[0].complexityLevel).toBe(2);
  });

  it("returns empty candidates when output file is missing", async () => {
    const result = await analyzeFile(
      { path: "src/missing.ts", lines: 50, description: "Missing file" },
      99,
      tmpDir,
      undefined,
    );

    expect(result.file).toBe("src/missing.ts");
    expect(result.candidates).toHaveLength(0);
  });

  it("returns empty candidates when output has invalid JSON", async () => {
    const candidatesDir = join(
      tmpDir,
      ".ownbench",
      "metadata",
      "_candidates",
    );
    writeFileSync(join(candidatesDir, "5.json"), "not json");

    const result = await analyzeFile(
      { path: "src/bad.ts", lines: 30, description: "Bad JSON" },
      5,
      tmpDir,
      undefined,
    );

    expect(result.file).toBe("src/bad.ts");
    expect(result.candidates).toHaveLength(0);
  });

  it("filters out candidates missing required fields", async () => {
    const candidatesDir = join(
      tmpDir,
      ".ownbench",
      "metadata",
      "_candidates",
    );
    writeFileSync(
      join(candidatesDir, "1.json"),
      JSON.stringify({
        functions: [
          {
            file: "src/config.ts",
            name: "readConfig",
            testFile: "tests/config.test.ts",
            functionDescription: "Reads config",
            lines: 30,
            complexityLevel: 2,
          },
          {
            file: "src/config.ts",
            name: "noDescription",
            testFile: null,
          },
        ],
      }),
    );

    const result = await analyzeFile(
      { path: "src/config.ts", lines: 120, description: "Config" },
      1,
      tmpDir,
      undefined,
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].name).toBe("readConfig");
  });

  it("handles empty functions array", async () => {
    const candidatesDir = join(
      tmpDir,
      ".ownbench",
      "metadata",
      "_candidates",
    );
    writeFileSync(
      join(candidatesDir, "2.json"),
      JSON.stringify({ functions: [] }),
    );

    const result = await analyzeFile(
      { path: "src/simple.ts", lines: 10, description: "Simple" },
      2,
      tmpDir,
      undefined,
    );

    expect(result.candidates).toHaveLength(0);
  });
});
