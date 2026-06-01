# Balance Validation Engineering Spec

> Repository: `live-commerce-diagnosis-lab`  
> Current focus: **Balance Validation / 平衡验证系统**  
> Status: engineering handoff for Codex  
> Language/runtime target: TypeScript + Node.js  
> Public repository requirement: synthetic data only, no private source credentials, no real business data.

---

## 0. One-sentence objective

Build an offline **balance validation system** for live-commerce operations. The system should not claim automatic causal optimization. Its first job is to prove whether resource-balance signals can identify future outperformers, persistent underperformers, and operational blind spots through backtesting and shadow reports.

In short:

```text
source data / synthetic fixtures
→ canonical wide tables
→ feature extraction
→ scoring
→ weight search
→ historical-style backtest
→ shadow recommendations
→ recommendation outcome review
```

This is **not** the realtime anomaly diagnosis module. It is a separate module inside the same long-term repository.

---

## 1. Product positioning

This repository will eventually contain multiple modules for live-commerce operations intelligence:

```text
live-commerce-diagnosis-lab/
  apps/realtime-diagnosis/      # future: 打地鼠 / multi-room realtime anomaly queue
  apps/balance-validation/      # current: 平衡验证 / offline scoring + backtesting
  packages/...                  # shared engines, types, adapters, reports
```

The current implementation should focus only on `apps/balance-validation` and shared packages needed by it.

### 1.1 What this module is

A system that answers:

```text
Do our scoring signals identify objects that are likely to perform better or worse in the future?
Are there resource-misallocation candidates worth showing to operators?
Can we backtest weighting schemes instead of hard-coding arbitrary weights?
Can we generate a daily shadow report with evidence and data-quality warnings?
```

### 1.2 What this module is not

Do not implement these in V0:

```text
No realtime dashboard.
No automatic budget allocation.
No causal/uplift claim.
No RL / bandit optimizer.
No real Hue login.
No real Impala/JDBC connector.
No real Douyin / Qianchuan API connector.
No private table names, credentials, store names, anchor names, product names, SKU codes, or raw business metrics.
No BI mega-dashboard.
```

The module should be called **Balance Validation**, not **Balance Optimization**, because V0 only validates signals and produces shadow recommendations.

---

## 2. Core reasoning behind the design

Balance is fundamentally a counterfactual problem:

```text
If we gave more traffic/budget/exposure to A instead of B, what would have happened?
```

Without randomized holdout or action logs, V0 cannot prove causal incremental GMV. Therefore V0 must prove lower-level but still valuable claims first:

1. **Predictive value**: high-scoring candidates outperform random or naive candidates in future windows.
2. **Persistent-risk detection**: low-scoring candidates continue to show low efficiency, high refund, or high cost.
3. **Resource-misallocation evidence**: some high-efficiency objects are underexposed, and some low-efficiency objects consume excessive resources.
4. **Human blind-spot evidence**: after action logs are added, compare system suggestions with actual human actions and outcomes.

Only after V0/V1 proves predictive value should later versions attempt holdout tests, DiD, uplift, or budget optimization.

---

## 3. Public-data and security constraints

This is a public GitHub repository. Implement strict desensitization:

### 3.1 Forbidden content

Do not commit:

```text
Hue URL or internal host.
Database address.
Username / password / token.
Real SQL containing internal table names.
Real store, brand, anchor, creator, product, SKU, plan, campaign, material names.
Real GMV, cost, ROI, refund, inventory, order, user count, or settlement values.
Screenshots from internal systems.
RPA-downloaded source files.
```

### 3.2 Allowed public content

Commit:

```text
Synthetic data.
Generic source table names.
Adapter interfaces.
Mock and CSV adapters.
Config-driven field mappings.
Scoring/backtesting/reporting engines.
Tests.
Architecture and methodology docs.
```

### 3.3 Generic source table aliases

Use generic aliases in public code:

```text
source_live_room_hourly
source_live_product_metrics
source_transaction_overview
source_carrier_composition
source_ad_account_metrics
source_ad_material_metrics
source_finance_metrics_optional
source_inventory_optional
```

Do not hard-code real internal table names. If SQL templates are added, use `{{ source_table_alias }}` placeholders.

---

## 4. Data-source assumption for private deployment

Private deployment will eventually read from Hue/Impala/Hive `ods_rpa`-style analytical tables. Public code must not directly connect to Hue. Instead, implement a thin query interface:

```ts
export interface QueryClient {
  query<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T[]>;
}
```

Implement only:

```text
MockQueryClient
CsvQueryClient or JsonFileQueryClient
```

Leave `HueQueryClient` as a documented interface stub or TODO, not implemented.

---

## 5. Known data limitations that must be represented in code

The system must model these constraints explicitly:

### 5.1 Product/SKU mapping is not guaranteed

Douyin-side product IDs and merchant inventory SKU/spec IDs may not join directly. V0 must not use inventory/cost/profit features unless a valid mapping table exists.

Required behavior:

```text
If product-to-SKU mapping is missing:
  dataQuality.inventoryUsable = false
  dataQuality.profitUsable = false
  add dataQuality.issue: "mapping_missing"
  exclude inventory/cost/profit from main score
  still allow product funnel scoring: exposure, click, pay, refund
```

### 5.2 Finance data may be discontinuous

Finance/settlement data can be useful later, but if the date coverage is discontinuous, it must not enter the main score.

Required behavior:

```text
If finance coverage is below configured threshold:
  dataQuality.financeUsable = false
  exclude settlement/profit/fee-ratio from main score
  allow finance fields only as optional evidence
```

### 5.3 Ad attribution is not plan-level in V0

Ad data may have paid GMV / ROI at account or material level, but lack plan_id/campaign_id/attribution_window.

Required behavior:

```text
V0 may score ad account or material efficiency.
V0 must not output plan-level budget optimization.
V0 must not output exact budget amount recommendations.
V0 may output: expand-candidate / downrank-candidate / investigate.
```

---

## 6. Required project structure

Implement the project as a monorepo-friendly TypeScript repository.

Recommended tree:

```text
live-commerce-diagnosis-lab/
  README.md
  package.json
  tsconfig.json
  vitest.config.ts

  docs/
    balance-validation-engineering-spec.md
    backtest-methodology.md
    data-contract.md
    privacy-and-desensitization.md

  apps/
    balance-validation/
      README.md
      src/
        cli/
          demo-balance.ts
          build-features.ts
          run-backtest.ts
          generate-report.ts
        pipeline/
          run-balance-pipeline.ts

  packages/
    core/
      src/
        types.ts
        date.ts
        math.ts
        ranking.ts
        data-quality.ts

    adapters/
      src/
        query-client.ts
        mock-query-client.ts
        json-file-adapter.ts
        csv-file-adapter.ts

    balance-engine/
      src/
        schemas.ts
        build-wide-tables.ts
        feature-builder.ts
        feature-normalizer.ts
        scoring-engine.ts
        recommendation-engine.ts
        outcome-builder.ts
        backtest-engine.ts
        weight-search.ts
        metrics.ts

    report-renderer/
      src/
        render-shadow-report.ts
        render-backtest-summary.ts

  examples/
    synthetic-data/
      room_daily.raw.json
      product_live.raw.json
      carrier_daily.raw.json
      ad_material.raw.json
    sample-configs/
      scoring-weights.default.json
      weight-search-space.json
      backtest.config.json

  outputs/
    .gitkeep

  tests/
    scoring-engine.test.ts
    backtest-engine.test.ts
    leakage-guard.test.ts
    data-quality.test.ts
    report-renderer.test.ts
```

If Codex chooses a slightly different structure, it must still preserve the same module separation: adapters, wide table build, feature build, scoring, backtest, report, tests.

---

## 7. Entity types

Support these entity types in V0:

```ts
export type EntityType =
  | "room"
  | "product"
  | "carrier"
  | "ad_account"
  | "ad_material";
```

### 7.1 Entity semantics

```text
room:
  anchor/room-level daily or hourly aggregated performance.

product:
  live-room product-level funnel and transaction performance.
  V0 product scoring can use exposure/click/pay/refund, but not inventory/cost unless mapping exists.

carrier:
  channel/carrier structure such as live, short-video, product-card, search, other.

ad_account:
  account-level ad performance.

ad_material:
  material/video-level ad performance.
```

---

## 8. Canonical wide tables

The system should build canonical wide tables from raw rows. In public demo, raw rows come from synthetic JSON.

### 8.1 `room_daily_balance`

Grain:

```text
date × room_id
```

Required canonical fields:

```ts
export interface RoomDailyBalanceRow {
  dt: string;
  roomId: string;
  anchorId?: string;
  anchorName?: string; // synthetic only
  shopId?: string;

  payAmt: number;
  netPayAmt: number;
  orderCnt: number;
  payUserCnt: number;
  cost: number;
  refundAmt: number;
  refundRate: number;
  gmvCostRatio: number | null;
  gpm?: number | null;
  liveHours?: number | null;

  abnormalCount?: number;
  warningCount?: number;
  recoveryRateAfterWarning?: number | null;

  dataQuality: DataQuality;
}
```

Primary questions answered:

```text
Which rooms are stable contributors?
Which rooms are high-cost low-output?
Which rooms repeatedly need intervention?
Which rooms deserve protection, add, downrank, investigate, or watch?
```

### 8.2 `product_live_balance`

Grain:

```text
date × room_id × product_id
```

Required canonical fields:

```ts
export interface ProductLiveBalanceRow {
  dt: string;
  roomId: string;
  productId: string;
  productName?: string; // synthetic only
  shopId?: string;

  productExposure: number;
  productClick: number;
  productCtr: number | null;
  productPayAmt: number;
  productNetPayAmt: number;
  productOrderCnt: number;
  productPayUserCnt: number;
  productClickDealRate: number | null;
  productRefundAmt: number;
  productRefundRate: number | null;

  exposureShareInRoom?: number | null;
  payShareInRoom?: number | null;

  skuId?: string | null;
  inventoryQty?: number | null;
  costPrice?: number | null;

  dataQuality: DataQuality;
}
```

Required rule:

```text
If skuId is missing or mapping coverage is not trusted, inventoryQty and costPrice must not affect score.
```

Primary questions answered:

```text
Which products have low exposure but high conversion?
Which products have high clicks but poor pay conversion?
Which products have high GMV but high refund pressure?
Which products match specific rooms better than average?
```

### 8.3 `carrier_daily_balance`

Grain:

```text
date × shop_id × carrier_type
```

Required canonical fields:

```ts
export type CarrierType = "live" | "short_video" | "product_card" | "search" | "other";

export interface CarrierDailyBalanceRow {
  dt: string;
  shopId: string;
  carrierType: CarrierType;

  payAmt: number;
  netPayAmt: number;
  orderCnt: number;
  payUserCnt: number;
  cost?: number;
  refundAmt?: number;
  refundRate?: number | null;
  contributionShare?: number | null;
  netContributionShare?: number | null;

  dataQuality: DataQuality;
}
```

Primary questions answered:

```text
Is live-commerce contribution high but quality weak?
Is product-card/search undervalued?
Is short-video bringing low-quality transaction volume?
```

### 8.4 `ad_account_material_balance`

Support both ad account and ad material rows.

Grain:

```text
date × ad_account_id
or
date × ad_material_id
```

Required canonical fields:

```ts
export interface AdBalanceRow {
  dt: string;
  entityType: "ad_account" | "ad_material";
  entityId: string;
  shopId?: string;

  cost: number;
  paidGmv?: number | null;
  overallPaymentRoi?: number | null;
  paidOrderCnt?: number | null;
  followupRoi?: number | null;
  costShare?: number | null;

  planId?: null;       // V0 should not rely on this
  campaignId?: null;   // V0 should not rely on this
  attributionWindow?: null;

  dataQuality: DataQuality;
}
```

Required rule:

```text
If planId/campaignId/attributionWindow are unavailable, never emit plan-level optimization.
```

Primary questions answered:

```text
Which accounts/materials are high-cost low-ROI?
Which materials are high-ROI but low-cost-share expansion candidates?
Which materials become worse after follow-up spending?
```

---

## 9. Data quality model

Implement a shared data-quality object.

```ts
export type DataQualitySeverity = "info" | "warning" | "critical";

export interface DataQualityIssue {
  code:
    | "missing_required_field"
    | "zero_denominator"
    | "sample_too_small"
    | "mapping_missing"
    | "finance_discontinuous"
    | "ad_attribution_missing"
    | "outlier_clipped"
    | "unknown";
  severity: DataQualitySeverity;
  message: string;
  field?: string;
}

export interface DataQuality {
  usable: boolean;
  sampleSize?: number;
  sampleLevel?: "none" | "low" | "medium" | "high";
  inventoryUsable?: boolean;
  profitUsable?: boolean;
  financeUsable?: boolean;
  adAttributionUsable?: boolean;
  issues: DataQualityIssue[];
}
```

Behavior requirements:

```text
Sample too small should not crash scoring.
Critical missing fields should exclude the row from strong add/downrank recommendations.
Mapping missing should disable inventory/profit features but not product funnel features.
Finance discontinuity should disable finance-based features.
Ad attribution missing should disable plan-level and paid-attribution-specific decisions.
```

---

## 10. Feature groups

Every entity is scored using feature groups. Use normalized scores in [0, 100] where possible.

```ts
export interface FeatureGroupScores {
  contribution: number;
  efficiency: number;
  quality: number;
  stability: number;
  growthSpace: number;
  riskPenalty: number;
}
```

### 10.1 Contribution features

Purpose: how much the object contributes.

Examples:

```text
net pay amount percentile
pay amount percentile
pay user count percentile
order count percentile
contribution share
```

### 10.2 Efficiency features

Purpose: output per input/resource.

Examples:

```text
gmv-cost ratio
pay per exposure
product CTR
product click-to-deal rate
ROI
paid GMV / cost
net pay / cost
```

### 10.3 Quality features

Purpose: avoid fake/low-quality GMV.

Examples:

```text
low refund rate
net pay / pay ratio
low quality-refund pressure if available
stable net contribution
```

### 10.4 Stability features

Purpose: prefer objects with repeatable performance.

Examples:

```text
low coefficient of variation over 7/14 days
consistent top-half ranking
low abnormal frequency
stable ROI
```

### 10.5 Growth-space features

Purpose: find underallocated opportunities.

Examples:

```text
low exposure share + high conversion
low cost share + high ROI
low contribution today + strong recent growth
high room-specific product fit
```

### 10.6 Risk penalty features

Purpose: penalize fragile or dangerous candidates.

Examples:

```text
high refund rate
high cost with weak ROI
sample too small
mapping missing for inventory/profit-sensitive tasks
finance discontinuity
ad attribution missing
outliers
```

---

## 11. Normalization and ranking rules

Implement utility functions:

```ts
percentileRank(values: number[], value: number): number
safeDivide(numerator: number, denominator: number): number | null
clipOutliersByWinsorization(values: number[], lowerPct: number, upperPct: number): number[]
rankDescending<T>(rows: T[], score: (row: T) => number): Array<T & { rank: number }>
```

Feature normalization should usually be percentile-based within entity type and date/window, because raw scales differ heavily across rooms/products/materials.

Required behavior:

```text
Do not compare product raw GMV directly against room raw GMV.
Do not let one extreme outlier dominate all scores.
If denominator is zero, return null and add data-quality issue.
Null feature values should not become zero silently; scoring must know missing vs bad.
```

---

## 12. Scoring engine

### 12.1 Recommendation types

```ts
export type RecommendationType =
  | "add"
  | "maintain"
  | "downrank"
  | "investigate"
  | "watch";
```

### 12.2 Score config

Use config-driven weights.

```ts
export interface ScoreWeights {
  contribution: number;
  efficiency: number;
  quality: number;
  stability: number;
  growthSpace: number;
  riskPenalty: number;
}

export interface ScoringConfig {
  configId: string;
  entityType: EntityType;
  recommendationType: RecommendationType;
  weights: ScoreWeights;
  minSampleLevel?: "low" | "medium" | "high";
  hardExclusions?: string[];
}
```

### 12.3 Score formula

V0 default formula:

```text
score =
  contributionWeight * contribution
+ efficiencyWeight * efficiency
+ qualityWeight * quality
+ stabilityWeight * stability
+ growthSpaceWeight * growthSpace
- riskPenaltyWeight * riskPenalty
```

Scale final score to a human-readable range such as 0-100 for positive recommendation types. For downrank/investigate, use a separate scoring objective rather than simply negating the add score.

### 12.4 Separate objectives

Implement separate scoring objectives:

```text
add:
  finds candidates that may deserve more exposure/resource.

maintain:
  finds stable core objects that should be protected.

downrank:
  finds high-cost, low-efficiency, or low-quality objects.

investigate:
  finds high-risk objects: high refund, high click but low pay, abnormal net-pay drop.

watch:
  finds interesting but low-confidence objects.
```

Do not use one global score for all actions.

### 12.5 Recommendation output

```ts
export interface BalanceRecommendation {
  dt: string;
  entityType: EntityType;
  entityId: string;
  recommendationType: RecommendationType;
  score: number;
  scoreBreakdown: FeatureGroupScores;
  rank?: number;
  evidence: EvidenceItem[];
  dataQuality: DataQuality;
  configId: string;
}

export interface EvidenceItem {
  label: string;
  metric?: string;
  value?: number | string | null;
  benchmark?: number | string | null;
  direction?: "positive" | "negative" | "neutral";
  explanation: string;
}
```

Every recommendation must include evidence and score breakdown.

---

## 13. Backtest design

Backtest is the heart of this project.

### 13.1 No future leakage

At date `t`, the system may only use features available at or before `t`.

It evaluates outcomes on future windows:

```text
t+1 day
t+3 days
t+7 days
```

Tests must verify that features at t do not include rows from t+1 or later.

### 13.2 Outcome windows

Implement outcomes:

```ts
export interface BalanceOutcome {
  dt: string;
  entityType: EntityType;
  entityId: string;
  horizon: "1d" | "3d" | "7d";

  futureNetPayAmt?: number;
  futurePayAmt?: number;
  futureGmvCostRatio?: number | null;
  futureRefundRate?: number | null;
  futureRoi?: number | null;
  futureLowEfficiency?: boolean;
  futureHighRefund?: boolean;
  futureTopQuantile?: boolean;
  futureBottomQuantile?: boolean;
}
```

### 13.3 Validation tasks

Implement at least three evaluation tasks.

#### Add-candidate validation

Question:

```text
Do add candidates outperform random/naive objects in future windows?
```

Outcomes:

```text
future net pay
future GMV-cost ratio / ROI
future refund rate
future top quantile hit rate
```

#### Downrank-candidate validation

Question:

```text
Do downrank candidates continue to be inefficient or low quality?
```

Outcomes:

```text
future bottom efficiency hit rate
future high-cost low-pay persistence
future bottom ROI hit rate
```

#### Investigate-candidate validation

Question:

```text
Do investigate candidates continue to show refund/quality/conversion risk?
```

Outcomes:

```text
future high refund
future net-pay drop
future click-high-pay-low persistence
```

---

## 14. Backtest metrics

Implement these metrics:

```ts
export interface BacktestMetrics {
  precisionAtK: Record<string, number>; // e.g. { "10": 0.7 }
  topDecileLift: number | null;
  bottomDecileHitRate: number | null;
  ndcgAtK: Record<string, number>;
  spearmanRankCorrelation?: number | null;
  recommendationStability?: number | null;
  sampleCount: number;
}
```

### 14.1 Precision@K

For add candidates:

```text
Among top K recommendations, what fraction land in future top quantile?
```

For downrank/investigate:

```text
Among top K risk recommendations, what fraction land in future bottom efficiency or high-risk labels?
```

### 14.2 Top-decile lift

For add candidates:

```text
Average future outcome of top 10% recommendations
/
Average future outcome of all eligible objects
```

### 14.3 NDCG@K

Use future outcome as relevance label. Higher future net pay or ROI is relevant for add; future risk/low efficiency is relevant for downrank/investigate.

### 14.4 Stability

Recommendation stability can measure overlap of top K recommendations across adjacent dates or across similar weight configs.

---

## 15. Weight search

Weights must not be treated as permanent subjective truth. Implement a search system.

### 15.1 Search space

Use JSON config:

```json
{
  "entityType": "product",
  "recommendationType": "add",
  "search": {
    "contribution": [0.1, 0.2, 0.3, 0.4],
    "efficiency": [0.1, 0.2, 0.3, 0.4],
    "quality": [0.1, 0.2, 0.3, 0.4],
    "stability": [0.0, 0.1, 0.2],
    "growthSpace": [0.0, 0.1, 0.2, 0.3],
    "riskPenalty": [0.1, 0.2, 0.3, 0.4, 0.5]
  },
  "maxConfigs": 100
}
```

Support either grid sampling or random sampling.

### 15.2 Selection criteria

Do not blindly pick the single highest historical score. Select using:

```text
future performance lift
stability across windows
reasonable sample coverage
business interpretability
not overdependent on one metric
not too sensitive to low sample rows
```

Output both best and failed configs for comparison.

### 15.3 Train/test split

Implement date-based split:

```text
train window: earlier dates used for selecting weights
test window: later dates used for final validation
```

Future enhancement: rolling validation.

---

## 16. Shadow report

Generate Markdown and JSON reports.

Required outputs:

```text
outputs/balance_shadow_report_<date>.md
outputs/balance_recommendations_<date>.json
outputs/balance_backtest_summary_<date>.json
outputs/weight_search_results_<date>.json
```

### 16.1 Report sections

Markdown report should include:

```text
# Daily Balance Shadow Report - YYYY-MM-DD

## Executive Summary
- What the system found today.
- Whether data quality is sufficient.
- Whether this is a shadow recommendation, not an automatic action.

## Add Candidates
Top room/product/carrier/ad candidates.
Each item includes score, evidence, and risks.

## Downrank Candidates
High-cost low-efficiency candidates.

## Investigate Candidates
High-refund, click-high-pay-low, or data-quality risk candidates.

## Watch List
Interesting but low-confidence candidates.

## Backtest Summary
How recent recommendations performed in t+1/t+3/t+7 windows.

## Weight Config Summary
Best config and why it was selected.

## Data Quality Warnings
Mapping missing, finance discontinuity, ad attribution missing, low sample rows.

## Methodology Notes
State clearly: this is predictive validation, not causal uplift proof.
```

### 16.2 Language requirement

Report can be English-first for GitHub readability, but terms may include Chinese labels such as:

```text
加码候选 / Add candidates
降权候选 / Downrank candidates
排查候选 / Investigate candidates
观察 / Watch
```

---

## 17. Action log and post-action evaluation

V0 may implement storage structures without UI.

### 17.1 Action log

```ts
export interface BalanceActionLogItem {
  actionTime: string;
  dt: string;
  recommendationId: string;
  entityType: EntityType;
  entityId: string;
  recommendationType: RecommendationType;
  operator?: string;
  accepted: boolean;
  actionType?: "add" | "downrank" | "investigate" | "maintain" | "ignore";
  actionDetail?: string;
  reason?: string;
}
```

Store as JSONL or JSON in public demo.

### 17.2 Post-action evaluation

```ts
export interface PostActionEvaluation {
  recommendationId: string;
  horizon: "1d" | "3d" | "7d";
  beforeMetrics: Record<string, number | null>;
  afterMetrics: Record<string, number | null>;
  matchedControlMetrics?: Record<string, number | null>;
  estimatedLift?: number | null;
  evaluationNote: string;
}
```

V0 does not need full causal matching, but the types should be ready.

---

## 18. Synthetic data generator

Implement a synthetic generator or static fixtures that create realistic patterns.

Minimum synthetic scale:

```text
30 dates
20 rooms
100 products
5 carrier types
10 ad accounts
50 ad materials
```

Synthetic patterns must include:

```text
stable high contributors
low exposure high conversion products
high click low pay products
high GMV high refund products
high cost low ROI ad materials
high ROI low spend ad materials
volatile rooms
sample-too-small rows
mapping-missing product rows
finance-discontinuous dates
```

This is critical. The demo must produce non-trivial recommendations and backtest metrics.

---

## 19. CLI commands

Package scripts should support:

```bash
npm run demo:balance
npm run balance:build
npm run balance:backtest
npm run balance:report
npm run test
```

Expected behavior:

```text
npm run demo:balance
  generates or loads synthetic data
  builds canonical rows
  builds features
  runs default scoring
  runs basic backtest
  runs weight search with a small config set
  writes output JSON and Markdown files

npm test
  runs unit tests and leakage tests
```

---

## 20. Tests and acceptance criteria

### 20.1 Required tests

Implement tests for:

```text
Scoring formula produces expected score breakdown.
Missing SKU mapping disables inventory/profit features.
Finance discontinuity disables finance features.
Ad attribution missing prevents plan-level recommendation.
Zero denominator produces data-quality issue, not crash.
Sample-too-small rows cannot become strong add/downrank recommendations.
Backtest does not use future data.
Precision@K and top-decile lift calculations are correct on simple fixtures.
Report renderer includes recommendation evidence and data-quality warnings.
```

### 20.2 V0 acceptance criteria

V0 is accepted when:

```text
1. `npm install` works.
2. `npm run demo:balance` creates all expected files under outputs/.
3. `npm test` passes.
4. Demo recommendations include add/downrank/investigate/watch candidates.
5. Each recommendation has scoreBreakdown, evidence, and dataQuality.
6. Backtest summary includes Precision@K and top-decile lift.
7. Weight search outputs at least 20 candidate weight configs.
8. No private table names, credentials, real store names, real product names, or real metrics appear in the repository.
```

---

## 21. Recommended implementation order for Codex

Follow this order. Do not start with UI.

```text
Step 1: Set up TypeScript project, package scripts, Vitest.
Step 2: Define shared types and data-quality model.
Step 3: Implement synthetic data fixtures/generator.
Step 4: Implement canonical wide-table builders.
Step 5: Implement feature builder and normalization utilities.
Step 6: Implement scoring engine and recommendation engine.
Step 7: Implement outcome builder and backtest metrics.
Step 8: Implement weight search.
Step 9: Implement Markdown/JSON report rendering.
Step 10: Implement CLI demo pipeline.
Step 11: Add tests.
Step 12: Update README with quickstart and methodology.
```

Do not implement web dashboard in V0.

---

## 22. Example default scoring intuition

These are starting points only. The backtest/weight-search system must be able to challenge them.

### 22.1 Product add candidate

Prioritize:

```text
high efficiency
high quality
growth space
reasonable contribution
low risk
```

Example weights:

```json
{
  "contribution": 0.15,
  "efficiency": 0.30,
  "quality": 0.25,
  "stability": 0.10,
  "growthSpace": 0.20,
  "riskPenalty": 0.35
}
```

### 22.2 Product investigate candidate

Prioritize:

```text
high contribution + high risk
high click + low pay
high refund
```

### 22.3 Ad material add candidate

Prioritize:

```text
high ROI
low cost share
stable paid conversion
low refund proxy if available
```

### 22.4 Ad material downrank candidate

Prioritize:

```text
high cost
low ROI
low paid GMV
bad followup ROI
```

### 22.5 Room maintain candidate

Prioritize:

```text
stable net pay
reasonable efficiency
low abnormal frequency
low refund
```

---

## 23. Future roadmap, not V0

After V0, future phases can add:

```text
V1: action log workflow and manual operator feedback.
V2: prediction model such as LightGBM/CatBoost outside TypeScript or via exported dataset.
V3: quasi-causal evaluation: holdout, DiD, matching.
V4: uplift model.
V5: constrained budget optimization.
V6: contextual bandit for small exploration traffic.
```

Do not implement these now. Leave docs/types where useful.

---

## 24. Final instruction to Codex

Implement a clean, runnable, public-safe TypeScript V0 of Balance Validation.

The highest-priority deliverable is not a fancy UI. It is a reproducible offline pipeline that proves the project is serious:

```text
synthetic data
→ features
→ scoring
→ backtest
→ weight search
→ shadow report
→ tests
```

The code should make it impossible to accidentally present V0 as causal optimization. All reports and docs must state that recommendations are shadow recommendations and require later holdout/action-log validation before causal claims.
