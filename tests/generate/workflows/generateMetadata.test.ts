import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateMetadata } from "../../../src/generate/workflows/generateMetadata.js";
import { writeCheckpoint, readCheckpoint } from "../../../src/lib/checkpoint.js";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir = "";

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ownbench-metadata-test-"));
  mkdirSync(join(tmpDir, ".ownbench"), { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

vi.mock("../../../src/generate/workflows/generateFunctionalFiles.js", () => ({
  generateFunctionalFiles: vi.fn(),
}));
vi.mock("../../../src/generate/workflows/generateCandidateFunctions.js", () => ({
  generateCandidateFunctions: vi.fn(),
}));
vi.mock("../../../src/generate/workflows/generateDashboard.js", () => ({
  generateDashboard: vi.fn(),
}));

describe("generateMetadata", () => {
  it("skips completed steps when not stale", async () => {
    const { generateFunctionalFiles } = await import(
      "../../../src/generate/workflows/generateFunctionalFiles.js"
    );
    const { generateCandidateFunctions } = await import(
      "../../../src/generate/workflows/generateCandidateFunctions.js"
    );
    const { generateDashboard } = await import(
      "../../../src/generate/workflows/generateDashboard.js"
    );

    mkdirSync(join(tmpDir, ".ownbench", "metadata"), { recursive: true });
    writeFileSync(
      join(tmpDir, ".ownbench", "metadata", "functional_files.json"),
      '{"files":[]}',
    );
    writeCheckpoint(tmpDir, "metadata.functionalFiles", "completed");

    await generateMetadata({ cwd: tmpDir });

    expect(generateFunctionalFiles).not.toHaveBeenCalled();
    expect(generateCandidateFunctions).toHaveBeenCalled();
    expect(generateDashboard).toHaveBeenCalled();
  });

  it("runs all steps when stale", async () => {
    const { generateFunctionalFiles } = await import(
      "../../../src/generate/workflows/generateFunctionalFiles.js"
    );
    const { generateCandidateFunctions } = await import(
      "../../../src/generate/workflows/generateCandidateFunctions.js"
    );
    const { generateDashboard } = await import(
      "../../../src/generate/workflows/generateDashboard.js"
    );

    writeCheckpoint(tmpDir, "metadata.functionalFiles", "completed");

    await generateMetadata({ cwd: tmpDir, stale: true });

    expect(generateFunctionalFiles).toHaveBeenCalled();
    expect(generateCandidateFunctions).toHaveBeenCalled();
    expect(generateDashboard).toHaveBeenCalled();
  });
});
