import { describe, expect, it } from "vitest";
import { buildAdBalance, buildProductLiveBalance, buildRoomDailyBalance } from "../packages/balance-engine/src/build-wide-tables.js";
import { addIssue, createDataQuality } from "../packages/core/src/data-quality.js";

describe("data quality", () => {
  it("missing SKU mapping disables inventory/profit features", () => {
    const [row] = buildProductLiveBalance([{ dt:"2026-05-01", roomId:"r1", productId:"p1", productExposure:100, productClick:10, productPayAmt:100, productNetPayAmt:90, productOrderCnt:2, productPayUserCnt:2, productRefundAmt:10, skuId:null }]);
    expect(row.dataQuality.inventoryUsable).toBe(false);
    expect(row.dataQuality.profitUsable).toBe(false);
    expect(row.dataQuality.issues.some(i=>i.code==="mapping_missing")).toBe(true);
  });
  it("finance discontinuity disables finance features", () => {
    const dq = addIssue(createDataQuality(20), "finance_discontinuous", "coverage below threshold");
    expect(dq.financeUsable).toBe(false);
  });
  it("ad attribution missing prevents plan-level recommendation", () => {
    const [row] = buildAdBalance([{ dt:"2026-05-01", entityType:"ad_material", entityId:"m1", cost:10, paidGmv:20, paidOrderCnt:5 }]);
    expect(row.planId).toBeNull();
    expect(row.dataQuality.adAttributionUsable).toBe(false);
  });
  it("zero denominator produces data-quality issue, not crash", () => {
    const [row] = buildRoomDailyBalance([{ dt:"2026-05-01", roomId:"r1", payAmt:100, netPayAmt:90, orderCnt:10, payUserCnt:8, cost:0, refundAmt:10 }]);
    expect(row.gmvCostRatio).toBeNull();
    expect(row.dataQuality.issues.some(i=>i.code==="zero_denominator")).toBe(true);
  });
});
