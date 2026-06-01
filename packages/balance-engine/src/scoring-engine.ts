import { weightsFor } from './config.js';
import type { FeatureRow, Recommendation, RecommendationType, Strength, WeightConfig } from './types.js';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function dataQualitySeverity(feature: FeatureRow): number {
  return clamp01(feature.dataQuality.issues.length / 4);
}

function costConsumptionRisk(feature: FeatureRow): number {
  const lowRoiProxy = 1 - feature.ranks.efficiency;
  return clamp01((lowRoiProxy + feature.ranks.costRisk) / 2);
}

function strengthFor(recommendationType: RecommendationType, score: number, feature: FeatureRow): Strength {
  if ((recommendationType === 'add' || recommendationType === 'downrank') && feature.sampleSize < 30) return 'weak';
  if (recommendationType === 'watch') {
    return score >= 0.6 ? 'medium' : 'weak';
  }
  return score >= 0.45 ? 'strong' : score >= 0.2 ? 'medium' : 'weak';
}

function objectiveBreakdown(feature: FeatureRow, recommendationType: RecommendationType, config: WeightConfig): Record<string, number> {
  const weights = weightsFor(config, feature.entityType, recommendationType);
  const lowEfficiency = 1 - feature.ranks.efficiency;
  const lowQuality = 1 - feature.ranks.quality;
  const issueSeverity = dataQualitySeverity(feature);
  const costRisk = costConsumptionRisk(feature);
  const highContributionHighRisk = feature.ranks.contribution * feature.ranks.riskPenalty;
  const sampleInsufficient = feature.sampleSize < 30 ? 1 : 0;
  const signalConflict = Math.min(feature.ranks.efficiency, feature.ranks.riskPenalty) + Math.min(feature.ranks.contribution, lowQuality);

  switch (recommendationType) {
    case 'add':
      return {
        contribution: feature.ranks.contribution * weights.contribution,
        efficiency: feature.ranks.efficiency * weights.efficiency,
        quality: feature.ranks.quality * weights.quality,
        stability: feature.ranks.stability * weights.stability,
        growthSpace: feature.ranks.growthSpace * weights.growthSpace,
        riskPenalty: -feature.ranks.riskPenalty * weights.riskPenalty
      };
    case 'downrank':
      return {
        riskPenalty: feature.ranks.riskPenalty * weights.riskPenalty,
        lowEfficiency: lowEfficiency * weights.efficiency,
        lowQuality: lowQuality * weights.quality,
        costConsumptionRisk: costRisk * weights.contribution,
        highContributionConfidencePenalty: -feature.ranks.contribution * weights.stability
      };
    case 'investigate':
      return {
        riskPenalty: feature.ranks.riskPenalty * weights.riskPenalty,
        qualityAnomaly: lowQuality * weights.quality,
        dataQualityIssues: issueSeverity * weights.growthSpace,
        highContributionHighRisk: highContributionHighRisk * weights.contribution,
        metricDiscontinuity: (feature.dataQuality.issues.includes('zero_denominator') || feature.dataQuality.issues.includes('finance_discontinuous') ? 1 : 0) * weights.stability
      };
    case 'watch':
      return {
        sampleInsufficient: sampleInsufficient * weights.contribution,
        instability: (1 - feature.ranks.stability) * weights.stability,
        dataQualityIncomplete: issueSeverity * weights.quality,
        signalDirectionConflict: clamp01(signalConflict / 2) * weights.efficiency,
        riskDrift: feature.ranks.riskPenalty * weights.riskPenalty * 0.5
      };
  }
}

function evidenceFor(feature: FeatureRow, recommendationType: RecommendationType, scoreBreakdown: Record<string, number>): string[] {
  const base = [
    `roi=${feature.metrics.roi?.toFixed(2) ?? 'n/a'}`,
    `refundRate=${feature.metrics.refundRate?.toFixed(4) ?? 'n/a'}`,
    `qualityIssues=${feature.dataQuality.issues.join('|') || 'none'}`
  ];

  switch (recommendationType) {
    case 'add':
      return [...base, 'objective=add rewards high contribution/efficiency/quality/growth space and penalizes risk'];
    case 'downrank':
      return [...base, 'objective=downrank is driven by risk, low efficiency, low quality, and cost-consumption risk; high contribution reduces confidence'];
    case 'investigate':
      return [
        ...base,
        'objective=investigate because risk, data-quality issues, quality anomalies, or high-contribution/high-risk conflict require review rather than automatic add/downrank',
        `investigationDrivers=${Object.entries(scoreBreakdown).filter(([, value]) => value > 0).map(([key]) => key).join('|') || 'none'}`
      ];
    case 'watch':
      return [...base, 'objective=watch monitors insufficient sample, instability, incomplete data, or conflicting signal direction without strong add/downrank logic'];
  }
}

export function scoreFeature(feature: FeatureRow, recommendationType: RecommendationType, config: WeightConfig): Recommendation {
  const scoreBreakdown = objectiveBreakdown(feature, recommendationType, config);
  const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
  return {
    dt: feature.dt,
    entityType: feature.entityType,
    entityId: feature.entityId,
    recommendationType,
    strength: strengthFor(recommendationType, score, feature),
    score,
    configId: config.configId,
    scoreBreakdown,
    evidence: evidenceFor(feature, recommendationType, scoreBreakdown),
    dataQuality: feature.dataQuality
  };
}

export function buildRecommendations(features: FeatureRow[], config: WeightConfig): Recommendation[] {
  const recommendationTypes: RecommendationType[] = ['add', 'downrank', 'investigate', 'watch'];
  return features.flatMap((feature) => recommendationTypes
    .filter((type) => config[feature.entityType]?.[type])
    .map((type) => scoreFeature(feature, type, config))
    .filter((recommendation) => !(recommendation.entityType === 'ad_material' && recommendation.recommendationType === 'add' && !recommendation.dataQuality.adMaterialRecommendationAllowed))
  );
}
