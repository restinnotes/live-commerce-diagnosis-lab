import { describe, expect, it } from 'vitest';
import { renderBacktestSummary } from '../packages/report-renderer/src/render-backtest-summary.js';
import { renderShadowReport } from '../packages/report-renderer/src/render-shadow-report.js';
import type { BacktestResult, Recommendation } from '../packages/core/src/types.js';
import { completeDataQuality } from '../packages/core/src/data-quality.js';

const backtest: BacktestResult = {
  entityType: 'product',
  recommendationType: 'add',
  precisionAtK: 0.5,
  ndcgAtK: 0.7,
  topDecileLift: 1.2,
  evaluatedRows: 4
};

const recommendation: Recommendation = {
  dt: '2026-01-01',
  entityType: 'product',
  entityId: 'mock_product',
  recommendationType: 'maintain',
  strength: 'medium',
  score: 0.42,
  configId: 'default-v0',
  scoreBreakdown: { lowRisk: 0.2 },
  evidence: ['mock evidence'],
  dataQuality: { ...completeDataQuality, issues: ['mapping_missing'] }
};

describe('report renderer', () => {
  it('renders backtest summaries', () => {
    expect(renderBacktestSummary([backtest])).toContain('| product | add | 0.500 | 0.700 | 1.200 | 4 |');
  });

  it('renders predictive-only disclaimer, warnings, and evidence', () => {
    const report = renderShadowReport([recommendation], [backtest]);
    expect(report).toContain('Predictive-only disclaimer');
    expect(report).toContain('mapping_missing');
    expect(report).toContain('evidence=mock evidence');
  });
});
