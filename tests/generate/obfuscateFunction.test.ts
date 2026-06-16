import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { obfuscateFunction } from "../../src/generate/obfuscateFunction.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-obfuscate-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function src(name: string, content: string): void {
  writeFileSync(join(tmpDir, name), content);
}

describe("obfuscateFunction", () => {
  it("replaces body of a function declaration", () => {
    src("a.ts", `function greet(name: string): string { return "hi " + name; }`);
    const result = obfuscateFunction(tmpDir, "a.ts", "greet");
    expect(result).toContain("function greet(name: string): string");
    expect(result).toContain('throw new Error("Not implemented")');
    expect(result).not.toContain("return");
  });

  it("replaces body of an arrow function assigned to const", () => {
    src("a.ts", `const multiply = (a: number, b: number) => a * b;`);
    const result = obfuscateFunction(tmpDir, "a.ts", "multiply");
    expect(result).toContain("const multiply");
    expect(result).toContain('throw new Error("Not implemented")');
    expect(result).not.toContain("a * b");
  });

  it("replaces body of arrow function with block body", () => {
    src("a.ts", `const add = (a: number, b: number) => { return a + b; };`);
    const result = obfuscateFunction(tmpDir, "a.ts", "add");
    expect(result).toContain("const add");
    expect(result).toContain('throw new Error("Not implemented")');
    expect(result).not.toContain("a + b");
  });

  it("replaces body of a function expression", () => {
    src("a.ts", `const divide = function(a: number, b: number) { return a / b; };`);
    const result = obfuscateFunction(tmpDir, "a.ts", "divide");
    expect(result).toContain("const divide");
    expect(result).toContain('throw new Error("Not implemented")');
    expect(result).not.toContain("a / b");
  });

  it("replaces body of a class method, leaves other methods intact", () => {
    src("a.ts", `class Calculator {
  add(a: number, b: number) { return a + b; }
  subtract(a: number, b: number) { return a - b; }
}`);
    const result = obfuscateFunction(tmpDir, "a.ts", "add");
    expect(result).toContain("add(a: number, b: number)");
    expect(result).toContain('throw new Error("Not implemented")');
    expect(result).not.toContain("a + b");
    expect(result).toContain("return a - b");
  });

  it("preserves async modifier", () => {
    src("a.ts", `async function fetchData(url: string) { return await fetch(url); }`);
    const result = obfuscateFunction(tmpDir, "a.ts", "fetchData");
    expect(result).toContain("async function fetchData");
    expect(result).toContain('throw new Error("Not implemented")');
  });

  it("preserves generator syntax", () => {
    src("a.ts", `function* idGenerator() { yield 1; yield 2; }`);
    const result = obfuscateFunction(tmpDir, "a.ts", "idGenerator");
    expect(result).toContain("function* idGenerator");
    expect(result).toContain('throw new Error("Not implemented")');
    expect(result).not.toContain("yield 1");
  });

  it("preserves generics", () => {
    src("a.ts", `function identity<T>(x: T): T { return x; }`);
    const result = obfuscateFunction(tmpDir, "a.ts", "identity");
    expect(result).toContain("function identity<T>(x: T): T");
    expect(result).toContain('throw new Error("Not implemented")');
  });

  it("preserves JSDoc", () => {
    src("a.ts", `/** Adds two numbers */ function add(a: number, b: number) { return a + b; }`);
    const result = obfuscateFunction(tmpDir, "a.ts", "add");
    expect(result).toContain("/** Adds two numbers */");
    expect(result).toContain("function add");
    expect(result).toContain('throw new Error("Not implemented")');
  });

  it("preserves exports", () => {
    src("a.ts", `export function parse(input: string) { return JSON.parse(input); }`);
    const result = obfuscateFunction(tmpDir, "a.ts", "parse");
    expect(result).toContain("export function parse");
    expect(result).toContain('throw new Error("Not implemented")');
  });

  it("preserves imports and other declarations", () => {
    src("a.ts", `import { readFileSync } from "node:fs";

const DEFAULT = { strict: true };

export function getConfig(path: string) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function setConfig(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data));
}`);
    const result = obfuscateFunction(tmpDir, "a.ts", "getConfig");
    expect(result).toContain('import { readFileSync }');
    expect(result).toContain("DEFAULT");
    expect(result).toContain("export function getConfig");
    expect(result).toContain('throw new Error("Not implemented")');
    expect(result).toContain("writeFileSync");
    expect(result).not.toContain("readFileSync(path, \"utf-8\")");
  });

  it("handles private class method", () => {
    src("a.ts", `class Service {
  private validate(input: string): boolean {
    return input.length > 0;
  }
}`);
    const result = obfuscateFunction(tmpDir, "a.ts", "validate");
    expect(result).toContain("private validate");
    expect(result).toContain('throw new Error("Not implemented")');
    expect(result).not.toContain("input.length > 0");
  });

  it("handles static class method", () => {
    src("a.ts", `class Util {
  static create() { return new Util(); }
}`);
    const result = obfuscateFunction(tmpDir, "a.ts", "create");
    expect(result).toContain("static create");
    expect(result).toContain('throw new Error("Not implemented")');
  });

  it("handles class with get accessor", () => {
    src("a.ts", `class Widget {
  get value() { return this._value; }
}`);
    const result = obfuscateFunction(tmpDir, "a.ts", "value");
    expect(result).toContain("get value()");
    expect(result).toContain('throw new Error("Not implemented")');
  });

  it("handles set accessor", () => {
    src("a.ts", `class Widget {
  set value(v: number) { this._value = v; }
}`);
    const result = obfuscateFunction(tmpDir, "a.ts", "value");
    expect(result).toContain("set value(");
    expect(result).toContain('throw new Error("Not implemented")');
    expect(result).not.toContain("this._value = v");
  });

  it("throws when function not found by name", () => {
    src("a.ts", `function foo() { return 1; }`);
    expect(() => obfuscateFunction(tmpDir, "a.ts", "nonexistent")).toThrow(
      'Could not find function "nonexistent"',
    );
  });

  it("throws when source file does not exist", () => {
    expect(() => obfuscateFunction(tmpDir, "missing.ts", "foo")).toThrow();
  });

  it("preserves export default", () => {
    src("a.ts", `export default function handler() { return null; }`);
    const result = obfuscateFunction(tmpDir, "a.ts", "handler");
    expect(result).toContain("export default function handler");
    expect(result).toContain('throw new Error("Not implemented")');
  });

  it("handles function overloads (targets the last impl)", () => {
    src("a.ts", [
      "function process(input: string): string;",
      "function process(input: number): number;",
      "function process(input: string | number) { return input; }",
    ].join("\n"));
    const result = obfuscateFunction(tmpDir, "a.ts", "process");
    expect(result).toContain('throw new Error("Not implemented")');
    expect(result).not.toContain("return input");
  });
});
