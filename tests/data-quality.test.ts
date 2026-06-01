import { describe, expect, it } from "vitest";
import { buildAdBalance, buildProductLiveBalance, buildRoomDailyBalance } from "../packages/balance-engine/src/build-wide-tables.js";
import { addIssue, createDataQuality } from "../packages/core/src/data-quality.js";
import { recommend } from "../packages/balance-engine/src/scoring-engine.js";
import type { FeatureRow } from "../packages/balance-engine/src/feature-builder.js";

describe("data quality", () => {
  it("missing SKU mapping disables inventory/profit features", () => {
    const [row] = buildProductLiveBalance([
      { dt: "2026-05-01", roomId: "r1", productId: "p1", productExposure: 100, productClick: 10, productPayAmt: 100, productNetPayAmt: 90, productOrderCnt: 2, productPayUserCnt: 2, productRefundAmt: 10, skuId: null },
    ]);
    expect(row.dataQuality.inventoryUsable).toBe(false);
    expect(row.dataQuality.profitUsable).toBe(false);
    expect(row.dataQuality.issues.some((i) => i.code === "mapping_missing")).toBe(true);
  });

  it("finance discontinuity disables finance and profit features", () => {
    const dq = addIssue(createDataQuality(20), "finance_discontinuous", "coverage below threshold");
    expect(dq.financeUsable).toBe(false);
    expect(dq.profitUsable).toBe(false);
  });

  it("missing plan attribution prevents plan-level optimization but allows material-level shadow add", () => {
    const [row] = buildAdBalance([{ dt: "2026-05-01", entityType: "ad_material", entityId: "m1", cost: 10, paidGmv: 80, paidOrderCnt: 5 }]);
    expect(row.planId).toBeNull();
    expect(row.dataQuality.adAttributionLevel).toBe("material");
    const fr: FeatureRow = {
      dt: row.dt,
      entityType: "ad_material",
      entityId: row.entityId,
      row,
      futureLeakGuardMaxSourceDt: row.dt,
      normalizationWindowMaxDt: row.dt,
      features: { contribution: 60, efficiency: 95, quality: 95, stability: 80, growthSpace: 90, riskPenalty: 5 },
    };
    const recs = recommend([fr], [{ configId: "ad_add", entityType: "ad_material", recommendationType: "add", minSampleLevel: "low", weights: { contribution: 0.1, efficiency: 0.5, quality: 0.2, stability: 0.1, growthSpace: 0.2, riskPenalty: 0.2 } }]);
    expect(recs).toHaveLength(1);
    expect(JSON.stringify(recs[0]).toLowerCase()).not.toContain("budget amount");
  });

  it("zero denominator produces data-quality issue, not crash", () => {
    const [row] = buildRoomDailyBalance([{ dt: "2026-05-01", roomId: "r1", payAmt: 100, netPayAmt: 90, orderCnt: 10, payUserCnt: 8, cost: 0, refundAmt: 10 }]);
    expect(row.gmvCostRatio).toBeNull();
    expect(row.dataQuality.issues.some((i) => i.code === "zero_denominator")).toBe(true);
  });
});
