import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runBalancePipeline } from '../apps/balance-validation/src/pipeline/run-balance-pipeline.js';


describe('runtime pipeline outputs', () => {
  it('demo writes runtime artifacts to caller-selected ignored output directory', () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'balance-demo-'));
    const result = runBalancePipeline({ outDir });
    expect(fs.existsSync(result.reportPath)).toBe(true);
    expect(fs.readdirSync(outDir)).toEqual(expect.arrayContaining([
      'balance_canonical_wide_tables.json',
      'balance_features.json',
      'balance_outcomes.json',
      'balance_recommendations.json',
      'balance_backtest.json',
      'balance_shadow_report.md'
    ]));
  });
});
