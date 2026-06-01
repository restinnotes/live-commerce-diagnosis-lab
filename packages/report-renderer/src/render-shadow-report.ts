import type { BalanceRecommendation } from "../../core/src/types.js";
import type { BacktestResult } from "../../balance-engine/src/backtest-engine.js";
import type { WeightSearchResult } from "../../balance-engine/src/weight-search.js";

export function renderShadowReport(dt: string, recs: BalanceRecommendation[], backtests: BacktestResult[], weights: WeightSearchResult[]): string {
  const by = (type: string) => recs.filter((rec) => rec.dt === dt && rec.recommendationType === type).slice(0, 8);
  const section = (title: string, items: BalanceRecommendation[]) =>
    `## ${title}\n` +
    (items.length
      ? items
          .map(
            (rec) =>
              `- **${rec.entityType}:${rec.entityId}** score=${rec.score} strength=${rec.strength} rank=${rec.rank}; evidence: ${rec.evidence
                .map((e) => `${e.label}=${e.value}`)
                .join("; ")}; data quality: ${rec.dataQuality.issues.map((i) => i.code).join(", ") || "ok"}`,
          )
          .join("\n")
      : "- No candidates.") +
    "\n";
  const warnings = [...new Set(recs.flatMap((rec) => rec.dataQuality.issues.map((issue) => `${issue.code}: ${issue.message}`)))];

  return `# Daily Balance Shadow Report - ${dt}\n\n## Executive Summary\n- This is a shadow recommendation report for Balance Validation, not automatic action.\n- V0 validates predictive signals only and does not claim causal uplift or budget optimization.\n- Recommendations include evidence, score breakdowns, strength, and data-quality warnings.\n\n${section("加码候选 / Add Candidates", by("add"))}\n${section("降权候选 / Downrank Candidates", by("downrank"))}\n${section("排查候选 / Investigate Candidates", by("investigate"))}\n${section("观察 / Watch List", by("watch"))}\n## Backtest Summary\n${backtests
    .slice(0, 8)
    .map(
      (bt) =>
        `- ${bt.recommendationType} ${bt.horizon}: precision@5=${bt.metrics.precisionAtK["5"]?.toFixed(2)}, topDecileLift=${bt.metrics.topDecileLift?.toFixed(2) ?? "n/a"}, sample=${bt.metrics.sampleCount}`,
    )
    .join("\n")}\n\n## Weight Config Summary\n- Best config: ${weights[0]?.config.configId ?? "n/a"}; objective=${weights[0]?.objectiveScore ?? "n/a"}. ${weights[0]?.reason ?? ""}\n- Candidate configs evaluated: ${weights.length}.\n\n## Data Quality Warnings\n${warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- No warnings."}\n\n## Methodology Notes\n- At date t, scoring and normalization use only data available at or before t and evaluate future t+1/t+3/t+7 windows.\n- The report is predictive validation, not causal uplift proof. Holdout experiments/action logs are required before causal claims.\n- V0 may output material-level shadow candidates, but must not output plan-level budget amounts or automatic allocation.\n`;
}
