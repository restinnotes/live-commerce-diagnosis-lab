import { safeDivide } from '../../core/src/math.js';
import type { DataQuality, EntityType } from '../../core/src/types.js';
import type { MetricRow } from './types.js';

export type CanonicalWideTableName =
  | 'room_daily_balance'
  | 'product_live_balance'
  | 'carrier_daily_balance'
  | 'ad_account_material_balance';

export interface CanonicalWideBalanceRow {
  tableName: CanonicalWideTableName;
  dt: string;
  entityType: EntityType;
  entityId: string;
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
  dataQuality: DataQuality;
}

export interface RoomDailyBalance extends CanonicalWideBalanceRow {
  tableName: 'room_daily_balance';
  entityType: 'room';
  roomSegment: 'baseline' | 'growth' | 'risk';
}

export interface ProductLiveBalance extends CanonicalWideBalanceRow {
  tableName: 'product_live_balance';
  entityType: 'product';
  productSegment: 'core' | 'testing' | 'tail';
}

export interface CarrierDailyBalance extends CanonicalWideBalanceRow {
  tableName: 'carrier_daily_balance';
  entityType: 'carrier';
  carrierSegment: 'organic' | 'affiliate' | 'paid';
}

export interface AdAccountMaterialBalance extends CanonicalWideBalanceRow {
  tableName: 'ad_account_material_balance';
  entityType: 'ad_material';
  accountBucket: 'mock_account_a' | 'mock_account_b';
  materialBucket: 'mock_material_a' | 'mock_material_b';
}

export type BalanceWideRow = RoomDailyBalance | ProductLiveBalance | CarrierDailyBalance | AdAccountMaterialBalance;

function qualityFromRaw(row: MetricRow, rows: MetricRow[]): DataQuality {
  const issues: string[] = [];
  const hasMapping = row.hasSkuMapping === true;
  if (!hasMapping) issues.push('mapping_missing');
  const entityRows = rows.filter((candidate) => candidate.entityType === row.entityType && candidate.entityId === row.entityId);
  const financeCoverage = entityRows.length === 0 ? 0 : entityRows.filter((candidate) => candidate.financePresent).length / entityRows.length;
  const financeUsable = financeCoverage >= 0.95;
  if (!financeUsable) issues.push('finance_discontinuous');
  if (row.exposure === 0 || row.cost === 0 || row.orders === 0) issues.push('zero_denominator');
  const adMaterialRecommendationAllowed = row.adAttributionLevel === 'material' || row.adAttributionLevel === 'plan';
  const adPlanRecommendationAllowed = row.adAttributionLevel === 'plan';
  if (row.entityType === 'ad_material' && !adMaterialRecommendationAllowed) issues.push('ad_attribution_missing');
  if (row.entityType === 'ad_material' && !adPlanRecommendationAllowed) issues.push('plan_attribution_missing');
  return {
    inventoryUsable: hasMapping,
    profitUsable: hasMapping && financeUsable,
    financeUsable,
    adMaterialRecommendationAllowed,
    adPlanRecommendationAllowed,
    issues
  };
}

function baseWideRow(row: MetricRow, rows: MetricRow[]): Omit<CanonicalWideBalanceRow, 'tableName'> {
  const dataQuality = qualityFromRaw(row, rows);
  return {
    dt: row.dt,
    entityType: row.entityType,
    entityId: row.entityId,
    exposure: row.exposure,
    gmv: row.gmv,
    orders: row.orders,
    refunds: row.refunds,
    cost: row.cost,
    roi: safeDivide(row.gmv, row.cost),
    conversionRate: safeDivide(row.orders, row.exposure),
    refundRate: safeDivide(row.refunds, row.orders),
    inventory: dataQuality.inventoryUsable ? row.inventory : undefined,
    profit: dataQuality.profitUsable ? row.profit : undefined,
    dataQuality
  };
}

export function buildCanonicalWideTables(rows: MetricRow[]): BalanceWideRow[] {
  return rows.map((row, index) => {
    const base = baseWideRow(row, rows);
    switch (row.entityType) {
      case 'room':
        return { ...base, tableName: 'room_daily_balance', entityType: 'room', roomSegment: index % 3 === 0 ? 'growth' : index % 3 === 1 ? 'baseline' : 'risk' } satisfies RoomDailyBalance;
      case 'product':
        return { ...base, tableName: 'product_live_balance', entityType: 'product', productSegment: index % 3 === 0 ? 'core' : index % 3 === 1 ? 'testing' : 'tail' } satisfies ProductLiveBalance;
      case 'carrier':
        return { ...base, tableName: 'carrier_daily_balance', entityType: 'carrier', carrierSegment: index % 3 === 0 ? 'organic' : index % 3 === 1 ? 'affiliate' : 'paid' } satisfies CarrierDailyBalance;
      case 'ad_material':
        return {
          ...base,
          tableName: 'ad_account_material_balance',
          entityType: 'ad_material',
          accountBucket: index % 2 === 0 ? 'mock_account_a' : 'mock_account_b',
          materialBucket: index % 2 === 0 ? 'mock_material_a' : 'mock_material_b'
        } satisfies AdAccountMaterialBalance;
    }
  });
}

export function tableNamesIn(rows: BalanceWideRow[]): CanonicalWideTableName[] {
  return [...new Set(rows.map((row) => row.tableName))].sort();
}
