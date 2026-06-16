import { describe, it, expect } from "vitest";
import { findTestFile } from "../../src/generate/findTestFile.js";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-findtest-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("findTestFile", () => {
  it("finds co-located .test.ts file", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "foo.ts"), "");
    writeFileSync(join(tmpDir, "src", "foo.test.ts"), "");

    expect(findTestFile(tmpDir, "src/foo.ts")).toBe("src/foo.test.ts");
  });

  it("finds tests/ mirror file", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    mkdirSync(join(tmpDir, "tests", "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "bar.ts"), "");
    writeFileSync(join(tmpDir, "tests", "src", "bar.test.ts"), "");

    expect(findTestFile(tmpDir, "src/bar.ts")).toBe("tests/src/bar.test.ts");
  });

  it("finds __tests__/ mirror file", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    mkdirSync(join(tmpDir, "__tests__", "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "baz.ts"), "");
    writeFileSync(join(tmpDir, "__tests__", "src", "baz.test.ts"), "");

    expect(findTestFile(tmpDir, "src/baz.ts")).toBe("__tests__/src/baz.test.ts");
  });

  it("returns null when no test file exists", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "no-test.ts"), "");

    expect(findTestFile(tmpDir, "src/no-test.ts")).toBeNull();
  });

  it("finds .test.tsx for .tsx files", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "comp.tsx"), "");
    writeFileSync(join(tmpDir, "src", "comp.test.tsx"), "");

    expect(findTestFile(tmpDir, "src/comp.tsx")).toBe("src/comp.test.tsx");
  });

  it("finds co-located .spec.ts file", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "service.ts"), "");
    writeFileSync(join(tmpDir, "src", "service.spec.ts"), "");

    expect(findTestFile(tmpDir, "src/service.ts")).toBe("src/service.spec.ts");
  });

  it("finds tests/ mirror .spec.ts file", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    mkdirSync(join(tmpDir, "tests", "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "helper.ts"), "");
    writeFileSync(join(tmpDir, "tests", "src", "helper.spec.ts"), "");

    expect(findTestFile(tmpDir, "src/helper.ts")).toBe("tests/src/helper.spec.ts");
  });

  it("finds __tests__/ mirror .spec.ts file", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    mkdirSync(join(tmpDir, "__tests__", "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "util.ts"), "");
    writeFileSync(join(tmpDir, "__tests__", "src", "util.spec.ts"), "");

    expect(findTestFile(tmpDir, "src/util.ts")).toBe("__tests__/src/util.spec.ts");
  });

  it("finds .spec.tsx for .tsx files", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "widget.tsx"), "");
    writeFileSync(join(tmpDir, "src", "widget.spec.tsx"), "");

    expect(findTestFile(tmpDir, "src/widget.tsx")).toBe("src/widget.spec.tsx");
  });

  it("prefers .test.ts over .spec.ts when both exist", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "dual.ts"), "");
    writeFileSync(join(tmpDir, "src", "dual.test.ts"), "");
    writeFileSync(join(tmpDir, "src", "dual.spec.ts"), "");

    expect(findTestFile(tmpDir, "src/dual.ts")).toBe("src/dual.test.ts");
  });
});
