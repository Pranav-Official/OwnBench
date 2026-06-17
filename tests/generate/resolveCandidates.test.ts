import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveCandidates } from "../../src/generate/resolveCandidates.js";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-resolve-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("resolveCandidates", () => {
  it("verifies functions exist via AST and resolves testFile via convention", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(
      join(tmpDir, "src", "utils.ts"),
      [
        "export function format(input: string): string {",
        "  return input.trim();",
        "}",
        "",
        "export function parse(raw: string) {",
        "  return JSON.parse(raw);",
        "}",
      ].join("\n"),
    );
    writeFileSync(
      join(tmpDir, "src", "utils.test.ts"),
      "test('format', () => {});",
    );

    const llmOutput = [
      { file: "src/utils.ts", name: "format", testFile: "src/utils.test.ts" },
      { file: "src/utils.ts", name: "parse", testFile: "src/utils.test.ts" },
    ];

    const result = resolveCandidates(tmpDir, llmOutput);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      file: "src/utils.ts",
      name: "format",
      testFile: "src/utils.test.ts",
    });
    expect(result[1]).toEqual({
      file: "src/utils.ts",
      name: "parse",
      testFile: "src/utils.test.ts",
    });
  });

  it("returns null testFile when no test file exists", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(
      join(tmpDir, "src", "no-test.ts"),
      "export function compute() { return 42; }",
    );

    const llmOutput = [{ file: "src/no-test.ts", name: "compute", testFile: "" }];
    const result = resolveCandidates(tmpDir, llmOutput);

    expect(result).toHaveLength(1);
    expect(result[0].testFile).toBe("");
  });

  it("skips functions that cannot be found in the source file", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(
      join(tmpDir, "src", "a.ts"),
      "export function real() {}",
    );

    const llmOutput = [
      { file: "src/a.ts", name: "nonexistent", testFile: "" },
      { file: "src/a.ts", name: "real", testFile: "" },
    ];
    const result = resolveCandidates(tmpDir, llmOutput);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("real");
  });

  it("handles class methods", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(
      join(tmpDir, "src", "service.ts"),
      [
        "class Service {",
        "  execute(input: string) {",
        "    return input;",
        "  }",
        "}",
      ].join("\n"),
    );

    const llmOutput = [{ file: "src/service.ts", name: "execute", testFile: "" }];
    const result = resolveCandidates(tmpDir, llmOutput);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("execute");
  });

  it("handles arrow functions", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(
      join(tmpDir, "src", "fns.ts"),
      'const add = (a: number, b: number) => a + b;',
    );

    const llmOutput = [{ file: "src/fns.ts", name: "add", testFile: "" }];
    const result = resolveCandidates(tmpDir, llmOutput);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("add");
  });

  it("handles function expressions", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(
      join(tmpDir, "src", "fns.ts"),
      'const multiply = function(a: number, b: number) { return a * b; };',
    );

    const llmOutput = [{ file: "src/fns.ts", name: "multiply", testFile: "" }];
    const result = resolveCandidates(tmpDir, llmOutput);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("multiply");
  });

  it("skips entries with missing source files", () => {
    const llmOutput = [{ file: "src/missing.ts", name: "foo", testFile: "" }];
    const result = resolveCandidates(tmpDir, llmOutput);

    expect(result).toHaveLength(0);
  });

  it("resolves functions across multiple files", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "a.ts"), "export function alpha() {}");
    writeFileSync(join(tmpDir, "src", "b.ts"), "export function beta() {}");

    const llmOutput = [
      { file: "src/a.ts", name: "alpha", testFile: "" },
      { file: "src/b.ts", name: "beta", testFile: "" },
    ];
    const result = resolveCandidates(tmpDir, llmOutput);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("alpha");
    expect(result[1].name).toBe("beta");
  });

  it("uses co-located test file when tests/ mirror does not exist", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "foo.ts"), "export function foo() {}");
    writeFileSync(join(tmpDir, "src", "foo.test.ts"), "test('foo', () => {});");

    const llmOutput = [{ file: "src/foo.ts", name: "foo", testFile: "src/foo.test.ts" }];
    const result = resolveCandidates(tmpDir, llmOutput);

    expect(result).toHaveLength(1);
    expect(result[0].testFile).toBe("src/foo.test.ts");
  });
});
