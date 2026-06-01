import { percentileRank, safeDivide } from './math.js';
import type { DataQuality, FeatureRow, MetricRow } from './types.js';

export function dataQualityFor(row: MetricRow, rows: MetricRow[]): DataQuality {
  const issues: string[] = [];
  const hasMapping = row.hasSkuMapping === true;
  if (!hasMapping) issues.push('mapping_missing');
  const entityRows = rows.filter((candidate) => candidate.entityType === row.entityType && candidate.entityId === row.entityId);
  const financeCoverage = entityRows.length === 0 ? 0 : entityRows.filter((candidate) => candidate.financePresent).length / entityRows.length;
  const financeUsable = financeCoverage >= 0.95;
  if (!financeUsable) issues.push('finance_discontinuous');
  if (row.exposure === 0 || row.cost === 0 || row.orders === 0) issues.push('zero_denominator');
  const adMaterialRecommendationAllowed = row.adAttributionLevel === 'material' || row.adAttributionLevel === 'plan';
  const adPlanRecommendationAllowed = row.adAttributionLevel === 'plan';
  if (row.entityType === 'ad_material' && !adMaterialRecommendationAllowed) issues.push('ad_attribution_missing');
  if (row.entityType === 'ad_material' && !adPlanRecommendationAllowed) issues.push('plan_attribution_missing');
  return {
    inventoryUsable: hasMapping,
    profitUsable: hasMapping && financeUsable,
    financeUsable,
    adMaterialRecommendationAllowed,
    adPlanRecommendationAllowed,
    issues
  };
}

export function buildFeatureRowsAsOf(rows: MetricRow[], asOfDate: string): FeatureRow[] {
  const history = rows.filter((row) => row.dt <= asOfDate);
  const current = history.filter((row) => row.dt === asOfDate);
  return current.map((row) => {
    const cohort = history.filter((candidate) => candidate.entityType === row.entityType);
    const roi = safeDivide(row.gmv, row.cost);
    const conversionRate = safeDivide(row.orders, row.exposure);
    const refundRate = safeDivide(row.refunds, row.orders);
    const qualityValue = refundRate === null ? 0 : 1 - refundRate;
    const dataQuality = dataQualityFor(row, history);
    return {
      dt: asOfDate,
      sourceDate: row.dt,
      entityType: row.entityType,
      entityId: row.entityId,
      sampleSize: row.exposure,
      metrics: {
        exposure: row.exposure,
        gmv: row.gmv,
        orders: row.orders,
        refunds: row.refunds,
        cost: row.cost,
        roi,
        conversionRate,
        refundRate,
        inventory: dataQuality.inventoryUsable ? row.inventory : undefined,
        profit: dataQuality.profitUsable ? row.profit : undefined
      },
      ranks: {
        contribution: percentileRank(row.gmv, cohort.map((candidate) => candidate.gmv)),
        efficiency: percentileRank(roi ?? 0, cohort.map((candidate) => safeDivide(candidate.gmv, candidate.cost) ?? 0)),
        quality: percentileRank(qualityValue, cohort.map((candidate) => 1 - (safeDivide(candidate.refunds, candidate.orders) ?? 1))),
        stability: 1 - percentileRank(Math.abs(row.refunds - 1), cohort.map((candidate) => Math.abs(candidate.refunds - 1))),
        growthSpace: 1 - percentileRank(row.exposure, cohort.map((candidate) => candidate.exposure)),
        riskPenalty: percentileRank(refundRate ?? 1, cohort.map((candidate) => safeDivide(candidate.refunds, candidate.orders) ?? 1)),
        costRisk: percentileRank(row.cost, cohort.map((candidate) => candidate.cost))
      },
      dataQuality
    };
  });
}

export function buildAllFeatureRows(rows: MetricRow[]): FeatureRow[] {
  const dates = [...new Set(rows.map((row) => row.dt))].sort();
  return dates.flatMap((dt) => buildFeatureRowsAsOf(rows, dt));
}

export function assertNoFutureLeakage(features: FeatureRow[]): void {
  for (const feature of features) {
    if (feature.sourceDate > feature.dt) {
      throw new Error(`future leakage: sourceDate ${feature.sourceDate} after scoring date ${feature.dt}`);
    }
  }
}
