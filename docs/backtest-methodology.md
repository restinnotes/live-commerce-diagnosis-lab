# Backtest Methodology

At date `t`, feature rows are built only from same-day or historical synthetic canonical rows. Outcomes are evaluated on future `t+1`, `t+3`, and `t+7` windows. The acceptance tests include a leakage guard that fails if a feature row contains a source date after its scoring date.

Metrics include Precision@K, top-decile lift, NDCG@K, bottom-decile/risk hit rates, and sample counts. These are predictive validation metrics, not causal uplift estimates.
