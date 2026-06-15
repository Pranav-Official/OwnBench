import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  writeCheckpoint,
  readCheckpoint,
} from "../../../src/lib/checkpoint.js";
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

function writeFakeArtifact(name: string, content: string) {
  mkdirSync(join(tmpDir, ".ownbench", "metadata"), { recursive: true });
  writeFileSync(join(tmpDir, ".ownbench", "metadata", name), content);
}

vi.mock("../../../src/generate/workflows/runPrompt.js", () => ({
  runPrompt: vi.fn(),
}));

const { runPrompt } = await import(
  "../../../src/generate/workflows/runPrompt.js"
);
const mockRunPrompt = vi.mocked(runPrompt);

const { generateFunctionalFiles } = await import(
  "../../../src/generate/workflows/generateFunctionalFiles.js"
);
const { generateCandidateFunctions } = await import(
  "../../../src/generate/workflows/generateCandidateFunctions.js"
);
const { generateDashboard } = await import(
  "../../../src/generate/workflows/generateDashboard.js"
);
const { generateMetadata } = await import(
  "../../../src/generate/workflows/generateMetadata.js"
);

describe("generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips completed steps when not stale", async () => {
    mockRunPrompt.mockImplementation(async (ctx: WorkflowContext, prompt: string) => {
      if (prompt.includes("functional source code files")) {
        writeFakeArtifact("functional_files.json", '{"files":[]}');
      } else if (prompt.includes("candidate functions")) {
        writeFakeArtifact(
          "candidate_functions.json",
          '{"functions":[{"file":"src/a.ts","name":"foo","startLine":1,"endLine":5,"testFile":null}]}',
        );
      }
    });

    writeFakeArtifact("functional_files.json", '{"files":[]}');
    writeCheckpoint(tmpDir, "metadata.functionalFiles", "completed");

    await generateMetadata({ cwd: tmpDir });

    expect(mockRunPrompt).toHaveBeenCalledTimes(1);
    expect(
      readCheckpoint(tmpDir).steps["metadata.functionalFiles"],
    ).toBeDefined();
    expect(
      readCheckpoint(tmpDir).steps["metadata.candidateFunctions"],
    ).toBeDefined();
    expect(
      readCheckpoint(tmpDir).steps["metadata.dashboard"],
    ).toBeDefined();
  });

  it("runs all steps when stale", async () => {
    mockRunPrompt.mockImplementation(async (ctx: WorkflowContext, prompt: string) => {
      if (prompt.includes("functional source code files")) {
        writeFakeArtifact("functional_files.json", '{"files":[]}');
      } else if (prompt.includes("candidate functions")) {
        writeFakeArtifact(
          "candidate_functions.json",
          '{"functions":[{"file":"src/a.ts","name":"foo","startLine":1,"endLine":5,"testFile":null}]}',
        );
      }
    });

    writeCheckpoint(tmpDir, "metadata.functionalFiles", "completed");

    await generateMetadata({ cwd: tmpDir, stale: true });

    expect(mockRunPrompt).toHaveBeenCalledTimes(2);
  });

  it("throws when step produces no output artifact", async () => {
    mockRunPrompt.mockImplementation(async (ctx: WorkflowContext, prompt: string) => {
      if (prompt.includes("functional source code files")) {
        writeFakeArtifact("functional_files.json", '{"files":[]}');
      }
    });

    writeFakeArtifact("functional_files.json", '{"files":[]}');
    writeCheckpoint(tmpDir, "metadata.functionalFiles", "completed");

    await expect(
      generateMetadata({ cwd: tmpDir }),
    ).rejects.toThrow("metadata.candidateFunctions");
  });

  it("does not write checkpoint when step throws", async () => {
    mockRunPrompt.mockRejectedValue(new Error("simulated LLM failure"));

    await expect(
      generateMetadata({ cwd: tmpDir }),
    ).rejects.toThrow("simulated LLM failure");

    const state = readCheckpoint(tmpDir);
    expect(state.steps["metadata.functionalFiles"]).toBeUndefined();
  });
});
