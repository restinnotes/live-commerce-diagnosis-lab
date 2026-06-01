import type { BalanceRecommendation, FeatureGroupScores, RecommendationType, ScoringConfig } from "../../core/src/types.js";
import { clamp } from "../../core/src/math.js";
import { sampleAllowed } from "../../core/src/data-quality.js";
import type { FeatureRow } from "./feature-builder.js";
export function defaultConfigs(): ScoringConfig[] { const w=(contribution:number,efficiency:number,quality:number,stability:number,growthSpace:number,riskPenalty:number)=>({contribution,efficiency,quality,stability,growthSpace,riskPenalty}); return [
  {configId:"product_add_default",entityType:"product",recommendationType:"add",weights:w(.15,.30,.25,.10,.20,.35),minSampleLevel:"medium"},
  {configId:"product_investigate_default",entityType:"product",recommendationType:"investigate",weights:w(.25,.05,-.10,0,.10,.55),minSampleLevel:"low"},
  {configId:"room_maintain_default",entityType:"room",recommendationType:"maintain",weights:w(.30,.25,.20,.20,.05,.20),minSampleLevel:"medium"},
  {configId:"room_downrank_default",entityType:"room",recommendationType:"downrank",weights:w(.20,-.25,-.20,0,0,.55),minSampleLevel:"medium"},
  {configId:"ad_material_add_default",entityType:"ad_material",recommendationType:"add",weights:w(.10,.40,.15,.15,.20,.25),minSampleLevel:"medium"},
  {configId:"ad_material_downrank_default",entityType:"ad_material",recommendationType:"downrank",weights:w(.25,-.35,-.15,0,0,.50),minSampleLevel:"medium"},
  {configId:"carrier_watch_default",entityType:"carrier",recommendationType:"watch",weights:w(.20,.20,.20,.10,.30,.35),minSampleLevel:"medium"},
]; }
export function scoreFeatureGroups(features: FeatureGroupScores, config: ScoringConfig): number {
  const w=config.weights;
  if (config.recommendationType === "downrank" || config.recommendationType === "investigate") {
    return clamp(
      Math.abs(w.contribution) * features.contribution
      + Math.abs(w.efficiency) * (100 - features.efficiency)
      + Math.abs(w.quality) * (100 - features.quality)
      + Math.abs(w.growthSpace) * (config.recommendationType === "investigate" ? features.growthSpace : 0)
      + Math.abs(w.riskPenalty) * features.riskPenalty
      - Math.abs(w.stability) * features.stability * 0.2
    );
  }
  return clamp(w.contribution*features.contribution + w.efficiency*features.efficiency + w.quality*features.quality + w.stability*features.stability + w.growthSpace*features.growthSpace - w.riskPenalty*features.riskPenalty);
}
function evidence(fr: FeatureRow, type: RecommendationType) { const f=fr.features; return [ { label:"Score objective", value:type, direction:"neutral" as const, explanation:"Shadow recommendation only; not automatic allocation or causal uplift proof." }, { label:"Efficiency", metric:"efficiency_percentile", value:Math.round(f.efficiency), direction:f.efficiency>=60?"positive" as const:"negative" as const, explanation:"Percentile-normalized within entity type and date." }, { label:"Risk", metric:"risk_penalty", value:Math.round(f.riskPenalty), direction:f.riskPenalty>=50?"negative" as const:"positive" as const, explanation:"Combines refund/sample/data-quality risk." } ]; }
export function recommend(featureRows: FeatureRow[], configs = defaultConfigs(), topPerConfig = 10): BalanceRecommendation[] {
  const recs: BalanceRecommendation[]=[];
  for (const config of configs) {
    const candidates=featureRows.filter((fr)=>fr.entityType===config.entityType && fr.row.dataQuality.usable && sampleAllowed(fr.row.dataQuality, config.minSampleLevel ?? "low"));
    const dates = [...new Set(candidates.map((fr) => fr.dt))];
    for (const dt of dates) {
      const scored=candidates.filter((fr)=>fr.dt===dt).map((fr)=>({fr, score: scoreFeatureGroups(fr.features, config)})).filter((x)=> x.score >= (config.recommendationType==="watch"?30:45)).sort((a,b)=>b.score-a.score).slice(0,topPerConfig);
      scored.forEach((x,i)=> recs.push({ dt:x.fr.dt, entityType:x.fr.entityType, entityId:x.fr.entityId, recommendationType:config.recommendationType, score:Number(x.score.toFixed(2)), scoreBreakdown:x.fr.features, rank:i+1, evidence:evidence(x.fr, config.recommendationType), dataQuality:x.fr.row.dataQuality, configId:config.configId }));
    }
  }
  return recs;
}
