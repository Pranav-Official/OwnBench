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

vi.mock("../../../src/generate/workflows/runPromptWithRetry.js", () => ({
  runPromptWithRetry: vi.fn(),
}));

vi.mock("../../../src/generate/resolveCandidates.js", () => ({
  resolveCandidates: vi.fn(),
}));

const { runPromptWithRetry } = await import(
  "../../../src/generate/workflows/runPromptWithRetry.js"
);
const mockRunPromptWithRetry = vi.mocked(runPromptWithRetry);

const { resolveCandidates } = await import(
  "../../../src/generate/resolveCandidates.js"
);
const mockResolveCandidates = vi.mocked(resolveCandidates);

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
    mockResolveCandidates.mockImplementation(
      (_projectDir: string, llmOutput: { file: string; name: string }[]) =>
        llmOutput.map((c) => ({
          file: c.file,
          name: c.name,
          startLine: 1,
          endLine: 1,
          testFile: null,
        })),
    );
  });

  it("skips completed steps when not stale", async () => {
    // functionalFiles is already checkpointed, so runPromptWithRetry is
    // called only for candidateFunctions + dashboard.
    // dashboard doesn't call runPromptWithRetry (sync file write).
    mockRunPromptWithRetry.mockImplementation(
      async (ctx: any, stepKey: string, prompt: string, validator: () => string | null) => {
        if (stepKey === "metadata.candidateFunctions") {
          writeFakeArtifact(
            "candidate_functions.json",
            '{"functions":[{"file":"src/a.ts","name":"foo","testFile":null,"functionDescription":"A test function."}]}',
          );
        }
        const err = validator();
        if (err !== null) throw new Error(err);
      },
    );

    writeFakeArtifact(
      "functional_files.json",
      '{"files":[{"path":"src/a.ts","lines":100,"description":"test file"}]}',
    );
    writeCheckpoint(tmpDir, "metadata.functionalFiles", "completed");

    await generateMetadata({ cwd: tmpDir });

    expect(mockRunPromptWithRetry).toHaveBeenCalledTimes(1);
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
    mockRunPromptWithRetry.mockImplementation(
      async (ctx: any, stepKey: string, prompt: string, validator: () => string | null) => {
        if (stepKey === "metadata.functionalFiles") {
          writeFakeArtifact(
            "functional_files.json",
            '{"files":[{"path":"src/a.ts","lines":100,"description":"test file"}]}',
          );
        } else if (stepKey === "metadata.candidateFunctions") {
          writeFakeArtifact(
            "candidate_functions.json",
            '{"functions":[{"file":"src/a.ts","name":"foo","testFile":null,"functionDescription":"A test function."}]}',
          );
        }
        const err = validator();
        if (err !== null) throw new Error(err);
      },
    );

    writeCheckpoint(tmpDir, "metadata.functionalFiles", "completed");

    await generateMetadata({ cwd: tmpDir, stale: true });

    expect(mockRunPromptWithRetry).toHaveBeenCalledTimes(2);
  });

  it("throws when step produces no output artifact", async () => {
    mockRunPromptWithRetry.mockImplementation(
      async (ctx: any, stepKey: string, prompt: string, validator: () => string | null) => {
        if (stepKey === "metadata.functionalFiles") {
          writeFakeArtifact(
            "functional_files.json",
            '{"files":[{"path":"src/a.ts","lines":100,"description":"test file"}]}',
          );
        }
        // candidateFunctions: do NOT write the file — validator will fail
        const err = validator();
        if (err !== null) throw new Error(err);
      },
    );

    writeFakeArtifact(
      "functional_files.json",
      '{"files":[{"path":"src/a.ts","lines":100,"description":"test file"}]}',
    );
    writeCheckpoint(tmpDir, "metadata.functionalFiles", "completed");

    await expect(
      generateMetadata({ cwd: tmpDir }),
    ).rejects.toThrow("candidate_functions.json");
  });

  it("does not write checkpoint when step throws", async () => {
    mockRunPromptWithRetry.mockRejectedValue(
      new Error("simulated LLM failure"),
    );

    await expect(
      generateMetadata({ cwd: tmpDir }),
    ).rejects.toThrow("simulated LLM failure");

    const state = readCheckpoint(tmpDir);
    expect(state.steps["metadata.functionalFiles"]).toBeUndefined();
  });
});
