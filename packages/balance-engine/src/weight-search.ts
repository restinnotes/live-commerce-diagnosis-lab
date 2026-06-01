import type { BalanceOutcome, EntityType, RecommendationType, ScoringConfig, ScoreWeights } from "../../core/src/types.js";
import type { FeatureRow } from "./feature-builder.js";
import { runBacktest } from "./backtest-engine.js";
import { recommend } from "./scoring-engine.js";

export interface WeightSearchSpace {
  entityType: EntityType;
  recommendationType: RecommendationType;
  search: Record<keyof ScoreWeights, number[]>;
  maxConfigs: number;
}

export interface WeightSearchResult {
  config: ScoringConfig;
  objectiveScore: number;
  reason: string;
  metricsSampleCount: number;
}

export interface WeightSearchRun {
  spaces: WeightSearchSpace[];
  trainEndDate: string;
  testStartDate?: string;
}

const keys: (keyof ScoreWeights)[] = ["contribution", "efficiency", "quality", "stability", "growthSpace", "riskPenalty"];

export const supportedWeightSearchObjectives: Array<{ entityType: EntityType; recommendationType: RecommendationType }> = [
  { entityType: "product", recommendationType: "add" },
  { entityType: "product", recommendationType: "downrank" },
  { entityType: "product", recommendationType: "investigate" },
  { entityType: "room", recommendationType: "add" },
  { entityType: "room", recommendationType: "downrank" },
  { entityType: "ad_material", recommendationType: "add" },
  { entityType: "ad_material", recommendationType: "downrank" },
  { entityType: "carrier", recommendationType: "watch" },
];

export function generateWeightConfigs(space: WeightSearchSpace): ScoringConfig[] {
  const configs: ScoringConfig[] = [];
  function walk(i: number, cur: Partial<ScoreWeights>) {
    if (configs.length >= space.maxConfigs) return;
    if (i === keys.length) {
      configs.push({
        configId: `search_${space.entityType}_${space.recommendationType}_${configs.length + 1}`,
        entityType: space.entityType,
        recommendationType: space.recommendationType,
        weights: cur as ScoreWeights,
        minSampleLevel: "low",
      });
      return;
    }
    for (const value of space.search[keys[i]] ?? [0]) walk(i + 1, { ...cur, [keys[i]]: value });
  }
  walk(0, {});
  return configs;
}

export function searchWeights(featureRows: FeatureRow[], outcomes: BalanceOutcome[], space: WeightSearchSpace): WeightSearchResult[] {
  return generateWeightConfigs(space)
    .map((config) => {
      const recs = recommend(featureRows, [config], 15);
      const bt = runBacktest(recs, outcomes).find((r) => r.horizon === "3d");
      const lift = bt?.metrics.topDecileLift ?? 0;
      const p5 = bt?.metrics.precisionAtK["5"] ?? 0;
      const sample = bt?.metrics.sampleCount ?? 0;
      const balancePenalty = Math.max(...Object.values(config.weights)) - Math.min(...Object.values(config.weights));
      const objectiveScore = lift + p5 + (sample >= 10 ? 0.2 : 0) - balancePenalty * 0.05;
      return {
        config,
        objectiveScore: Number(objectiveScore.toFixed(4)),
        reason: "Selected by train-window future lift, precision@5, sample coverage, and weight-balance interpretability.",
        metricsSampleCount: sample,
      };
    })
    .sort((a, b) => b.objectiveScore - a.objectiveScore);
}

export function searchWeightsTrainOnly(featureRows: FeatureRow[], outcomes: BalanceOutcome[], run: WeightSearchRun): WeightSearchResult[] {
  const trainFeatures = featureRows.filter((row) => row.dt <= run.trainEndDate);
  const trainOutcomes = outcomes.filter((row) => row.dt <= run.trainEndDate);
  return run.spaces.flatMap((space) => searchWeights(trainFeatures, trainOutcomes, space));
}
