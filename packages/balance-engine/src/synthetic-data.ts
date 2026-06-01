import { buildCanonicalWideTables, type BalanceWideRow } from './canonical-wide-tables.js';
import type { OutcomeRow } from '../../core/src/types.js';
import type { MetricRow } from './types.js';

function day(n: number): string {
  return `2026-01-${String(n).padStart(2, '0')}`;
}

export function generateSyntheticData(): MetricRow[] {
  const rows: MetricRow[] = [];
  const entityTypes = ['product', 'room', 'ad_material', 'carrier'] as const;
  for (let d = 1; d <= 14; d += 1) {
    for (const entityType of entityTypes) {
      for (let i = 1; i <= 8; i += 1) {
        const exposure = 80 + d * 8 + i * 15;
        const efficiency = i <= 3 ? 1.7 : i <= 5 ? 1.0 : 0.55;
        const cost = Math.round(exposure * (entityType === 'ad_material' ? 0.35 : 0.08));
        const gmv = Math.round(exposure * efficiency * (1 + d / 80));
        rows.push({
          dt: day(d),
          entityType,
          entityId: `${entityType}_${i}`,
          exposure,
          gmv,
          orders: Math.max(1, Math.round(gmv / 35)),
          refunds: i >= 7 ? 4 : i === 6 ? 2 : 1,
          cost,
          inventory: 100 - d - i,
          profit: Math.round(gmv * 0.18 - cost),
          hasSkuMapping: entityType === 'product' || entityType === 'carrier',
          financePresent: d <= 13,
          adAttributionLevel: entityType === 'ad_material' ? 'material' : 'none'
        });
      }
    }
  }
  return rows;
}

export function buildOutcomes(rows: MetricRow[], horizonDays = 3): OutcomeRow[] {
  return rows.map((row) => {
    const currentDay = Number(row.dt.slice(-2));
    const future = rows.filter((candidate) =>
      candidate.entityType === row.entityType &&
      candidate.entityId === row.entityId &&
      Number(candidate.dt.slice(-2)) > currentDay &&
      Number(candidate.dt.slice(-2)) <= currentDay + horizonDays
    );
    const futureGmv = future.reduce((sum, item) => sum + item.gmv, 0);
    const futureCost = future.reduce((sum, item) => sum + item.cost, 0);
    return {
      dt: row.dt,
      entityType: row.entityType,
      entityId: row.entityId,
      futureGmv,
      futureRoi: futureCost === 0 ? 0 : futureGmv / futureCost
    };
  });
}

export function generateSyntheticCanonicalWideTables(): BalanceWideRow[] {
  return buildCanonicalWideTables(generateSyntheticData());
}
