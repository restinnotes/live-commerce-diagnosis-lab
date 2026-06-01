import type { BacktestResult } from '../../core/src/types.js';

export function renderBacktestSummary(backtests: BacktestResult[]): string {
  return [
    '## Backtest summary',
    '',
    '| Entity | Recommendation | Precision@K | NDCG@K | Top Decile Lift | Rows |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...backtests.map((row) => `| ${row.entityType} | ${row.recommendationType} | ${row.precisionAtK.toFixed(3)} | ${row.ndcgAtK.toFixed(3)} | ${row.topDecileLift.toFixed(3)} | ${row.evaluatedRows} |`)
  ].join('\n');
}
