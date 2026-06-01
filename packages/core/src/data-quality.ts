import type { DataQuality } from './types.js';

export const completeDataQuality: DataQuality = {
  inventoryUsable: true,
  profitUsable: true,
  financeUsable: true,
  adMaterialRecommendationAllowed: true,
  adPlanRecommendationAllowed: true,
  issues: []
};

export function dataQualitySeverity(dataQuality: DataQuality): number {
  return Math.max(0, Math.min(1, dataQuality.issues.length / 4));
}

export function mergeDataQuality(...items: DataQuality[]): DataQuality {
  return {
    inventoryUsable: items.every((item) => item.inventoryUsable),
    profitUsable: items.every((item) => item.profitUsable),
    financeUsable: items.every((item) => item.financeUsable),
    adMaterialRecommendationAllowed: items.every((item) => item.adMaterialRecommendationAllowed),
    adPlanRecommendationAllowed: items.every((item) => item.adPlanRecommendationAllowed),
    issues: [...new Set(items.flatMap((item) => item.issues))]
  };
}
