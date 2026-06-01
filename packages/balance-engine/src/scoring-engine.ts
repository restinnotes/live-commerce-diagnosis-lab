import type {
  BalanceRecommendation,
  EvidenceItem,
  FeatureGroupScores,
  RecommendationStrength,
  RecommendationType,
  ScoringConfig,
} from "../../core/src/types.js";
import { clamp } from "../../core/src/math.js";
import { hasIssue, sampleAllowed } from "../../core/src/data-quality.js";
import type { FeatureRow } from "./feature-builder.js";

export function defaultConfigs(): ScoringConfig[] {
  const w = (contribution: number, efficiency: number, quality: number, stability: number, growthSpace: number, riskPenalty: number) => ({
    contribution,
    efficiency,
    quality,
    stability,
    growthSpace,
    riskPenalty,
  });
  return [
    { configId: "product_add_default", entityType: "product", recommendationType: "add", weights: w(0.15, 0.3, 0.25, 0.1, 0.2, 0.35), minSampleLevel: "low" },
    { configId: "product_downrank_default", entityType: "product", recommendationType: "downrank", weights: w(0.1, 0.35, 0.25, 0, 0, 0.45), minSampleLevel: "low" },
    { configId: "product_investigate_default", entityType: "product", recommendationType: "investigate", weights: w(0.25, 0.1, 0.25, 0, 0.1, 0.55), minSampleLevel: "low" },
    { configId: "room_add_default", entityType: "room", recommendationType: "add", weights: w(0.25, 0.25, 0.2, 0.15, 0.15, 0.3), minSampleLevel: "medium" },
    { configId: "room_downrank_default", entityType: "room", recommendationType: "downrank", weights: w(0.1, 0.35, 0.25, 0, 0, 0.55), minSampleLevel: "medium" },
    { configId: "room_maintain_default", entityType: "room", recommendationType: "maintain", weights: w(0.3, 0.25, 0.2, 0.2, 0.05, 0.2), minSampleLevel: "medium" },
    { configId: "ad_material_add_default", entityType: "ad_material", recommendationType: "add", weights: w(0.1, 0.45, 0.15, 0.1, 0.2, 0.25), minSampleLevel: "low" },
    { configId: "ad_material_downrank_default", entityType: "ad_material", recommendationType: "downrank", weights: w(0.05, 0.45, 0.15, 0, 0, 0.45), minSampleLevel: "low" },
    { configId: "carrier_watch_default", entityType: "carrier", recommendationType: "watch", weights: w(0.1, 0.1, 0.1, 0.2, 0.2, 0.5), minSampleLevel: "low" },
  ];
}

export interface ObjectiveScoreContext {
  dataQualityIssueCount?: number;
  sampleLevel?: "none" | "low" | "medium" | "high";
  costPressure?: number;
  adAttributionLevel?: "none" | "material" | "account" | "plan";
}

function rowCostPressure(row: any, features: FeatureGroupScores): number {
  if (typeof row.costShare === "number") return clamp(row.costShare * 100);
  if (typeof row.cost === "number" && row.cost > 0) return clamp((100 - features.efficiency) * 0.7 + Math.min(30, row.cost / 1000));
  return 100 - features.efficiency;
}

function buildContext(fr: FeatureRow): ObjectiveScoreContext {
  return {
    dataQualityIssueCount: fr.row.dataQuality.issues.length,
    sampleLevel: fr.row.dataQuality.sampleLevel,
    costPressure: rowCostPressure(fr.row, fr.features),
    adAttributionLevel: fr.row.dataQuality.adAttributionLevel,
  };
}

export function scoreFeatureGroups(features: FeatureGroupScores, config: ScoringConfig, context: ObjectiveScoreContext = {}): number {
  const w = config.weights;
  const issuePressure = Math.min(100, (context.dataQualityIssueCount ?? 0) * 18);
  const costPressure = context.costPressure ?? 100 - features.efficiency;
  const signalConflict = Math.abs(features.efficiency - features.quality);

  if (config.recommendationType === "add") {
    return clamp(
      w.contribution * features.contribution +
        w.efficiency * features.efficiency +
        w.quality * features.quality +
        w.stability * features.stability +
        w.growthSpace * features.growthSpace -
        w.riskPenalty * features.riskPenalty,
    );
  }

  if (config.recommendationType === "downrank") {
    return clamp(
      w.riskPenalty * features.riskPenalty +
        w.efficiency * (100 - features.efficiency) +
        w.quality * (100 - features.quality) +
        0.25 * costPressure -
        0.25 * features.contribution,
    );
  }

  if (config.recommendationType === "investigate") {
    const highContributionHighRisk = Math.min(features.contribution, features.riskPenalty);
    return clamp(
      w.riskPenalty * features.riskPenalty +
        w.quality * (100 - features.quality) +
        0.35 * issuePressure +
        0.3 * highContributionHighRisk +
        0.15 * signalConflict +
        w.growthSpace * features.growthSpace * 0.2,
    );
  }

  if (config.recommendationType === "watch") {
    const sampleUncertainty = context.sampleLevel === "none" ? 100 : context.sampleLevel === "low" ? 80 : context.sampleLevel === "medium" ? 35 : 10;
    const incompleteData = issuePressure;
    return clamp(0.35 * sampleUncertainty + 0.3 * incompleteData + 0.2 * signalConflict + 0.15 * (100 - features.stability));
  }

  return clamp(
    w.contribution * features.contribution +
      w.efficiency * features.efficiency +
      w.quality * features.quality +
      w.stability * features.stability +
      w.growthSpace * features.growthSpace -
      w.riskPenalty * features.riskPenalty,
  );
}

function strengthFor(score: number, type: RecommendationType, sampleLevel?: string): RecommendationStrength {
  if ((type === "add" || type === "downrank") && (sampleLevel === "none" || sampleLevel === "low")) return "weak";
  if (type === "watch") return score >= 60 ? "medium" : "weak";
  if (score >= 75) return "strong";
  if (score >= 55) return "medium";
  return "weak";
}

function evidence(fr: FeatureRow, type: RecommendationType, score: number, strength: RecommendationStrength): EvidenceItem[] {
  const f = fr.features;
  const base: EvidenceItem[] = [
    {
      label: "Objective",
      value: type,
      direction: "neutral",
      explanation: "Shadow recommendation only; not automatic allocation or causal uplift proof.",
    },
    {
      label: "Strength",
      metric: "strength",
      value: strength,
      direction: strength === "strong" ? "positive" : "neutral",
      explanation: "Strength is capped by sample and data-quality confidence.",
    },
  ];

  if (type === "add") {
    base.push({ label: "Add rationale", metric: "score", value: score, direction: "positive", explanation: "Add rewards contribution, efficiency, quality, and growth space while penalizing risk." });
  } else if (type === "downrank") {
    base.push({ label: "Downrank rationale", metric: "risk_penalty", value: Math.round(f.riskPenalty), direction: "negative", explanation: "Downrank rewards high risk, low efficiency, low quality, and cost-pressure; high contribution reduces confidence." });
  } else if (type === "investigate") {
    base.push({ label: "Investigate rationale", metric: "risk_penalty", value: Math.round(f.riskPenalty), direction: "negative", explanation: "Investigate is for conflicting or risky evidence. It is not an add/downrank or budget instruction." });
  } else if (type === "watch") {
    base.push({ label: "Watch rationale", metric: "data_quality_issues", value: fr.row.dataQuality.issues.length, direction: "neutral", explanation: "Watch tracks low-confidence, incomplete, volatile, or directionally mixed signals." });
  }

  base.push(
    { label: "Efficiency", metric: "efficiency_percentile", value: Math.round(f.efficiency), direction: f.efficiency >= 60 ? "positive" : "negative", explanation: "Percentile-normalized using only data available as of the scoring date." },
    { label: "Quality", metric: "quality_percentile", value: Math.round(f.quality), direction: f.quality >= 60 ? "positive" : "negative", explanation: "Higher quality means lower refund/quality pressure." },
    { label: "Risk", metric: "risk_penalty", value: Math.round(f.riskPenalty), direction: f.riskPenalty >= 50 ? "negative" : "positive", explanation: "Combines refund, sample, and data-quality risk." },
  );
  return base;
}

function allowedByAttribution(fr: FeatureRow, config: ScoringConfig): boolean {
  if (config.entityType !== "ad_material" || config.recommendationType !== "add") return true;
  // Material-level shadow recommendations are allowed when material attribution exists.
  // Only plan-level/budget-style recommendations are forbidden in V0.
  return fr.row.dataQuality.adAttributionLevel === "material" || fr.row.dataQuality.adAttributionLevel === "plan";
}

export function recommend(featureRows: FeatureRow[], configs = defaultConfigs(), topPerConfig = 10): BalanceRecommendation[] {
  const recs: BalanceRecommendation[] = [];
  for (const config of configs) {
    const candidates = featureRows.filter(
      (fr) =>
        fr.entityType === config.entityType &&
        fr.row.dataQuality.usable &&
        sampleAllowed(fr.row.dataQuality, config.minSampleLevel ?? "low") &&
        allowedByAttribution(fr, config),
    );
    const dates = [...new Set(candidates.map((fr) => fr.dt))];
    for (const dt of dates) {
      const scored = candidates
        .filter((fr) => fr.dt === dt)
        .map((fr) => ({ fr, score: scoreFeatureGroups(fr.features, config, buildContext(fr)) }))
        .filter((x) => x.score >= (config.recommendationType === "watch" ? 25 : 40))
        .sort((a, b) => b.score - a.score)
        .slice(0, topPerConfig);

      scored.forEach((x, i) => {
        const strength = strengthFor(x.score, config.recommendationType, x.fr.row.dataQuality.sampleLevel);
        recs.push({
          dt: x.fr.dt,
          entityType: x.fr.entityType,
          entityId: x.fr.entityId,
          recommendationType: config.recommendationType,
          score: Number(x.score.toFixed(2)),
          scoreBreakdown: x.fr.features,
          strength,
          rank: i + 1,
          evidence: evidence(x.fr, config.recommendationType, x.score, strength),
          dataQuality: x.fr.row.dataQuality,
          configId: config.configId,
        });
      });
    }
  }
  return recs;
}

export function assertNoPlanLevelBudgetRecommendation(rec: BalanceRecommendation): void {
  const text = JSON.stringify(rec).toLowerCase();
  if (text.includes("plan budget") || text.includes("budget amount")) {
    throw new Error("V0 recommendations must not include plan-level budget optimization");
  }
}
