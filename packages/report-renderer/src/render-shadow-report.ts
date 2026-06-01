import type { BacktestResult, Recommendation } from '../../core/src/types.js';
import { renderBacktestSummary } from './render-backtest-summary.js';

export function renderShadowReport(recommendations: Recommendation[], backtests: BacktestResult[]): string {
  const warnings = [...new Set(recommendations.flatMap((row) => row.dataQuality.issues))];
  const topRecommendations = [...recommendations].sort((a, b) => b.score - a.score).slice(0, 8);
  return [
    '# Balance Validation V0 Shadow Report',
    '',
    'Predictive-only disclaimer: this V0 report validates predictive signal only. It does not claim causal uplift and does not perform automatic allocation.',
    '',
    renderBacktestSummary(backtests),
    '',
    '## Data quality warnings',
    '',
    warnings.length === 0 ? '- none' : warnings.map((warning) => `- ${warning}`).join('\n'),
    '',
    '## Shadow recommendations',
    '',
    ...topRecommendations.map((row) => `- ${row.dt} ${row.entityType}/${row.entityId}: ${row.recommendationType} (${row.strength}, score=${row.score.toFixed(3)}, config=${row.configId}) evidence=${row.evidence.join('; ')}`)
  ].join('\n');
}
