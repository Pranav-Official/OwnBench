import { describe, it, expect } from "vitest";
import { generateDashboard } from "../../../src/generate/workflows/generateDashboard.js";
import { mkdtempSync, rmSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-dashboard-test-"));
  mkdirSync(join(tmpDir, ".ownbench", "metadata"), { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("generateDashboard", () => {
  it("creates index.html", async () => {
    await generateDashboard({ cwd: tmpDir, onEvent: undefined });

    const html = readFileSync(
      join(tmpDir, ".ownbench", "metadata", "index.html"),
      "utf-8",
    );
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("OwnBench Dashboard");
    expect(html).toContain("candidate_functions.json");
    expect(html).toContain("functional_files.json");
    expect(html).toContain("functionDescription");
    expect(html).toContain("detail-row");
    expect(html).toContain("function-row");
  });
});
