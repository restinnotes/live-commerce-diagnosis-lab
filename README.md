# Live-Commerce Diagnosis Lab

A public, desensitized TypeScript lab for live-commerce operations intelligence.

This repository is designed to host two independent but related modules:

- **Realtime diagnosis**: future multi-room anomaly diagnosis and priority queues.
- **Balance validation**: current offline scoring, backtesting, weight search, and shadow reporting for resource-allocation candidates.

The current implementation focuses on **Balance Validation / 平衡验证系统**. It contains synthetic data only and does not include private credentials, internal table names, real stores, real anchors, real products, SKU codes, screenshots, or raw business metrics.

## Balance validation scope

The first version answers a narrow question:

> Do available signals identify future outperformers, persistent underperformers, and operational blind spots better than random or naive rankings?

It intentionally does **not** claim causal uplift, automatic budget optimization, or plan-level allocation. Recommendations are shadow recommendations that require human review and later holdout/action-log validation.

## Implemented pipeline

```text
synthetic data
→ canonical wide tables
→ feature extraction and percentile normalization
→ objective-specific scoring
→ historical-style backtest
→ weight search
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
examples/                     # generated synthetic fixtures and sample configs
outputs/                      # generated demo reports
```

## Quick start

```bash
npm install
npm run demo:balance
npm test
```

The demo generates synthetic patterns such as stable high contributors, low-exposure/high-conversion products, high-click/low-pay products, high-refund products, high-cost/low-ROI ad materials, high-ROI/low-spend ad materials, volatile rooms, sample-too-small rows, mapping-missing rows, and ad-attribution warnings.

Expected demo outputs:

```text
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

## Design principles

1. Private source systems are hidden behind adapters.
2. Synthetic fixtures are used for public demos.
3. Scoring weights are backtested instead of hard-coded forever.
4. Recommendations include score breakdowns, evidence, and data-quality flags.
5. Missing product-to-SKU mapping disables inventory/profit features without blocking product funnel scoring.
6. Missing ad attribution prevents plan-level optimization recommendations.
7. Causal claims require future holdout experiments and are not asserted by V0.
