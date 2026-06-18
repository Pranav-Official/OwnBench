import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  flattenPath,
  sanitizeFolderName,
  uniqueFolderName,
  stageTestSuite,
} from "../../../src/generate/workflows/stageTestSuites.js";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-stage-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("flattenPath", () => {
  it("replaces forward slashes", () => {
    expect(flattenPath("src/lib/config.ts")).toBe("src_lib_config.ts");
  });

  it("replaces backslashes", () => {
    expect(flattenPath("src\\lib\\config.ts")).toBe("src_lib_config.ts");
  });

  it("replaces mixed slashes", () => {
    expect(flattenPath("src/lib\\test.ts")).toBe("src_lib_test.ts");
  });

  it("handles nested paths", () => {
    expect(flattenPath("a/b/c/d/e.ts")).toBe("a_b_c_d_e.ts");
  });

  it("handles single-segment path", () => {
    expect(flattenPath("config.ts")).toBe("config.ts");
  });
});

describe("sanitizeFolderName", () => {
  it("removes invalid path characters", () => {
    expect(sanitizeFolderName("init<>:\"/\\|?*foo")).toBe("init_foo");
  });

  it("removes control characters", () => {
    expect(sanitizeFolderName("foo\x00\x1f\x01bar")).toBe("foo_bar");
  });

  it("collapses consecutive underscores", () => {
    expect(sanitizeFolderName("a___b")).toBe("a_b");
  });

  it("trims leading/trailing underscores", () => {
    expect(sanitizeFolderName("_init_")).toBe("init");
  });

  it("returns empty string for all-invalid input", () => {
    expect(sanitizeFolderName("<>:\"/\\|?*\x00\x1f")).toBe("");
  });

  it("passes through clean names", () => {
    expect(sanitizeFolderName("displayFormattedGrid")).toBe(
      "displayFormattedGrid",
    );
  });
});

describe("uniqueFolderName", () => {
  it("returns name as-is when unique", () => {
    const used = new Set<string>();
    expect(uniqueFolderName("readConfig", "src/a.ts", used)).toBe("readConfig");
    expect(used.has("readConfig")).toBe(true);
  });

  it("appends flattened source when name collides", () => {
    const used = new Set(["readConfig"]);
    expect(uniqueFolderName("readConfig", "src/lib/a.ts", used)).toBe(
      "readConfig__src_lib_a.ts",
    );
  });

  it("numbers suffix when both name+source collide", () => {
    const used = new Set(["readConfig", "readConfig__src_lib_a.ts"]);
    expect(uniqueFolderName("readConfig", "src/lib/a.ts", used)).toBe(
      "readConfig__src_lib_a.ts_2",
    );
  });
});

describe("stageTestSuite", () => {
  it("copies source and test files into the output dir", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "config.ts"), "export function readConfig() {}");
    mkdirSync(join(tmpDir, "tests"), { recursive: true });
    writeFileSync(
      join(tmpDir, "tests", "config.test.ts"),
      "import { read } from '../src/config';",
    );

    const outDir = join(tmpDir, ".ownbench", "unit-test-to-code-tests");
    mkdirSync(outDir, { recursive: true });

    const used = new Set<string>();
    const result = stageTestSuite(
      tmpDir,
      {
        file: "src/config.ts",
        name: "readConfig",
        testFile: "tests/config.test.ts",
        functionDescription: "Reads and parses a JSON configuration file.",
      },
      used,
      outDir,
    );

    expect(result.status).toBe("staged");
    expect(result.folderName).toBe("readConfig");

    const srcContent = readFileSync(
      join(outDir, "readConfig", "src_config.ts"),
      "utf-8",
    );
    expect(srcContent).toContain("export function readConfig()");
    expect(srcContent).toContain('throw new Error("Not implemented")');

    const testContent = readFileSync(
      join(outDir, "readConfig", "tests_config.test.ts"),
      "utf-8",
    );
    expect(testContent).toBe("import { read } from '../src/config';");

    const descContent = readFileSync(
      join(outDir, "readConfig", "readConfig_description.txt"),
      "utf-8",
    );
    expect(descContent).toBe("Reads and parses a JSON configuration file.");
  });

  it("skips when testFile is null", () => {
    const outDir = join(tmpDir, ".ownbench", "unit-test-to-code-tests");
    mkdirSync(outDir, { recursive: true });

    const used = new Set<string>();
    const result = stageTestSuite(
      tmpDir,
      {
        file: "src/config.ts",
        name: "readConfig",
        testFile: null,
      },
      used,
      outDir,
    );

    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("testFile is null");
    expect(used.size).toBe(0);
  });

  it("writes description file when functionDescription is provided", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "config.ts"), "export function readConfig() {}");
    mkdirSync(join(tmpDir, "tests"), { recursive: true });
    writeFileSync(join(tmpDir, "tests", "config.test.ts"), "test");

    const outDir = join(tmpDir, ".ownbench", "unit-test-to-code-tests");
    mkdirSync(outDir, { recursive: true });

    const used = new Set<string>();
    const result = stageTestSuite(
      tmpDir,
      {
        file: "src/config.ts",
        name: "readConfig",
        testFile: "tests/config.test.ts",
        functionDescription: "Reads config",
      },
      used,
      outDir,
    );

    expect(result.status).toBe("staged");
    const descContent = readFileSync(
      join(outDir, "readConfig", "readConfig_description.txt"),
      "utf-8",
    );
    expect(descContent).toBe("Reads config");
  });

  it("does not write description file when functionDescription is missing", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "config.ts"), "export function readConfig() {}");
    mkdirSync(join(tmpDir, "tests"), { recursive: true });
    writeFileSync(join(tmpDir, "tests", "config.test.ts"), "test");

    const outDir = join(tmpDir, ".ownbench", "unit-test-to-code-tests");
    mkdirSync(outDir, { recursive: true });

    const used = new Set<string>();
    const result = stageTestSuite(
      tmpDir,
      {
        file: "src/config.ts",
        name: "readConfig",
        testFile: "tests/config.test.ts",
      },
      used,
      outDir,
    );

    expect(result.status).toBe("staged");
    const descPath = join(outDir, "readConfig", "readConfig_description.txt");
    expect(existsSync(descPath)).toBe(false);
  });

  it("skips when source file is missing", () => {
    mkdirSync(join(tmpDir, "tests"), { recursive: true });
    writeFileSync(join(tmpDir, "tests", "foo.test.ts"), "test");

    const outDir = join(tmpDir, ".ownbench", "unit-test-to-code-tests");
    mkdirSync(outDir, { recursive: true });

    const used = new Set<string>();
    const result = stageTestSuite(
      tmpDir,
      {
        file: "src/missing.ts",
        name: "foo",
        testFile: "tests/foo.test.ts",
      },
      used,
      outDir,
    );

    expect(result.status).toBe("skipped");
    expect(result.reason).toContain("source file missing");
    expect(used.size).toBe(0);
  });

  it("skips when test file is missing", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "foo.ts"), "code");

    const outDir = join(tmpDir, ".ownbench", "unit-test-to-code-tests");
    mkdirSync(outDir, { recursive: true });

    const used = new Set<string>();
    const result = stageTestSuite(
      tmpDir,
      {
        file: "src/foo.ts",
        name: "foo",
        testFile: "tests/missing.test.ts",
      },
      used,
      outDir,
    );

    expect(result.status).toBe("skipped");
    expect(result.reason).toContain("test file missing");
    expect(used.size).toBe(0);
  });

  it("disambiguates duplicate function names", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "a.ts"), "export function parse() {}");
    writeFileSync(join(tmpDir, "src", "b.ts"), "export function parse() {}");
    mkdirSync(join(tmpDir, "tests"), { recursive: true });
    writeFileSync(join(tmpDir, "tests", "a.test.ts"), "test a");
    writeFileSync(join(tmpDir, "tests", "b.test.ts"), "test b");

    const outDir = join(tmpDir, ".ownbench", "unit-test-to-code-tests");
    mkdirSync(outDir, { recursive: true });

    const used = new Set<string>();
    const r1 = stageTestSuite(
      tmpDir,
      {
        file: "src/a.ts",
        name: "parse",
        testFile: "tests/a.test.ts",
      },
      used,
      outDir,
    );
    const r2 = stageTestSuite(
      tmpDir,
      {
        file: "src/b.ts",
        name: "parse",
        testFile: "tests/b.test.ts",
      },
      used,
      outDir,
    );

    expect(r1.status).toBe("staged");
    expect(r1.folderName).toBe("parse");
    expect(r2.status).toBe("staged");
    expect(r2.folderName).toBe("parse__src_b.ts");
    expect(used.size).toBe(2);
  });
});
