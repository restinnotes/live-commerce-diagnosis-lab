import { percentileRank } from '../../core/src/math.js';
import type { DataQuality, FeatureRow } from '../../core/src/types.js';
import type { BalanceWideRow } from './canonical-wide-tables.js';

export function dataQualityFor(row: BalanceWideRow): DataQuality {
  return row.dataQuality;
}

export function buildFeatureRowsAsOf(wideRows: BalanceWideRow[], asOfDate: string): FeatureRow[] {
  const history = wideRows.filter((row) => row.dt <= asOfDate);
  const current = history.filter((row) => row.dt === asOfDate);
  return current.map((row) => {
    const cohort = history.filter((candidate) => candidate.entityType === row.entityType);
    const qualityValue = row.refundRate === null ? 0 : 1 - row.refundRate;
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
        roi: row.roi,
        conversionRate: row.conversionRate,
        refundRate: row.refundRate,
        inventory: row.inventory,
        profit: row.profit
      },
      ranks: {
        contribution: percentileRank(row.gmv, cohort.map((candidate) => candidate.gmv)),
        efficiency: percentileRank(row.roi ?? 0, cohort.map((candidate) => candidate.roi ?? 0)),
        quality: percentileRank(qualityValue, cohort.map((candidate) => 1 - (candidate.refundRate ?? 1))),
        stability: 1 - percentileRank(Math.abs(row.refunds - 1), cohort.map((candidate) => Math.abs(candidate.refunds - 1))),
        growthSpace: 1 - percentileRank(row.exposure, cohort.map((candidate) => candidate.exposure)),
        riskPenalty: percentileRank(row.refundRate ?? 1, cohort.map((candidate) => candidate.refundRate ?? 1)),
        costRisk: percentileRank(row.cost, cohort.map((candidate) => candidate.cost))
      },
      dataQuality: row.dataQuality
    };
  });
}

export function buildAllFeatureRows(wideRows: BalanceWideRow[]): FeatureRow[] {
  const dates = [...new Set(wideRows.map((row) => row.dt))].sort();
  return dates.flatMap((dt) => buildFeatureRowsAsOf(wideRows, dt));
}

export function assertNoFutureLeakage(features: FeatureRow[]): void {
  for (const feature of features) {
    if (feature.sourceDate > feature.dt) {
      throw new Error(`future leakage: sourceDate ${feature.sourceDate} after scoring date ${feature.dt}`);
    }
  }
}
