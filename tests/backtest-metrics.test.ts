import { describe, expect, it } from 'vitest';
import { ndcgAtK, precisionAtK, topDecileLift, runBacktest } from '../packages/balance-engine/src/backtest.js';
import { defaultWeightConfig } from '../packages/balance-engine/src/config.js';
import { buildCanonicalWideTables } from '../packages/balance-engine/src/canonical-wide-tables.js';
import { buildFeatureRowsAsOf } from '../packages/balance-engine/src/features.js';
import { buildOutcomes, generateSyntheticData } from '../packages/balance-engine/src/synthetic-data.js';
import { scoreFeature } from '../packages/balance-engine/src/scoring-engine.js';
import { searchWeights, supportedSearchTargets } from '../packages/balance-engine/src/weight-search.js';


describe('backtest metrics and weight search', () => {
  it('computes Precision@K, NDCG@K, and Top Decile Lift correctly', () => {
    expect(precisionAtK([1, 0, 1], 2)).toBe(0.5);
    expect(ndcgAtK([1, 0, 1], 3)).toBeGreaterThan(0);
    expect(topDecileLift([{ score: 3, outcome: 10 }, { score: 2, outcome: 1 }, { score: 1, outcome: 1 }])).toBeCloseTo(2.5);
  });

  it('weight search supports multiple target pairs and only tunes on train window', () => {
    const rows = generateSyntheticData();
    const wideRows = buildCanonicalWideTables(rows);
    const features = ['2026-01-01', '2026-01-02', '2026-01-10'].flatMap((dt) => buildFeatureRowsAsOf(wideRows, dt));
    const outcomes = buildOutcomes(rows);
    expect(supportedSearchTargets).toEqual(expect.arrayContaining([
      { entityType: 'product', recommendationType: 'add' },
      { entityType: 'product', recommendationType: 'maintain' },
      { entityType: 'ad_material', recommendationType: 'downrank' },
      { entityType: 'carrier', recommendationType: 'watch' }
    ]));
    const result = searchWeights(features, outcomes, defaultWeightConfig, { entityType: 'product', recommendationType: 'add' }, '2026-01-02');
    const testWindowRecommendations = features.filter((row) => row.dt >= '2026-01-10').map((row) => scoreFeature(row, 'add', result.config));
    expect(runBacktest(testWindowRecommendations, outcomes, 'product', 'add', '2026-01-10').evaluatedRows).toBeGreaterThan(0);
  });
});
