import { describe, expect, it } from "vitest";
import { recommend, scoreFeatureGroups } from "../packages/balance-engine/src/scoring-engine.js";
import { addIssue, createDataQuality } from "../packages/core/src/data-quality.js";
import type { FeatureRow } from "../packages/balance-engine/src/feature-builder.js";
import type { ScoringConfig } from "../packages/core/src/types.js";

function featureRow(features: FeatureRow["features"], sampleSize = 30, issues = 0): FeatureRow {
  const dq = createDataQuality(sampleSize);
  for (let i = 0; i < issues; i += 1) addIssue(dq, "unknown", "test issue");
  return {
    dt: "2026-05-01",
    entityType: "product",
    entityId: "p1",
    row: { dt: "2026-05-01", productId: "p1", dataQuality: dq } as any,
    futureLeakGuardMaxSourceDt: "2026-05-01",
    normalizationWindowMaxDt: "2026-05-01",
    features,
  };
}

const cfg = (recommendationType: ScoringConfig["recommendationType"]): ScoringConfig => ({
  configId: `x_${recommendationType}`,
  entityType: "product",
  recommendationType,
  minSampleLevel: "low",
  weights: { contribution: 0.2, efficiency: 0.3, quality: 0.25, stability: 0.1, growthSpace: 0.2, riskPenalty: 0.4 },
});

describe("objective-specific scoring engine", () => {
  it("high ROI low refund object scores high for add and low for downrank", () => {
    const features = { contribution: 70, efficiency: 95, quality: 95, stability: 90, growthSpace: 80, riskPenalty: 5 };
    expect(scoreFeatureGroups(features, cfg("add"))).toBeGreaterThan(80);
    expect(scoreFeatureGroups(features, cfg("downrank"), { costPressure: 5 })).toBeLessThan(20);
  });

  it("low ROI high refund object scores high for downrank/investigate and low for add", () => {
    const features = { contribution: 35, efficiency: 10, quality: 5, stability: 70, growthSpace: 10, riskPenalty: 95 };
    expect(scoreFeatureGroups(features, cfg("add"))).toBeLessThan(20);
    expect(scoreFeatureGroups(features, cfg("downrank"), { costPressure: 95 })).toBeGreaterThan(70);
    expect(scoreFeatureGroups(features, cfg("investigate"), { dataQualityIssueCount: 2 })).toBeGreaterThan(70);
  });

  it("high GMV high refund object is investigate, not direct add", () => {
    const features = { contribution: 95, efficiency: 60, quality: 5, stability: 75, growthSpace: 50, riskPenalty: 90 };
    expect(scoreFeatureGroups(features, cfg("investigate"), { dataQualityIssueCount: 1 })).toBeGreaterThan(scoreFeatureGroups(features, cfg("add")));
  });

  it("sample-too-small rows become weak watch/add rather than strong add/downrank", () => {
    const fr = featureRow({ contribution: 100, efficiency: 100, quality: 100, stability: 100, growthSpace: 100, riskPenalty: 0 }, 1);
    const recs = recommend([fr], [cfg("add"), cfg("watch")]);
    expect(recs.some((rec) => rec.recommendationType === "add" && rec.strength === "strong")).toBe(false);
    expect(recs.some((rec) => rec.recommendationType === "watch" || rec.strength === "weak")).toBe(true);
  });

  it("recommendation contains evidence, scoreBreakdown, dataQuality, configId, and strength", () => {
    const fr = featureRow({ contribution: 90, efficiency: 90, quality: 90, stability: 90, growthSpace: 90, riskPenalty: 5 }, 30);
    const [rec] = recommend([fr], [cfg("add")]);
    expect(rec.configId).toBe("x_add");
    expect(rec.scoreBreakdown.efficiency).toBe(90);
    expect(rec.evidence.length).toBeGreaterThan(0);
    expect(rec.dataQuality.usable).toBe(true);
    expect(rec.strength).toMatch(/weak|medium|strong/);
  });
});
