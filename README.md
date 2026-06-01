# Live-Commerce Diagnosis Lab

A public, desensitized TypeScript lab for live-commerce operations intelligence.

This repository is designed to host two independent but related modules:

- **Realtime diagnosis**: future multi-room anomaly diagnosis and priority queues.
- **Balance validation**: current offline scoring, backtesting, and shadow reporting for resource-allocation candidates.

The current implementation starts with the **Balance Validation** module. It does not include private data, real Hue/Impala credentials, real table names, real store names, real anchors, real SKU information, or real business metrics.

## Balance Validation scope

The first version answers a narrow question:

> Do the available signals identify future outperformers, persistent underperformers, and operational blind spots better than random or naive rankings?

It intentionally does **not** claim causal uplift, incremental GMV, or automatic budget optimization. V0 only validates predictive signal through historical-style backtests and shadow reports.

## Repository layout

```text
apps/balance-validation/      CLI entry points and pipeline orchestration
packages/balance-engine/      feature extraction, scoring, backtest, weight search, reporting
examples/synthetic-data/      small stable synthetic fixtures only
examples/sample-configs/      readable default scoring configuration
examples/sample-outputs/      small committed sample report placeholders
outputs/                      runtime-generated artifacts, ignored by git
```

Future Hue/Impala deployment must be implemented behind adapters. Public code should keep using synthetic fixtures or generic file/query interfaces rather than direct private-system connectors.

## Quick start

```bash
npm install
npm run build
npm test
npm run demo:balance
```

The demo uses synthetic data only and writes runtime artifacts to `outputs/`. The `outputs/` directory is intentionally ignored and should not be committed.

## Independent CLI steps

Each step has a distinct responsibility:

```bash
npm run balance:build      # build canonical feature/outcome artifacts only
npm run balance:backtest   # read generated features/outcomes and run scoring + backtest only
npm run balance:report     # read recommendations/backtest summaries and render the report only
npm run demo:balance       # run the full synthetic V0 pipeline end-to-end
```

All commands accept `--out-dir <dir>` so tests and local experiments can write outside the default ignored `outputs/` directory.

## Scoring configuration

Default weights live in `examples/sample-configs/scoring-weights.default.json`. The scoring engine accepts a config object/config file and emits the selected `configId` on every recommendation, so weights can be backtested, replaced, and explained without hiding them in code.

## Data-quality guardrails

V0 explicitly guards known data limitations:

- Missing product-to-SKU mapping disables inventory/profit fields and adds `mapping_missing`.
- Discontinuous finance coverage disables profit/finance scoring and adds `finance_discontinuous`.
- Missing plan-level ad attribution prevents plan-level/budget-style recommendations and adds `plan_attribution_missing`.
- Zero denominators are represented as `null` ratios plus data-quality issues instead of `NaN`/`Infinity`.
- Small samples cannot become strong add/downrank recommendations.

## Backtest methodology

Feature ranks and normalizations are computed as of each scoring date. A row scored on day `t` can only use source records with `dt <= t`; future distribution values cannot change historical percentiles. Weight search selects candidates on a train window and reports metrics on a separate test window.

## Design principles

1. Private source systems are hidden behind adapters.
2. Synthetic fixtures are used for public demos.
3. Scoring weights are backtested instead of hard-coded forever.
4. Recommendations include score breakdowns, evidence, and data-quality flags.
5. Causal claims require future holdout experiments and are not asserted by V0.
