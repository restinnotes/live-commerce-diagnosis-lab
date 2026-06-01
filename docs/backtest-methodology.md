# Backtest methodology

Balance Validation V0 evaluates whether scores are predictive in later windows. Percentile/rank features are computed as-of each scoring date, using only records with `dt <= asOfDate`. Weight search selects candidates on a train window only; the test window is reserved for reporting Precision@K, NDCG@K, and Top Decile Lift.
