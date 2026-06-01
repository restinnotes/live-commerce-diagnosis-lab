import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("runtime artifacts", () => {
  it("outputs directory is ignored instead of committed as runtime artifacts", async () => {
    const ignore = await readFile(".gitignore", "utf8");
    expect(ignore).toContain("outputs/");
  });
});
