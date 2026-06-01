# Live-Commerce Diagnosis Lab

A public, desensitized TypeScript lab for live-commerce operations intelligence.

This repository is designed to host two independent but related modules:

- **Realtime diagnosis**: multi-room anomaly diagnosis and priority queues.
- **Balance validation**: offline scoring, backtesting, and shadow reporting for resource allocation candidates.

The current implementation starts with the **balance validation** module. It does not include private data, real Hue/Impala credentials, real table names, real store names, real anchors, or real SKU information.

## Balance validation scope

The first version answers a narrow question:

> Do the available signals identify future outperformers, persistent underperformers, and operational blind spots better than random or naive rankings?

It intentionally does **not** claim causal uplift or automatic budget optimization. The system first validates scoring signals through historical-style backtests and shadow reports.

## Quick start

```bash
npm install
npm run demo:balance
npm test
```

The demo uses synthetic data only and writes outputs to `outputs/`.

## Design principles

1. Private source systems are hidden behind adapters.
2. Synthetic fixtures are used for public demos.
3. Scoring weights are backtested instead of hard-coded forever.
4. Recommendations include score breakdowns, evidence, and data quality flags.
5. Causal claims require future holdout experiments and are not asserted by V0.
