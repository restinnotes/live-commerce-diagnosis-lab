import { describe, expect, it } from "vitest";
import { assertNoFutureLeakage, runBacktest } from "../packages/balance-engine/src/backtest-engine.js";
import { calculateBacktestMetrics, ndcg } from "../packages/balance-engine/src/metrics.js";

describe("backtest engine", () => {
  it("detects future leakage", () => {
    expect(() => assertNoFutureLeakage([{ dt: "2026-05-01", futureLeakGuardMaxSourceDt: "2026-05-02" }])).toThrow(/future leakage/);
    expect(() => assertNoFutureLeakage([{ dt: "2026-05-01", futureLeakGuardMaxSourceDt: "2026-05-01" }])).not.toThrow();
  });

  it("precision@K, NDCG, and top-decile lift calculations are correct on simple fixtures", () => {
    const metrics = calculateBacktestMetrics([
      { score: 10, hit: true, outcome: 10 },
      { score: 9, hit: false, outcome: 0 },
      { score: 1, hit: false, outcome: 0 },
    ]);
    expect(metrics.precisionAtK["3"]).toBeCloseTo(1 / 3);
    expect(metrics.topDecileLift).toBeCloseTo(3);
    expect(ndcg([3, 2, 1], 3)).toBe(1);
  });

  it("joins recommendations to future outcomes", () => {
    const res = runBacktest(
      [
        {
          dt: "2026-05-01",
          entityType: "product",
          entityId: "p1",
          recommendationType: "add",
          score: 99,
          scoreBreakdown: {} as any,
          strength: "strong",
          evidence: [],
          dataQuality: { usable: true, issues: [] },
          configId: "c",
        },
      ],
      [{ dt: "2026-05-01", entityType: "product", entityId: "p1", horizon: "1d", futureNetPayAmt: 10, futureTopQuantile: true }],
    );
    expect(res[0].metrics.precisionAtK["3"]).toBe(1);
  });
});
