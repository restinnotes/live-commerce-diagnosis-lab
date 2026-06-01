import { describe, expect, it } from "vitest";
import { generateSyntheticData } from "../packages/balance-engine/src/synthetic-data.js";
import { buildWideTables } from "../packages/balance-engine/src/build-wide-tables.js";
import { buildAllFeatureRows, buildFeatureRowsAsOf } from "../packages/balance-engine/src/feature-builder.js";
import { assertNoFutureLeakage } from "../packages/balance-engine/src/backtest-engine.js";

describe("leakage guard", () => {
  it("synthetic feature pipeline does not use future data", () => {
    const features = buildAllFeatureRows(buildWideTables(generateSyntheticData()));
    expect(() => assertNoFutureLeakage(features)).not.toThrow();
  });

  it("global percentile normalization does not use future data", () => {
    const tables = buildWideTables({
      roomRows: [
        { dt: "2026-05-01", roomId: "r1", payAmt: 100, netPayAmt: 90, orderCnt: 10, payUserCnt: 8, cost: 10, refundAmt: 10 },
        { dt: "2026-05-02", roomId: "r2", payAmt: 100000, netPayAmt: 99000, orderCnt: 100, payUserCnt: 90, cost: 100, refundAmt: 1000 },
      ],
      productRows: [],
      carrierRows: [],
      adRows: [],
    });
    const [asOfFirstDay] = buildFeatureRowsAsOf(tables.rooms, "room", "2026-05-01");
    expect(asOfFirstDay.features.contribution).toBe(50);
    expect(asOfFirstDay.normalizationWindowMaxDt).toBe("2026-05-01");
  });
});
