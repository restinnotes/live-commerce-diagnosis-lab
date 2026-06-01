import { describe, expect, it } from "vitest";
import { searchWeightsTrainOnly, supportedWeightSearchObjectives } from "../packages/balance-engine/src/weight-search.js";
import type { FeatureRow } from "../packages/balance-engine/src/feature-builder.js";

describe("weight search", () => {
  it("supports required objective pairs and uses only train-window features/outcomes", () => {
    expect(supportedWeightSearchObjectives).toEqual(
      expect.arrayContaining([
        { entityType: "product", recommendationType: "add" },
        { entityType: "product", recommendationType: "downrank" },
        { entityType: "product", recommendationType: "investigate" },
        { entityType: "room", recommendationType: "add" },
        { entityType: "room", recommendationType: "downrank" },
        { entityType: "ad_material", recommendationType: "add" },
        { entityType: "ad_material", recommendationType: "downrank" },
        { entityType: "carrier", recommendationType: "watch" },
      ]),
    );

    const mk = (dt: string, entityId: string): FeatureRow => ({
      dt,
      entityType: "product",
      entityId,
      row: { dt, productId: entityId, dataQuality: { usable: true, sampleLevel: "high", issues: [] } } as any,
      normalizationWindowMaxDt: dt,
      futureLeakGuardMaxSourceDt: dt,
      features: { contribution: 80, efficiency: 80, quality: 80, stability: 80, growthSpace: 80, riskPenalty: 5 },
    });
    const results = searchWeightsTrainOnly(
      [mk("2026-05-01", "train"), mk("2026-05-25", "test")],
      [
        { dt: "2026-05-01", entityType: "product", entityId: "train", horizon: "3d", futureTopQuantile: true, futureNetPayAmt: 100 },
        { dt: "2026-05-25", entityType: "product", entityId: "test", horizon: "3d", futureTopQuantile: true, futureNetPayAmt: 999999 },
      ],
      {
        trainEndDate: "2026-05-20",
        spaces: [
          { entityType: "product", recommendationType: "add", maxConfigs: 1, search: { contribution: [0.4], efficiency: [0.4], quality: [0.3], stability: [0.1], growthSpace: [0.3], riskPenalty: [0.1] } },
        ],
      },
    );
    expect(results[0].metricsSampleCount).toBe(1);
  });
});
