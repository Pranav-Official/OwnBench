import { describe, it, expect } from "vitest";

describe("CLI entry point", () => {
  it("exports a valid package.json with expected fields", async () => {
    const pkg = await import("../package.json", { with: { type: "json" } });
    expect(pkg.default.name).toBe("ownbench");
    expect(pkg.default.bin).toEqual({ ownbench: "dist/index.js" });
  });
});
