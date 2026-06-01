# Daily Balance Shadow Report - 2026-05-23

## Executive Summary
- This is a shadow recommendation report for Balance Validation, not automatic action.
- V0 validates predictive signals only and does not claim causal uplift or budget optimization.
- Recommendations include evidence, score breakdowns, and data-quality warnings.

## 加码候选 / Add Candidates
- **product:product_4** score=88.55 rank=1; evidence: Score objective=add; Efficiency=95; Risk=12; data quality: mapping_missing
- **product:product_8** score=87.03 rank=2; evidence: Score objective=add; Efficiency=95; Risk=21; data quality: mapping_missing
- **product:product_44** score=78.15 rank=3; evidence: Score objective=add; Efficiency=81; Risk=21; data quality: mapping_missing
- **product:product_5** score=74.38 rank=4; evidence: Score objective=add; Efficiency=95; Risk=34; data quality: ok
- **product:product_64** score=72.62 rank=5; evidence: Score objective=add; Efficiency=75; Risk=10; data quality: mapping_missing
- **product:product_84** score=71.88 rank=6; evidence: Score objective=add; Efficiency=85; Risk=21; data quality: mapping_missing
- **product:product_9** score=71.42 rank=7; evidence: Score objective=add; Efficiency=95; Risk=28; data quality: ok
- **product:product_48** score=70.78 rank=8; evidence: Score objective=add; Efficiency=70; Risk=21; data quality: mapping_missing

## 降权候选 / Downrank Candidates
- **room:room_9** score=90.75 rank=1; evidence: Score objective=downrank; Efficiency=33; Risk=93; data quality: ok
- **room:room_14** score=88.25 rank=2; evidence: Score objective=downrank; Efficiency=48; Risk=88; data quality: ok
- **room:room_18** score=86.25 rank=3; evidence: Score objective=downrank; Efficiency=43; Risk=73; data quality: ok
- **room:room_19** score=86 rank=4; evidence: Score objective=downrank; Efficiency=78; Risk=83; data quality: ok
- **room:room_7** score=83 rank=5; evidence: Score objective=downrank; Efficiency=63; Risk=98; data quality: ok
- **room:room_8** score=82.25 rank=6; evidence: Score objective=downrank; Efficiency=18; Risk=78; data quality: ok
- **room:room_17** score=77.5 rank=7; evidence: Score objective=downrank; Efficiency=28; Risk=63; data quality: ok
- **room:room_12** score=75 rank=8; evidence: Score objective=downrank; Efficiency=3; Risk=57; data quality: ok

## 排查候选 / Investigate Candidates
- **product:product_24** score=84.33 rank=1; evidence: Score objective=investigate; Efficiency=76; Risk=100; data quality: mapping_missing
- **product:product_26** score=82.53 rank=2; evidence: Score objective=investigate; Efficiency=30; Risk=95; data quality: ok
- **product:product_7** score=81.8 rank=3; evidence: Score objective=investigate; Efficiency=95; Risk=76; data quality: ok
- **product:product_95** score=80.73 rank=4; evidence: Score objective=investigate; Efficiency=21; Risk=86; data quality: ok
- **product:product_39** score=80.58 rank=5; evidence: Score objective=investigate; Efficiency=89; Risk=87; data quality: ok
- **product:product_79** score=79.08 rank=6; evidence: Score objective=investigate; Efficiency=84; Risk=76; data quality: ok
- **product:product_22** score=78.18 rank=7; evidence: Score objective=investigate; Efficiency=48; Risk=100; data quality: ok
- **product:product_59** score=77.25 rank=8; evidence: Score objective=investigate; Efficiency=88; Risk=76; data quality: ok

## 观察 / Watch List
- **carrier:live** score=71 rank=1; evidence: Score objective=watch; Efficiency=90; Risk=40; data quality: ok
- **carrier:product_card** score=43 rank=2; evidence: Score objective=watch; Efficiency=50; Risk=40; data quality: ok

## Backtest Summary
- add 1d: precision@5=1.00, topDecileLift=1.48, sample=80
- add 3d: precision@5=1.00, topDecileLift=1.51, sample=80
- add 7d: precision@5=1.00, topDecileLift=1.55, sample=80
- investigate 1d: precision@5=0.60, topDecileLift=0.71, sample=40
- investigate 3d: precision@5=0.60, topDecileLift=0.71, sample=40
- investigate 7d: precision@5=0.60, topDecileLift=0.71, sample=40
- maintain 1d: precision@5=0.60, topDecileLift=1.26, sample=31
- maintain 3d: precision@5=0.60, topDecileLift=1.25, sample=31

## Weight Config Summary
- Best config: search_product_add_5; objective=2.442. Selected by future lift, precision@5, sample coverage, and weight-balance interpretability.
- Candidate configs evaluated: 40.

## Data Quality Warnings
- mapping_missing: product-to-SKU mapping missing; inventory/profit excluded
- ad_attribution_missing: plan/campaign/attribution window unavailable; no plan-level optimization

## Methodology Notes
- At date t, scoring uses only rows available at or before t and evaluates future t+1/t+3/t+7 windows.
- The report is predictive validation, not causal uplift proof. Holdout experiments/action logs are required before causal claims.
