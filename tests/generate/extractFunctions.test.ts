import { describe, it, expect } from "vitest";
import { extractFunctions } from "../../src/generate/extractFunctions.js";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-extract-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("extractFunctions", () => {
  it("extracts function declarations", () => {
    writeFileSync(
      join(tmpDir, "src.ts"),
      `function greet(name: string): string { return "hi " + name; }
function add(a: number, b: number) { return a + b; }`,
    );

    const fns = extractFunctions(tmpDir, ["src.ts"]);
    expect(fns).toHaveLength(2);
    expect(fns[0].name).toBe("greet");
    expect(fns[0].file).toBe("src.ts");
    expect(fns[0].startLine).toBe(1);
    expect(fns[0].endLine).toBe(1);
    expect(fns[1].name).toBe("add");
  });

  it("extracts arrow functions assigned to const", () => {
    writeFileSync(
      join(tmpDir, "src.ts"),
      `const multiply = (a: number, b: number) => a * b;
const divide = function(a: number, b: number) { return a / b; };`,
    );

    const fns = extractFunctions(tmpDir, ["src.ts"]);
    expect(fns).toHaveLength(2);
    expect(fns[0].name).toBe("multiply");
    expect(fns[1].name).toBe("divide");
  });

  it("extracts class methods", () => {
    writeFileSync(
      join(tmpDir, "src.ts"),
      `class Calculator {
  add(a: number, b: number) { return a + b; }
  subtract(a: number, b: number) { return a - b; }
}`,
    );

    const fns = extractFunctions(tmpDir, ["src.ts"]);
    expect(fns).toHaveLength(2);
    expect(fns[0].name).toBe("add");
    expect(fns[1].name).toBe("subtract");
  });

  it("skips files that don't exist", () => {
    const fns = extractFunctions(tmpDir, ["nonexistent.ts"]);
    expect(fns).toHaveLength(0);
  });

  it("extracts from multiple files", () => {
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "a.ts"), `export function foo() {}`);
    writeFileSync(join(tmpDir, "src", "b.ts"), `export function bar() {}`);

    const fns = extractFunctions(tmpDir, ["src/a.ts", "src/b.ts"]);
    expect(fns).toHaveLength(2);
    expect(fns[0].name).toBe("foo");
    expect(fns[1].name).toBe("bar");
  });
});
