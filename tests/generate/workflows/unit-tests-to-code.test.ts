import { describe, it, expect } from "vitest";

describe("runUnitTestsToCode", () => {
  it("is a no-op stub awaiting implementation", async () => {
    const { runUnitTestsToCode } = await import(
      "../../../src/generate/workflows/unit-tests-to-code.js"
    );

    await expect(
      runUnitTestsToCode({ cwd: "/fake" }),
    ).resolves.toBeUndefined();
  });
});
