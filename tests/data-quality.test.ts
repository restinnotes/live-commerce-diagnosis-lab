import { describe, expect, it } from 'vitest';
import { completeDataQuality, dataQualitySeverity, mergeDataQuality } from '../packages/core/src/data-quality.js';
import { featuresFromSyntheticRows } from './test-helpers.js';


describe('data quality', () => {
  it('flags missing mappings and zero denominators before feature scoring', () => {
    const [feature] = featuresFromSyntheticRows([
      { dt: '2026-01-01', entityType: 'product', entityId: 'missing', exposure: 0, gmv: 10, orders: 0, refunds: 0, cost: 0, hasSkuMapping: false, financePresent: false }
    ]);
    expect(feature!.dataQuality.issues).toEqual(expect.arrayContaining(['mapping_missing', 'finance_discontinuous', 'zero_denominator']));
    expect(feature!.metrics.roi).toBeNull();
  });

  it('exposes shared core data-quality helpers', () => {
    const merged = mergeDataQuality(completeDataQuality, { ...completeDataQuality, issues: ['mapping_missing'], profitUsable: false });
    expect(merged.profitUsable).toBe(false);
    expect(dataQualitySeverity(merged)).toBeGreaterThan(0);
  });
});
