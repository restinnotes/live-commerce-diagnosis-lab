import { describe, expect, it } from 'vitest';
import { defaultWeightConfig } from '../packages/balance-engine/src/config.js';
import { scoreFeature } from '../packages/balance-engine/src/scoring-engine.js';
import { featuresFromSyntheticRows } from './test-helpers.js';


describe('scoring', () => {
  it('recommendation type includes maintain and scores stable entities', () => {
    const features = featuresFromSyntheticRows([
      { dt: '2026-01-01', entityType: 'product', entityId: 'steady', exposure: 120, gmv: 800, orders: 25, refunds: 0, cost: 100, hasSkuMapping: true, financePresent: true },
      { dt: '2026-01-01', entityType: 'product', entityId: 'baseline', exposure: 100, gmv: 500, orders: 12, refunds: 2, cost: 100, hasSkuMapping: true, financePresent: true }
    ]);
    const steady = features.find((feature) => feature.entityId === 'steady')!;
    const maintain = scoreFeature(steady, 'maintain', defaultWeightConfig);
    expect(maintain.evidence.join(' ')).toContain('objective=maintain');
    expect(maintain.scoreBreakdown).toHaveProperty('lowRisk');
  });

  it('rewards high ROI low refund objects for add, not downrank', () => {
    const features = featuresFromSyntheticRows([
      { dt: '2026-01-01', entityType: 'product', entityId: 'winner', exposure: 80, gmv: 800, orders: 20, refunds: 0, cost: 80, hasSkuMapping: true, financePresent: true },
      { dt: '2026-01-01', entityType: 'product', entityId: 'baseline', exposure: 80, gmv: 160, orders: 10, refunds: 4, cost: 100, hasSkuMapping: true, financePresent: true }
    ]);
    const winner = features.find((feature) => feature.entityId === 'winner')!;
    expect(scoreFeature(winner, 'add', defaultWeightConfig).score).toBeGreaterThan(scoreFeature(winner, 'downrank', defaultWeightConfig).score);
  });

  it('rewards low ROI high refund objects for downrank/investigate, not add', () => {
    const features = featuresFromSyntheticRows([
      { dt: '2026-01-01', entityType: 'product', entityId: 'bad', exposure: 120, gmv: 80, orders: 10, refunds: 6, cost: 240, hasSkuMapping: true, financePresent: true },
      { dt: '2026-01-01', entityType: 'product', entityId: 'good', exposure: 120, gmv: 900, orders: 30, refunds: 0, cost: 90, hasSkuMapping: true, financePresent: true }
    ]);
    const bad = features.find((feature) => feature.entityId === 'bad')!;
    expect(scoreFeature(bad, 'downrank', defaultWeightConfig).score).toBeGreaterThan(scoreFeature(bad, 'add', defaultWeightConfig).score);
    expect(scoreFeature(bad, 'investigate', defaultWeightConfig).score).toBeGreaterThan(scoreFeature(bad, 'add', defaultWeightConfig).score);
  });

  it('keeps small samples weak for add/downrank', () => {
    const [feature] = featuresFromSyntheticRows([
      { dt: '2026-01-01', entityType: 'product', entityId: 'tiny', exposure: 10, gmv: 1000, orders: 9, refunds: 0, cost: 1, hasSkuMapping: true, financePresent: true }
    ]);
    expect(scoreFeature(feature!, 'add', defaultWeightConfig).strength).toBe('weak');
    expect(scoreFeature(feature!, 'downrank', defaultWeightConfig).strength).toBe('weak');
  });
});
