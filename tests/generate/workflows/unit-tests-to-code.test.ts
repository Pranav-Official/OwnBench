import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runUnitTestsToCode } from "../../../src/generate/workflows/unit-tests-to-code.js";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { LogEvent } from "../../../src/generate/types.js";

let tmpDir = "";
let events: LogEvent[];

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-uttoc-test-"));
  mkdirSync(join(tmpDir, ".ownbench", "metadata"), { recursive: true });
  events = [];
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeCandidateFunctions(functions: unknown[]) {
  writeFileSync(
    join(tmpDir, ".ownbench", "metadata", "candidate_functions.json"),
    JSON.stringify({ functions }),
  );
}

function onEvent(e: LogEvent) {
  events.push(e);
}

describe("runUnitTestsToCode", () => {
  it("stages functions with valid source and test files", async () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(
      join(tmpDir, "src", "utils.ts"),
      "export function format() {}",
    );
    mkdirSync(join(tmpDir, "tests"), { recursive: true });
    writeFileSync(join(tmpDir, "tests", "utils.test.ts"), "test format");

    writeCandidateFunctions([
      {
        file: "src/utils.ts",
        name: "format",
        testFile: "tests/utils.test.ts",
        functionDescription: "Formats a string.",
      },
    ]);

    await runUnitTestsToCode({ cwd: tmpDir, onEvent });

    const folders = readdirSync(
      join(tmpDir, ".ownbench", "unit-test-to-code-tests"),
    );
    expect(folders).toEqual(["format"]);

    const staged = readdirSync(
      join(tmpDir, ".ownbench", "unit-test-to-code-tests", "format"),
    );
    expect(staged).toContain("src_utils.ts");
    expect(staged).toContain("tests_utils.test.ts");
    expect(staged).toContain("format_description.txt");
  });

  it("emits an info event per staged function and a summary", async () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "a.ts"), "export function parse() {}");
    mkdirSync(join(tmpDir, "tests"), { recursive: true });
    writeFileSync(join(tmpDir, "tests", "a.test.ts"), "test parse");

    writeCandidateFunctions([
      {
        file: "src/a.ts",
        name: "parse",
        testFile: "tests/a.test.ts",
      },
    ]);

    await runUnitTestsToCode({ cwd: tmpDir, onEvent });

    expect(events.length).toBe(2);
    expect(events[0]).toEqual({
      type: "info",
      id: 1,
      message: "Staged parse (1/1)",
    });
    expect(events[1]).toEqual({
      type: "info",
      id: 2,
      message: "Staged 1 of 1 candidate functions (0 skipped)",
    });
  });

  it("skips functions with testFile null", async () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "a.ts"), "export function foo() {}");

    writeCandidateFunctions([
      {
        file: "src/a.ts",
        name: "foo",

        testFile: null,
      },
    ]);

    await runUnitTestsToCode({ cwd: tmpDir, onEvent });

    const outDir = join(tmpDir, ".ownbench", "unit-test-to-code-tests");
    expect(readdirSync(outDir)).toEqual([]);

    expect(events[0]).toEqual({
      type: "info",
      id: 1,
      message: "Skipped foo (1/1): testFile is null",
    });
  });

  it("skips when source file is missing", async () => {
    mkdirSync(join(tmpDir, "tests"), { recursive: true });
    writeFileSync(join(tmpDir, "tests", "bar.test.ts"), "test");

    writeCandidateFunctions([
      {
        file: "src/missing.ts",
        name: "bar",

        testFile: "tests/bar.test.ts",
      },
    ]);

    await runUnitTestsToCode({ cwd: tmpDir, onEvent });

    expect(events[0].type).toBe("info");
    expect((events[0] as any).message).toContain("Skipped bar");
    expect((events[0] as any).message).toContain("source file missing");
  });

  it("skips when test file is missing", async () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "baz.ts"), "export function baz() {}");

    writeCandidateFunctions([
      {
        file: "src/baz.ts",
        name: "baz",

        testFile: "tests/missing.test.ts",
      },
    ]);

    await runUnitTestsToCode({ cwd: tmpDir, onEvent });

    expect(events[0].type).toBe("info");
    expect((events[0] as any).message).toContain("Skipped baz");
    expect((events[0] as any).message).toContain("test file missing");
  });

  it("disambiguates duplicate function names", async () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "a.ts"), "export function init() {}");
    writeFileSync(join(tmpDir, "src", "b.ts"), "export function init() {}");
    mkdirSync(join(tmpDir, "tests"), { recursive: true });
    writeFileSync(join(tmpDir, "tests", "a.test.ts"), "test a");
    writeFileSync(join(tmpDir, "tests", "b.test.ts"), "test b");

    writeCandidateFunctions([
      {
        file: "src/a.ts",
        name: "init",

        testFile: "tests/a.test.ts",
      },
      {
        file: "src/b.ts",
        name: "init",

        testFile: "tests/b.test.ts",
      },
    ]);

    await runUnitTestsToCode({ cwd: tmpDir, onEvent });

    const folders = readdirSync(
      join(tmpDir, ".ownbench", "unit-test-to-code-tests"),
    ).sort();
    expect(folders).toEqual(["init", "init__src_b.ts"]);
  });

  it("handles empty functions array", async () => {
    writeCandidateFunctions([]);

    await runUnitTestsToCode({ cwd: tmpDir, onEvent });

    const outDir = join(tmpDir, ".ownbench", "unit-test-to-code-tests");
    expect(readdirSync(outDir)).toEqual([]);

    expect(events).toEqual([
      {
        type: "info",
        id: 1,
        message: "Staged 0 of 0 candidate functions (0 skipped)",
      },
    ]);
  });

  it("creates output directory if it does not exist", async () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "x.ts"), "export function x() {}");
    mkdirSync(join(tmpDir, "tests"), { recursive: true });
    writeFileSync(join(tmpDir, "tests", "x.test.ts"), "test x");

    writeCandidateFunctions([
      {
        file: "src/x.ts",
        name: "x",

        testFile: "tests/x.test.ts",
      },
    ]);

    await runUnitTestsToCode({ cwd: tmpDir, onEvent });

    const folders = readdirSync(
      join(tmpDir, ".ownbench", "unit-test-to-code-tests"),
    );
    expect(folders).toEqual(["x"]);
  });
});
