import { describe, it, expect } from "vitest";
import { runBenchmark } from "../../src/agents/bench.js";

describe("runBenchmark", () => {
  it("throws not implemented error", () => {
    expect(() => runBenchmark()).toThrow("Not implemented");
  });
});
