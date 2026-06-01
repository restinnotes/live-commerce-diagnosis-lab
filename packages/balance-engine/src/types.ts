export type {
  BacktestResult,
  DataQuality,
  EntityType,
  FeatureRow,
  OutcomeRow,
  Recommendation,
  RecommendationType,
  ScoreWeights,
  Strength,
  WeightConfig
} from '../../core/src/types.js';

export interface MetricRow {
  dt: string;
  entityType: import('../../core/src/types.js').EntityType;
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
