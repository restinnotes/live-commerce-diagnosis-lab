import type { BacktestResult, EntityType, OutcomeRow, Recommendation, RecommendationType } from './types.js';

export function precisionAtK(labels: number[], k: number): number {
  const top = labels.slice(0, k);
  if (top.length === 0) return 0;
  return top.filter((label) => label > 0).length / top.length;
}

export function ndcgAtK(labels: number[], k: number): number {
  const dcg = labels.slice(0, k).reduce((sum, label, index) => sum + label / Math.log2(index + 2), 0);
  const ideal = [...labels].sort((a, b) => b - a).slice(0, k).reduce((sum, label, index) => sum + label / Math.log2(index + 2), 0);
  return ideal === 0 ? 0 : dcg / ideal;
}

export function topDecileLift(scoredOutcomes: { score: number; outcome: number }[]): number {
  if (scoredOutcomes.length === 0) return 0;
  const sorted = [...scoredOutcomes].sort((a, b) => b.score - a.score);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.1));
  const topAverage = sorted.slice(0, topCount).reduce((sum, row) => sum + row.outcome, 0) / topCount;
  const allAverage = sorted.reduce((sum, row) => sum + row.outcome, 0) / sorted.length;
  return allAverage === 0 ? 0 : topAverage / allAverage;
}

export function runBacktest(
  recommendations: Recommendation[],
  outcomes: OutcomeRow[],
  entityType: EntityType,
  recommendationType: RecommendationType,
  testStartDate: string,
  k = 5
): BacktestResult {
  const scoped = recommendations.filter((row) => row.entityType === entityType && row.recommendationType === recommendationType && row.dt >= testStartDate);
  const joined = scoped.map((recommendation) => {
    const outcome = outcomes.find((candidate) => candidate.dt === recommendation.dt && candidate.entityType === recommendation.entityType && candidate.entityId === recommendation.entityId);
    return outcome ? { score: recommendation.score, outcome: outcome.futureGmv } : undefined;
  }).filter((row): row is { score: number; outcome: number } => Boolean(row));
  const sorted = [...joined].sort((a, b) => b.score - a.score);
  const threshold = [...joined].sort((a, b) => b.outcome - a.outcome)[Math.max(0, Math.floor(joined.length * 0.25) - 1)]?.outcome ?? Infinity;
  const labels = sorted.map((row) => row.outcome >= threshold ? 1 : 0);
  return {
    entityType,
    recommendationType,
    precisionAtK: precisionAtK(labels, k),
    ndcgAtK: ndcgAtK(labels, k),
    topDecileLift: topDecileLift(joined),
    evaluatedRows: joined.length
  };
}
