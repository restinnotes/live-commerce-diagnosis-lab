import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateSyntheticData } from "../../../../packages/balance-engine/src/synthetic-data.js";
import { buildWideTables } from "../../../../packages/balance-engine/src/build-wide-tables.js";
import { buildAllFeatureRows, type FeatureRow } from "../../../../packages/balance-engine/src/feature-builder.js";
import { recommend, defaultConfigs } from "../../../../packages/balance-engine/src/scoring-engine.js";
import { buildOutcomes } from "../../../../packages/balance-engine/src/outcome-builder.js";
import { assertNoFutureLeakage, runBacktest, type BacktestResult } from "../../../../packages/balance-engine/src/backtest-engine.js";
import { searchWeightsTrainOnly, type WeightSearchRun } from "../../../../packages/balance-engine/src/weight-search.js";
import { renderShadowReport } from "../../../../packages/report-renderer/src/render-shadow-report.js";
import { renderBacktestSummary } from "../../../../packages/report-renderer/src/render-backtest-summary.js";
import type { AdBalanceRow, BalanceOutcome, BalanceRecommendation } from "../../../../packages/core/src/types.js";

export const defaultOutputDate = "2026-05-23";
export const defaultTrainEndDate = "2026-05-20";

export interface PipelineOptions {
  outDir?: string;
  outputDate?: string;
  trainEndDate?: string;
}

export function parseCliOptions(argv = process.argv.slice(2)): PipelineOptions {
  const options: PipelineOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--out-dir") options.outDir = argv[++i];
    if (argv[i] === "--date") options.outputDate = argv[++i];
    if (argv[i] === "--train-end") options.trainEndDate = argv[++i];
  }
  return options;
}

function outputPaths(outDir = "outputs", outputDate = defaultOutputDate) {
  return {
    outDir,
    features: path.join(outDir, "balance_features.json"),
    outcomes: path.join(outDir, "balance_outcomes.json"),
    recommendations: path.join(outDir, `balance_recommendations_${outputDate}.json`),
    backtest: path.join(outDir, `balance_backtest_summary_${outputDate}.json`),
    weights: path.join(outDir, `weight_search_results_${outputDate}.json`),
    report: path.join(outDir, `balance_shadow_report_${outputDate}.md`),
  };
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export function buildSyntheticFeaturesAndOutcomes() {
  const data = generateSyntheticData();
  const tables = buildWideTables(data);
  const features = buildAllFeatureRows(tables);
  assertNoFutureLeakage(features);
  const horizons = ["1d", "3d", "7d"] as const;
  const outcomes = horizons.flatMap((horizon) => [
    ...buildOutcomes(tables.rooms, "room", horizon),
    ...buildOutcomes(tables.products, "product", horizon),
    ...buildOutcomes(tables.carriers, "carrier", horizon),
    ...buildOutcomes(tables.ads.filter((a: AdBalanceRow) => a.entityType === "ad_account"), "ad_account", horizon),
    ...buildOutcomes(tables.ads.filter((a: AdBalanceRow) => a.entityType === "ad_material"), "ad_material", horizon),
  ]);
  return { features, outcomes };
}

export async function buildFeatures(options: PipelineOptions = {}) {
  const paths = outputPaths(options.outDir, options.outputDate);
  const { features, outcomes } = buildSyntheticFeaturesAndOutcomes();
  await mkdir(paths.outDir, { recursive: true });
  await writeFile(paths.features, JSON.stringify(features, null, 2));
  await writeFile(paths.outcomes, JSON.stringify(outcomes, null, 2));
  return { featureRows: features.length, outcomeRows: outcomes.length, outDir: paths.outDir };
}

export async function runBacktestStep(options: PipelineOptions = {}) {
  const outputDate = options.outputDate ?? defaultOutputDate;
  const trainEndDate = options.trainEndDate ?? defaultTrainEndDate;
  const paths = outputPaths(options.outDir, outputDate);
  const features = await readJson<FeatureRow[]>(paths.features);
  const outcomes = await readJson<BalanceOutcome[]>(paths.outcomes);
  assertNoFutureLeakage(features);

  const recommendationDates = [outputDate, "2026-05-20", "2026-05-21", "2026-05-22"];
  const recommendations = recommend(features, defaultConfigs()).filter((rec) => recommendationDates.includes(rec.dt));
  const backtests = runBacktest(recommendations, outcomes.filter((outcome) => outcome.dt >= "2026-05-21"));
  const weightSearchRun: WeightSearchRun = {
    trainEndDate,
    spaces: [
      {
        entityType: "product",
        recommendationType: "add",
        maxConfigs: 40,
        search: {
          contribution: [0.1, 0.2, 0.3],
          efficiency: [0.2, 0.3, 0.4],
          quality: [0.1, 0.2],
          stability: [0, 0.1],
          growthSpace: [0.1, 0.2],
          riskPenalty: [0.2, 0.35],
        },
      },
    ],
  };
  const weights = searchWeightsTrainOnly(features, outcomes, weightSearchRun);
  await mkdir(paths.outDir, { recursive: true });
  await writeFile(paths.recommendations, JSON.stringify(recommendations.filter((rec) => rec.dt === outputDate), null, 2));
  await writeFile(paths.backtest, JSON.stringify(renderBacktestSummary(backtests), null, 2));
  await writeFile(paths.weights, JSON.stringify(weights, null, 2));
  return { recommendations: recommendations.filter((rec) => rec.dt === outputDate).length, backtests: backtests.length, weightConfigs: weights.length };
}

export async function generateReportStep(options: PipelineOptions = {}) {
  const outputDate = options.outputDate ?? defaultOutputDate;
  const paths = outputPaths(options.outDir, outputDate);
  const recommendations = await readJson<BalanceRecommendation[]>(paths.recommendations);
  const backtestSummary = await readJson<{ results: BacktestResult[] }>(paths.backtest);
  const weights = await readJson<any[]>(paths.weights);
  const report = renderShadowReport(outputDate, recommendations, backtestSummary.results, weights);
  await writeFile(paths.report, report);
  return { report: paths.report };
}

export async function runBalancePipeline(options: PipelineOptions = {}) {
  const build = await buildFeatures(options);
  const backtest = await runBacktestStep(options);
  const report = await generateReportStep(options);
  return { outputDate: options.outputDate ?? defaultOutputDate, ...build, ...backtest, ...report };
}
