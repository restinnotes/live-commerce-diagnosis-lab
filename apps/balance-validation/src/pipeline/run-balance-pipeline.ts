import fs from 'node:fs';
import path from 'node:path';
import { buildAllFeatureRows, assertNoFutureLeakage } from '../../../../packages/balance-engine/src/features.js';
import { buildOutcomes, generateSyntheticData } from '../../../../packages/balance-engine/src/synthetic-data.js';
import { buildRecommendations } from '../../../../packages/balance-engine/src/scoring-engine.js';
import { runBacktest } from '../../../../packages/balance-engine/src/backtest.js';
import { loadWeightConfig } from '../../../../packages/balance-engine/src/config.js';
import { renderShadowReport } from '../../../../packages/balance-engine/src/report.js';
import { searchWeights, supportedSearchTargets } from '../../../../packages/balance-engine/src/weight-search.js';
import type { BacktestResult, FeatureRow, Recommendation, WeightConfig } from '../../../../packages/balance-engine/src/types.js';

export interface PipelinePaths {
  outDir: string;
  configPath?: string;
}

function ensureOutDir(outDir: string): void {
  fs.mkdirSync(outDir, { recursive: true });
}

function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function buildFeatures(paths: PipelinePaths): { features: FeatureRow[]; outcomesPath: string; featuresPath: string } {
  ensureOutDir(paths.outDir);
  const raw = generateSyntheticData();
  const features = buildAllFeatureRows(raw);
  assertNoFutureLeakage(features);
  const outcomes = buildOutcomes(raw);
  const featuresPath = path.join(paths.outDir, 'balance_features.json');
  const outcomesPath = path.join(paths.outDir, 'balance_outcomes.json');
  writeJson(featuresPath, features);
  writeJson(outcomesPath, outcomes);
  return { features, outcomesPath, featuresPath };
}

export function runBacktestStep(paths: PipelinePaths): { recommendations: Recommendation[]; backtests: BacktestResult[]; recommendationsPath: string; backtestPath: string; selectedConfig: WeightConfig } {
  ensureOutDir(paths.outDir);
  const featuresPath = path.join(paths.outDir, 'balance_features.json');
  const outcomesPath = path.join(paths.outDir, 'balance_outcomes.json');
  const features = readJson<FeatureRow[]>(featuresPath);
  const outcomes = readJson<ReturnType<typeof buildOutcomes>>(outcomesPath);
  const baseConfig = loadWeightConfig(paths.configPath);
  const selected = searchWeights(features, outcomes, baseConfig, { entityType: 'product', recommendationType: 'add' }, '2026-01-09').config;
  const recommendations = buildRecommendations(features, selected);
  const backtests = supportedSearchTargets
    .filter((target) => selected[target.entityType]?.[target.recommendationType])
    .map((target) => runBacktest(recommendations, outcomes, target.entityType, target.recommendationType, '2026-01-10'));
  const recommendationsPath = path.join(paths.outDir, 'balance_recommendations.json');
  const backtestPath = path.join(paths.outDir, 'balance_backtest.json');
  writeJson(recommendationsPath, recommendations);
  writeJson(backtestPath, backtests);
  writeJson(path.join(paths.outDir, 'balance_selected_config.json'), selected);
  return { recommendations, backtests, recommendationsPath, backtestPath, selectedConfig: selected };
}

export function generateReportStep(paths: PipelinePaths): { reportPath: string; report: string } {
  ensureOutDir(paths.outDir);
  const recommendations = readJson<Recommendation[]>(path.join(paths.outDir, 'balance_recommendations.json'));
  const backtests = readJson<BacktestResult[]>(path.join(paths.outDir, 'balance_backtest.json'));
  const report = renderShadowReport(recommendations, backtests);
  const reportPath = path.join(paths.outDir, 'balance_shadow_report.md');
  fs.writeFileSync(reportPath, `${report}\n`);
  return { reportPath, report };
}

export function runBalancePipeline(paths: PipelinePaths): { reportPath: string } {
  buildFeatures(paths);
  runBacktestStep(paths);
  return generateReportStep(paths);
}
