import type { AdBalanceRow, BalanceRow, EntityType, FeatureGroupScores } from "../../core/src/types.js";
import { percentileRank } from "../../core/src/math.js";

function entityId(row: any, entityType: EntityType): string {
  if (entityType === "room") return row.roomId;
  if (entityType === "product") return row.productId;
  if (entityType === "carrier") return row.carrierType;
  return row.entityId;
}

function contributionMetric(row: any): number {
  return row.netPayAmt ?? row.productNetPayAmt ?? row.paidGmv ?? 0;
}

function efficiencyMetric(row: any): number {
  return row.gmvCostRatio ?? row.productClickDealRate ?? row.overallPaymentRoi ?? row.netContributionShare ?? 0;
}

function refundMetric(row: any): number {
  return row.refundRate ?? row.productRefundRate ?? 0;
}

function growthMetric(row: any, entityType: EntityType): number {
  if (entityType === "product") return (row.productClickDealRate ?? 0) * (1 - (row.exposureShareInRoom ?? 0));
  if (entityType === "ad_material" || entityType === "ad_account") return (row.overallPaymentRoi ?? 0) * (1 - (row.costShare ?? 0));
  return row.gmvCostRatio ?? row.netContributionShare ?? 0;
}

export interface FeatureRow {
  dt: string;
  entityType: EntityType;
  entityId: string;
  row: BalanceRow;
  features: FeatureGroupScores;
  normalizationWindowMaxDt: string;
  futureLeakGuardMaxSourceDt: string;
}

export function buildFeatureRowsAsOf(rows: BalanceRow[], entityType: EntityType, asOfDate: string): FeatureRow[] {
  const history = rows.filter((row) => row.dt <= asOfDate);
  const current = history.filter((row) => row.dt === asOfDate);
  const contributionValues = history.map(contributionMetric).filter(Number.isFinite);
  const efficiencyValues = history.map(efficiencyMetric).filter(Number.isFinite);
  const refundValues = history.map(refundMetric).filter(Number.isFinite);
  const growthValues = history.map((row) => growthMetric(row, entityType)).filter(Number.isFinite);

  return current.map((row: any) => {
    const contribution = percentileRank(contributionValues, contributionMetric(row));
    const efficiency = percentileRank(efficiencyValues, efficiencyMetric(row));
    const quality = 100 - percentileRank(refundValues, refundMetric(row));
    const stability = Math.max(0, 100 - (row.abnormalCount ?? 0) * 20 - (row.warningCount ?? 0) * 10);
    const growthSpace = percentileRank(growthValues, growthMetric(row, entityType));
    let riskPenalty = 100 - quality + row.dataQuality.issues.length * 8;
    if (row.dataQuality.sampleLevel === "low") riskPenalty += 20;
    if (row.dataQuality.sampleLevel === "none") riskPenalty += 35;
    if (!row.dataQuality.usable) riskPenalty += 50;

    return {
      dt: row.dt,
      entityType,
      entityId: entityId(row, entityType),
      row,
      features: { contribution, efficiency, quality, stability, growthSpace, riskPenalty: Math.min(100, riskPenalty) },
      normalizationWindowMaxDt: asOfDate,
      futureLeakGuardMaxSourceDt: asOfDate,
    };
  });
}

export function buildFeatureRows(rows: BalanceRow[], entityType: EntityType): FeatureRow[] {
  const dates = [...new Set(rows.map((row) => row.dt))].sort();
  return dates.flatMap((dt) => buildFeatureRowsAsOf(rows, entityType, dt));
}

export function buildAllFeatureRows(tables: { rooms: BalanceRow[]; products: BalanceRow[]; carriers: BalanceRow[]; ads: AdBalanceRow[] }) {
  return [
    ...buildFeatureRows(tables.rooms, "room"),
    ...buildFeatureRows(tables.products, "product"),
    ...buildFeatureRows(tables.carriers, "carrier"),
    ...buildFeatureRows(tables.ads.filter((a) => a.entityType === "ad_account"), "ad_account"),
    ...buildFeatureRows(tables.ads.filter((a) => a.entityType === "ad_material"), "ad_material"),
  ];
}
