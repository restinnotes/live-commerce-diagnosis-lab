# Backtest Methodology

At date `t`, feature rows and percentile/rank normalization are built only from same-day or historical synthetic canonical rows (`dt <= t`). Outcomes are evaluated on future `t+1`, `t+3`, and `t+7` windows.

The leakage guard checks both source dates and normalization-window dates. This matters because using future distributions for percentile normalization can leak information even when each raw source row has `sourceDate <= scoringDate`.

Metrics include Precision@K, top-decile lift, NDCG@K, bottom-decile/risk hit rates, and sample counts. Weight search is run on a train window and must not use test-window rows for selecting weights. These are predictive validation metrics, not causal uplift estimates.
