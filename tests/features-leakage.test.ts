import { describe, expect, it } from 'vitest';
import { buildCanonicalWideTables, tableNamesIn } from '../packages/balance-engine/src/canonical-wide-tables.js';
import { assertNoFutureLeakage, buildAllFeatureRows, buildFeatureRowsAsOf } from '../packages/balance-engine/src/features.js';
import { generateSyntheticData } from '../packages/balance-engine/src/synthetic-data.js';


describe('canonical wide tables and feature leakage', () => {
  it('builds all public-safe canonical wide-table layers from synthetic rows', () => {
    const wideRows = buildCanonicalWideTables(generateSyntheticData());
    expect(tableNamesIn(wideRows)).toEqual([
      'ad_account_material_balance',
      'carrier_daily_balance',
      'product_live_balance',
      'room_daily_balance'
    ]);
    expect(wideRows.every((row) => row.entityId.includes('real') === false)).toBe(true);
  });

  it('builds features from canonical wide rows and rejects future leakage', () => {
    const wideRows = buildCanonicalWideTables(generateSyntheticData());
    const features = buildAllFeatureRows(wideRows);
    assertNoFutureLeakage(features);
    expect(features[0]).toHaveProperty('dataQuality');
    expect(() => assertNoFutureLeakage([{ ...features[0]!, sourceDate: '2026-12-31' }])).toThrow(/future leakage/);
  });

  it('does not let future finance coverage change historical data quality', () => {
    const dayOneRows = [
      { dt: '2026-01-01', entityType: 'product', entityId: 'stable_product', exposure: 100, gmv: 500, orders: 10, refunds: 0, cost: 50, hasSkuMapping: true, financePresent: true }
    ] as const;
    const futureRows = [
      ...dayOneRows,
      { dt: '2026-01-02', entityType: 'product', entityId: 'stable_product', exposure: 110, gmv: 520, orders: 11, refunds: 0, cost: 52, hasSkuMapping: true, financePresent: false },
      { dt: '2026-01-03', entityType: 'product', entityId: 'stable_product', exposure: 120, gmv: 540, orders: 12, refunds: 0, cost: 54, hasSkuMapping: true, financePresent: false }
    ] as const;

    const [dayOneFeatureBeforeFutureRows] = buildFeatureRowsAsOf(buildCanonicalWideTables([...dayOneRows]), '2026-01-01');
    const [dayOneFeatureAfterFutureRows] = buildFeatureRowsAsOf(buildCanonicalWideTables([...futureRows]), '2026-01-01');

    expect(dayOneFeatureBeforeFutureRows!.dataQuality.financeUsable).toBe(true);
    expect(dayOneFeatureBeforeFutureRows!.dataQuality.issues).not.toContain('finance_discontinuous');
    expect(dayOneFeatureAfterFutureRows!.dataQuality.financeUsable).toBe(dayOneFeatureBeforeFutureRows!.dataQuality.financeUsable);
    expect(dayOneFeatureAfterFutureRows!.dataQuality.issues).toEqual(dayOneFeatureBeforeFutureRows!.dataQuality.issues);
  });

  it('uses only as-of cohort values for percentile ranks', () => {
    const wideRows = buildCanonicalWideTables(generateSyntheticData());
    const dayOne = buildFeatureRowsAsOf(wideRows, '2026-01-01');
    const dayTwo = buildFeatureRowsAsOf(wideRows, '2026-01-02');
    expect(dayOne.every((feature) => feature.sourceDate <= '2026-01-01')).toBe(true);
    expect(dayTwo.every((feature) => feature.sourceDate <= '2026-01-02')).toBe(true);
  });
});
