import { scoreFeature } from './scoring-engine.js';
import { runBacktest } from './backtest.js';
import type { EntityType, FeatureRow, OutcomeRow, RecommendationType, ScoreWeights, WeightConfig } from './types.js';

export const supportedSearchTargets: Array<{ entityType: EntityType; recommendationType: RecommendationType }> = [
  { entityType: 'product', recommendationType: 'add' },
  { entityType: 'product', recommendationType: 'downrank' },
  { entityType: 'product', recommendationType: 'investigate' },
  { entityType: 'room', recommendationType: 'add' },
  { entityType: 'room', recommendationType: 'downrank' },
  { entityType: 'ad_material', recommendationType: 'add' },
  { entityType: 'ad_material', recommendationType: 'downrank' },
  { entityType: 'carrier', recommendationType: 'watch' }
];

const candidates: ScoreWeights[] = [
  { contribution: 0.2, efficiency: 0.3, quality: 0.2, stability: 0.1, growthSpace: 0.2, riskPenalty: 0.3 },
  { contribution: 0.1, efficiency: 0.45, quality: 0.15, stability: 0.1, growthSpace: 0.2, riskPenalty: 0.25 },
  { contribution: 0.25, efficiency: 0.25, quality: 0.25, stability: 0.1, growthSpace: 0.15, riskPenalty: 0.35 }
];

export function searchWeights(
  features: FeatureRow[],
  outcomes: OutcomeRow[],
  baseConfig: WeightConfig,
  target: { entityType: EntityType; recommendationType: RecommendationType },
  trainEndDate: string
): { config: WeightConfig; trainScore: number } {
  const trainFeatures = features.filter((feature) => feature.dt <= trainEndDate && feature.entityType === target.entityType);
  let best = baseConfig;
  let bestScore = -Infinity;
  candidates.forEach((weights, index) => {
    const config: WeightConfig = {
      ...baseConfig,
      configId: `${baseConfig.configId}-search-${index}`,
      [target.entityType]: {
        ...baseConfig[target.entityType],
        [target.recommendationType]: { weights }
      }
    };
    const recommendations = trainFeatures.map((feature) => scoreFeature(feature, target.recommendationType, config));
    const result = runBacktest(recommendations, outcomes, target.entityType, target.recommendationType, '0000-00-00');
    const score = result.ndcgAtK + result.precisionAtK;
    if (score > bestScore) {
      bestScore = score;
      best = config;
    }
  });
  return { config: best, trainScore: bestScore };
}
