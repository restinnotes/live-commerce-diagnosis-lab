import { describe, expect, it } from "vitest";
import { generateSyntheticData } from "../packages/balance-engine/src/synthetic-data.js";
import { buildWideTables } from "../packages/balance-engine/src/build-wide-tables.js";
import { buildAllFeatureRows } from "../packages/balance-engine/src/feature-builder.js";
import { assertNoFutureLeakage } from "../packages/balance-engine/src/backtest-engine.js";

describe("leakage guard", () => {
  it("synthetic feature pipeline does not use future data", () => {
    const features = buildAllFeatureRows(buildWideTables(generateSyntheticData()));
    expect(() => assertNoFutureLeakage(features)).not.toThrow();
  });
});
