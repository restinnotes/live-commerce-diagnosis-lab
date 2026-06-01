export type EntityType = 'product' | 'room' | 'ad_material' | 'carrier';
export type RecommendationType = 'add' | 'downrank' | 'investigate' | 'watch';
export type Strength = 'weak' | 'medium' | 'strong';

export interface MetricRow {
  dt: string;
  entityType: EntityType;
  entityId: string;
  exposure: number;
  gmv: number;
  orders: number;
  refunds: number;
  cost: number;
  inventory?: number;
  profit?: number;
  hasSkuMapping?: boolean;
  financePresent?: boolean;
  adAttributionLevel?: 'none' | 'account' | 'material' | 'plan';
}

export interface DataQuality {
  inventoryUsable: boolean;
  profitUsable: boolean;
  financeUsable: boolean;
  adMaterialRecommendationAllowed: boolean;
  adPlanRecommendationAllowed: boolean;
  issues: string[];
}

export interface FeatureRow {
  dt: string;
  sourceDate: string;
  entityType: EntityType;
  entityId: string;
  sampleSize: number;
  metrics: {
    exposure: number;
    gmv: number;
    orders: number;
    refunds: number;
    cost: number;
    roi: number | null;
    conversionRate: number | null;
    refundRate: number | null;
    inventory?: number;
    profit?: number;
  };
  ranks: {
    contribution: number;
    efficiency: number;
    quality: number;
    stability: number;
    growthSpace: number;
    riskPenalty: number;
    costRisk: number;
  };
  dataQuality: DataQuality;
}

export interface ScoreWeights {
  contribution: number;
  efficiency: number;
  quality: number;
  stability: number;
  growthSpace: number;
  riskPenalty: number;
}

export type WeightConfig = Partial<Record<EntityType, Partial<Record<RecommendationType, { weights: ScoreWeights }>>>> & {
  configId: string;
};

export interface Recommendation {
  dt: string;
  entityType: EntityType;
  entityId: string;
  recommendationType: RecommendationType;
  strength: Strength;
  score: number;
  configId: string;
  scoreBreakdown: Record<string, number>;
  evidence: string[];
  dataQuality: DataQuality;
}

export interface OutcomeRow {
  dt: string;
  entityType: EntityType;
  entityId: string;
  futureGmv: number;
  futureRoi: number;
}

export interface BacktestResult {
  entityType: EntityType;
  recommendationType: RecommendationType;
  precisionAtK: number;
  ndcgAtK: number;
  topDecileLift: number;
  evaluatedRows: number;
}
