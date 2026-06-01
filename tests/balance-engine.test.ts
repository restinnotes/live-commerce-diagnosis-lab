import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFeatureRowsAsOf } from '../packages/balance-engine/src/features.js';
import { generateSyntheticData, buildOutcomes } from '../packages/balance-engine/src/synthetic-data.js';
import { defaultWeightConfig } from '../packages/balance-engine/src/config.js';
import { buildRecommendations, scoreFeature } from '../packages/balance-engine/src/scoring-engine.js';
import { ndcgAtK, precisionAtK, runBacktest, topDecileLift } from '../packages/balance-engine/src/backtest.js';
import { runBalancePipeline } from '../apps/balance-validation/src/pipeline/run-balance-pipeline.js';
import { searchWeights, supportedSearchTargets } from '../packages/balance-engine/src/weight-search.js';
import type { MetricRow } from '../packages/balance-engine/src/types.js';

describe('as-of feature construction and data-quality guards', () => {
  it('does not let future global percentile normalization change historical ranks', () => {
    const rows: MetricRow[] = [
      { dt: '2026-01-01', entityType: 'product', entityId: 'p1', exposure: 100, gmv: 100, orders: 10, refunds: 1, cost: 50, hasSkuMapping: true, financePresent: true },
      { dt: '2026-01-01', entityType: 'product', entityId: 'p2', exposure: 100, gmv: 200, orders: 10, refunds: 1, cost: 50, hasSkuMapping: true, financePresent: true }
    ];
    const baseline = buildFeatureRowsAsOf(rows, '2026-01-01').find((row) => row.entityId === 'p1')!.ranks.contribution;
    rows.push({ dt: '2026-01-02', entityType: 'product', entityId: 'future', exposure: 100, gmv: 100000, orders: 10, refunds: 1, cost: 50, hasSkuMapping: true, financePresent: true });
    const afterFuture = buildFeatureRowsAsOf(rows, '2026-01-01').find((row) => row.entityId === 'p1')!.ranks.contribution;
    expect(afterFuture).toBe(baseline);
  });

  it('missing SKU mapping disables inventory and profit features', () => {
    const [feature] = buildFeatureRowsAsOf([
      { dt: '2026-01-01', entityType: 'product', entityId: 'p1', exposure: 100, gmv: 100, orders: 10, refunds: 1, cost: 50, inventory: 3, profit: 9, hasSkuMapping: false, financePresent: true }
    ], '2026-01-01');
    expect(feature!.dataQuality.inventoryUsable).toBe(false);
    expect(feature!.dataQuality.profitUsable).toBe(false);
    expect(feature!.metrics.inventory).toBeUndefined();
    expect(feature!.metrics.profit).toBeUndefined();
  });

  it('finance discontinuity disables profit scoring', () => {
    const rows: MetricRow[] = [
      { dt: '2026-01-01', entityType: 'product', entityId: 'p1', exposure: 100, gmv: 100, orders: 10, refunds: 1, cost: 50, profit: 10, hasSkuMapping: true, financePresent: true },
      { dt: '2026-01-02', entityType: 'product', entityId: 'p1', exposure: 100, gmv: 100, orders: 10, refunds: 1, cost: 50, profit: 10, hasSkuMapping: true, financePresent: false }
    ];
    const [feature] = buildFeatureRowsAsOf(rows, '2026-01-02');
    expect(feature!.dataQuality.financeUsable).toBe(false);
    expect(feature!.metrics.profit).toBeUndefined();
  });

  it('material ad attribution allows material-level add shadow recommendation but missing attribution does not', () => {
    const [materialFeature] = buildFeatureRowsAsOf([
      { dt: '2026-01-01', entityType: 'ad_material', entityId: 'm1', exposure: 100, gmv: 200, orders: 10, refunds: 1, cost: 50, hasSkuMapping: false, financePresent: true, adAttributionLevel: 'material' }
    ], '2026-01-01');
    const [missingFeature] = buildFeatureRowsAsOf([
      { dt: '2026-01-01', entityType: 'ad_material', entityId: 'm2', exposure: 100, gmv: 200, orders: 10, refunds: 1, cost: 50, hasSkuMapping: false, financePresent: true, adAttributionLevel: 'none' }
    ], '2026-01-01');
    expect(buildRecommendations([materialFeature!], defaultWeightConfig).some((row) => row.recommendationType === 'add')).toBe(true);
    expect(buildRecommendations([missingFeature!], defaultWeightConfig).some((row) => row.recommendationType === 'add')).toBe(false);
  });

  it('zero denominator creates dataQuality issue and no NaN/Infinity', () => {
    const [feature] = buildFeatureRowsAsOf([
      { dt: '2026-01-01', entityType: 'product', entityId: 'p1', exposure: 0, gmv: 100, orders: 0, refunds: 0, cost: 0, hasSkuMapping: true, financePresent: true }
    ], '2026-01-01');
    expect(feature!.dataQuality.issues).toContain('zero_denominator');
    expect(feature!.metrics.roi).toBeNull();
    expect(JSON.stringify(feature)).not.toMatch(/NaN|Infinity/);
  });

  it('sample too small cannot become strong add/downrank', () => {
    const [feature] = buildFeatureRowsAsOf([
      { dt: '2026-01-01', entityType: 'product', entityId: 'p1', exposure: 10, gmv: 1000, orders: 9, refunds: 0, cost: 1, hasSkuMapping: true, financePresent: true }
    ], '2026-01-01');
    expect(scoreFeature(feature!, 'add', defaultWeightConfig).strength).not.toBe('strong');
    expect(scoreFeature(feature!, 'downrank', defaultWeightConfig).strength).not.toBe('strong');
  });



  it('objective-specific scoring rewards high ROI low refund objects for add, not downrank', () => {
    const features = buildFeatureRowsAsOf([
      { dt: '2026-01-01', entityType: 'product', entityId: 'winner', exposure: 80, gmv: 800, orders: 20, refunds: 0, cost: 80, hasSkuMapping: true, financePresent: true },
      { dt: '2026-01-01', entityType: 'product', entityId: 'baseline', exposure: 80, gmv: 160, orders: 10, refunds: 4, cost: 100, hasSkuMapping: true, financePresent: true }
    ], '2026-01-01');
    const winner = features.find((feature) => feature.entityId === 'winner')!;
    const add = scoreFeature(winner, 'add', defaultWeightConfig);
    const downrank = scoreFeature(winner, 'downrank', defaultWeightConfig);
    expect(add.score).toBeGreaterThan(downrank.score);
    expect(downrank.strength).not.toBe('strong');
  });

  it('objective-specific scoring rewards low ROI high refund objects for downrank/investigate, not add', () => {
    const features = buildFeatureRowsAsOf([
      { dt: '2026-01-01', entityType: 'product', entityId: 'bad', exposure: 120, gmv: 80, orders: 10, refunds: 6, cost: 240, hasSkuMapping: true, financePresent: true },
      { dt: '2026-01-01', entityType: 'product', entityId: 'good', exposure: 120, gmv: 900, orders: 30, refunds: 0, cost: 90, hasSkuMapping: true, financePresent: true }
    ], '2026-01-01');
    const bad = features.find((feature) => feature.entityId === 'bad')!;
    const add = scoreFeature(bad, 'add', defaultWeightConfig);
    const downrank = scoreFeature(bad, 'downrank', defaultWeightConfig);
    const investigate = scoreFeature(bad, 'investigate', defaultWeightConfig);
    expect(downrank.score).toBeGreaterThan(add.score);
    expect(investigate.score).toBeGreaterThan(add.score);
  });

  it('high GMV high refund objects score as investigate instead of direct add', () => {
    const features = buildFeatureRowsAsOf([
      { dt: '2026-01-01', entityType: 'product', entityId: 'riskyStar', exposure: 300, gmv: 1200, orders: 30, refunds: 12, cost: 140, hasSkuMapping: true, financePresent: true },
      { dt: '2026-01-01', entityType: 'product', entityId: 'cleanStar', exposure: 300, gmv: 900, orders: 30, refunds: 0, cost: 120, hasSkuMapping: true, financePresent: true }
    ], '2026-01-01');
    const riskyStar = features.find((feature) => feature.entityId === 'riskyStar')!;
    const add = scoreFeature(riskyStar, 'add', defaultWeightConfig);
    const investigate = scoreFeature(riskyStar, 'investigate', defaultWeightConfig);
    expect(investigate.score).toBeGreaterThan(add.score);
    expect(investigate.evidence.join(' ')).toContain('review rather than automatic add/downrank');
  });

  it('sample too small is watchable or weak, not strong add/downrank', () => {
    const [feature] = buildFeatureRowsAsOf([
      { dt: '2026-01-01', entityType: 'product', entityId: 'tiny', exposure: 10, gmv: 1000, orders: 9, refunds: 0, cost: 1, hasSkuMapping: true, financePresent: true }
    ], '2026-01-01');
    expect(scoreFeature(feature!, 'add', defaultWeightConfig).strength).toBe('weak');
    expect(scoreFeature(feature!, 'downrank', defaultWeightConfig).strength).toBe('weak');
    expect(scoreFeature(feature!, 'watch', defaultWeightConfig).scoreBreakdown).toHaveProperty('sampleInsufficient');
  });

  it('recommendation contains evidence, scoreBreakdown, dataQuality, and configId', () => {
    const rows = generateSyntheticData();
    const [feature] = buildFeatureRowsAsOf(rows, '2026-01-03');
    const recommendation = scoreFeature(feature!, 'add', defaultWeightConfig);
    expect(recommendation.configId).toBe(defaultWeightConfig.configId);
    expect(recommendation.evidence.length).toBeGreaterThan(0);
    expect(Object.keys(recommendation.scoreBreakdown)).toContain('efficiency');
    expect(recommendation.dataQuality).toHaveProperty('issues');
  });
});

describe('backtest, weight search, and runtime outputs', () => {
  it('computes Precision@K, NDCG@K, and Top Decile Lift correctly', () => {
    expect(precisionAtK([1, 0, 1], 2)).toBe(0.5);
    expect(ndcgAtK([1, 0, 1], 3)).toBeGreaterThan(0);
    expect(topDecileLift([{ score: 3, outcome: 10 }, { score: 2, outcome: 1 }, { score: 1, outcome: 1 }])).toBeCloseTo(2.5);
  });

  it('weight search supports multiple target pairs and only tunes on train window', () => {
    const rows = generateSyntheticData();
    const features = ['2026-01-01', '2026-01-02', '2026-01-10'].flatMap((dt) => buildFeatureRowsAsOf(rows, dt));
    const outcomes = buildOutcomes(rows);
    expect(supportedSearchTargets).toEqual(expect.arrayContaining([
      { entityType: 'product', recommendationType: 'add' },
      { entityType: 'ad_material', recommendationType: 'downrank' },
      { entityType: 'carrier', recommendationType: 'watch' }
    ]));
    const result = searchWeights(features, outcomes, defaultWeightConfig, { entityType: 'product', recommendationType: 'add' }, '2026-01-02');
    const testWindowRecommendations = features.filter((row) => row.dt >= '2026-01-10').map((row) => scoreFeature(row, 'add', result.config));
    expect(runBacktest(testWindowRecommendations, outcomes, 'product', 'add', '2026-01-10').evaluatedRows).toBeGreaterThan(0);
  });

  it('demo writes runtime artifacts to caller-selected ignored output directory', () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'balance-demo-'));
    const result = runBalancePipeline({ outDir });
    expect(fs.existsSync(result.reportPath)).toBe(true);
    expect(fs.readdirSync(outDir)).toEqual(expect.arrayContaining([
      'balance_features.json',
      'balance_outcomes.json',
      'balance_recommendations.json',
      'balance_backtest.json',
      'balance_shadow_report.md'
    ]));
  });
});
