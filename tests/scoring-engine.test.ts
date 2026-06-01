import { describe, expect, it } from "vitest";
import { scoreFeatureGroups, recommend } from "../packages/balance-engine/src/scoring-engine.js";
import { createDataQuality } from "../packages/core/src/data-quality.js";
import type { FeatureRow } from "../packages/balance-engine/src/feature-builder.js";

describe("scoring engine", () => {
  it("produces expected weighted score breakdown", () => {
    const score = scoreFeatureGroups({ contribution: 50, efficiency: 80, quality: 70, stability: 60, growthSpace: 90, riskPenalty: 20 }, { configId: "x", entityType: "product", recommendationType: "add", weights: { contribution: .1, efficiency: .3, quality: .2, stability: .1, growthSpace: .2, riskPenalty: .2 } });
    expect(score).toBe(63);
  });
  it("sample-too-small rows cannot become strong recommendations", () => {
    const dq = createDataQuality(1);
    const row = { dt: "2026-05-01", productId: "p1", dataQuality: dq } as any;
    const fr: FeatureRow = { dt: row.dt, entityType: "product", entityId: "p1", row, futureLeakGuardMaxSourceDt: row.dt, features: { contribution: 100, efficiency: 100, quality: 100, stability: 100, growthSpace: 100, riskPenalty: 0 } };
    const recs = recommend([fr], [{ configId: "x", entityType: "product", recommendationType: "add", minSampleLevel: "medium", weights: { contribution: 1, efficiency: 1, quality: 1, stability: 1, growthSpace: 1, riskPenalty: 0 } }]);
    expect(recs).toHaveLength(0);
  });
});
