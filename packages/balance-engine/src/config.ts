import fs from 'node:fs';
import type { EntityType, RecommendationType, ScoreWeights, WeightConfig } from './types.js';

export const defaultConfigId = 'default-v0';

export const defaultWeights: ScoreWeights = {
  contribution: 0.2,
  efficiency: 0.3,
  quality: 0.2,
  stability: 0.1,
  growthSpace: 0.2,
  riskPenalty: 0.3
};

export const defaultWeightConfig: WeightConfig = {
  configId: defaultConfigId,
  product: {
    add: { weights: defaultWeights },
    downrank: { weights: { ...defaultWeights, efficiency: 0.2, riskPenalty: 0.4 } },
    investigate: { weights: { ...defaultWeights, quality: 0.3, riskPenalty: 0.4 } }
  },
  room: {
    add: { weights: defaultWeights },
    downrank: { weights: { ...defaultWeights, riskPenalty: 0.4 } }
  },
  ad_material: {
    add: { weights: { ...defaultWeights, efficiency: 0.35 } },
    downrank: { weights: { ...defaultWeights, riskPenalty: 0.45 } }
  },
  carrier: {
    watch: { weights: { ...defaultWeights, stability: 0.25, riskPenalty: 0.4 } }
  }
};

export function loadWeightConfig(path?: string): WeightConfig {
  if (!path) return defaultWeightConfig;
  return JSON.parse(fs.readFileSync(path, 'utf8')) as WeightConfig;
}

export function weightsFor(config: WeightConfig, entityType: EntityType, recommendationType: RecommendationType): ScoreWeights {
  return config[entityType]?.[recommendationType]?.weights ?? defaultWeightConfig[entityType]?.[recommendationType]?.weights ?? defaultWeights;
}
