# Live-Commerce Diagnosis Lab

A public, desensitized TypeScript lab for live-commerce operations intelligence.

This repository is designed to host two independent but related modules:

- **Realtime diagnosis**: future multi-room anomaly diagnosis and priority queues.
- **Balance validation**: current offline scoring, backtesting, weight search, and shadow reporting for resource-allocation candidates.

The current implementation focuses on **Balance Validation / 平衡验证系统**. It contains synthetic data only and does not include private credentials, internal table names, real stores, real anchors, real products, SKU codes, screenshots, or raw business metrics.

## Balance validation scope

The first version answers a narrow question:

> Do available signals identify future outperformers, persistent underperformers, and operational blind spots better than random or naive rankings?

It intentionally does **not** claim causal uplift, automatic budget optimization, plan-level budget amounts, or automatic allocation. Recommendations are shadow recommendations that require human review and later holdout/action-log validation.

## Implemented pipeline

```text
synthetic data
→ canonical wide tables
→ as-of-date feature extraction and percentile normalization
→ objective-specific scoring
→ historical-style backtest
→ train-window weight search
→ Markdown/JSON shadow report
```

## Project structure

```text
apps/balance-validation/      # CLI and pipeline orchestration
packages/core/                # shared types, math, ranking, data quality
packages/adapters/            # QueryClient interface, mock/file adapters, Hue stub
packages/balance-engine/      # wide tables, features, scoring, outcomes, backtest, weight search
packages/report-renderer/     # Markdown and JSON report rendering
docs/                         # methodology, data contract, privacy docs
examples/synthetic-data/      # small fixed synthetic fixtures only
examples/sample-outputs/      # small fixed sample output only
outputs/                      # runtime-generated artifacts; ignored by git
```

## Quick start

```bash
npm install
npm run demo:balance
npm test
```

The demo generates synthetic patterns such as stable high contributors, low-exposure/high-conversion products, high-click/low-pay products, high-refund products, high-cost/low-ROI ad materials, high-ROI/low-spend ad materials, volatile rooms, sample-too-small rows, mapping-missing rows, and ad-attribution warnings.

Runtime demo outputs are written under `outputs/` and are intentionally ignored by git. Use `examples/sample-outputs/` for a stable, small report-shape example.

Expected demo outputs:

```text
outputs/balance_features.json
outputs/balance_outcomes.json
outputs/balance_shadow_report_2026-05-23.md
outputs/balance_recommendations_2026-05-23.json
outputs/balance_backtest_summary_2026-05-23.json
outputs/weight_search_results_2026-05-23.json
```

## Available commands

```bash
npm run build
npm run demo:balance
npm run balance:build
npm run balance:backtest
npm run balance:report
npm test
```

CLI responsibilities are intentionally split:

- `balance:build` builds synthetic canonical/features/outcomes into the configured output directory.
- `balance:backtest` reads features/outcomes and writes recommendations, backtest summary, and weight-search results.
- `balance:report` reads recommendations/backtest/weight-search results and renders the Markdown report.
- `demo:balance` runs the full sequence.

Each balance command accepts `--out-dir <path>`; report/backtest should be run after build when using a custom directory.

## Design principles

1. Private source systems are hidden behind adapters.
2. Synthetic fixtures are used for public demos.
3. Scoring weights are config-driven and backtested instead of hard-coded forever.
4. Recommendations include score breakdowns, evidence, data-quality flags, and strength.
5. Missing product-to-SKU mapping disables inventory/profit features without blocking product funnel scoring.
6. Missing plan/campaign ad attribution prevents plan-level budget optimization, but material-level shadow recommendations are allowed when material attribution is available.
7. Feature normalization is as-of-date: date `t` scoring uses only distributions available at or before `t`.
8. Future Hue/Impala/Hive access must be implemented only behind the adapter interface and must not commit private hosts, credentials, table names, screenshots, or raw exports.
9. Causal claims require future holdout experiments and are not asserted by V0.
