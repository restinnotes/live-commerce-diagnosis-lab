import type { BacktestResult, Recommendation } from './types.js';

export function renderShadowReport(recommendations: Recommendation[], backtests: BacktestResult[]): string {
  const warnings = [...new Set(recommendations.flatMap((row) => row.dataQuality.issues))];
  const topRecommendations = [...recommendations].sort((a, b) => b.score - a.score).slice(0, 8);
  return [
    '# Balance Validation V0 Shadow Report',
    '',
    'This V0 report validates predictive signal only. It does not claim causal uplift and does not perform automatic allocation.',
    '',
    '## Backtest summary',
    '',
    '| Entity | Recommendation | Precision@K | NDCG@K | Top Decile Lift | Rows |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...backtests.map((row) => `| ${row.entityType} | ${row.recommendationType} | ${row.precisionAtK.toFixed(3)} | ${row.ndcgAtK.toFixed(3)} | ${row.topDecileLift.toFixed(3)} | ${row.evaluatedRows} |`),
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
