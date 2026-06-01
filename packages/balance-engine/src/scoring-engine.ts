import { weightsFor } from './config.js';
import type { FeatureRow, Recommendation, RecommendationType, WeightConfig } from './types.js';

export function scoreFeature(feature: FeatureRow, recommendationType: RecommendationType, config: WeightConfig): Recommendation {
  const weights = weightsFor(config, feature.entityType, recommendationType);
  const scoreBreakdown = {
    contribution: feature.ranks.contribution * weights.contribution,
    efficiency: feature.ranks.efficiency * weights.efficiency,
    quality: feature.ranks.quality * weights.quality,
    stability: feature.ranks.stability * weights.stability,
    growthSpace: feature.ranks.growthSpace * weights.growthSpace,
    riskPenalty: -feature.ranks.riskPenalty * weights.riskPenalty
  };
  const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
  const evidence = [
    `roi=${feature.metrics.roi?.toFixed(2) ?? 'n/a'}`,
    `conversion=${feature.metrics.conversionRate?.toFixed(4) ?? 'n/a'}`,
    `qualityIssues=${feature.dataQuality.issues.join('|') || 'none'}`
  ];
  const strength = feature.sampleSize < 30 ? 'weak' : score >= 0.35 ? 'strong' : score >= 0.15 ? 'medium' : 'weak';
  return {
    dt: feature.dt,
    entityType: feature.entityType,
    entityId: feature.entityId,
    recommendationType,
    strength,
    score,
    configId: config.configId,
    scoreBreakdown,
    evidence,
    dataQuality: feature.dataQuality
  };
}

export function buildRecommendations(features: FeatureRow[], config: WeightConfig): Recommendation[] {
  const recommendationTypes: RecommendationType[] = ['add', 'downrank', 'investigate', 'watch'];
  return features.flatMap((feature) => recommendationTypes
    .filter((type) => config[feature.entityType]?.[type])
    .map((type) => scoreFeature(feature, type, config))
    .filter((recommendation) => !(recommendation.entityType === 'ad_material' && recommendation.recommendationType === 'add' && !recommendation.dataQuality.adPlanRecommendationAllowed))
  );
}
