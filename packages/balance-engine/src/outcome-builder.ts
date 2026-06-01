import type { BalanceOutcome, BalanceRow, EntityType } from "../../core/src/types.js";
import { percentileRank } from "../../core/src/math.js";
function id(row:any, et:EntityType){return et==="room"?row.roomId:et==="product"?row.productId:et==="carrier"?row.carrierType:row.entityId;}
function metric(row:any){return row.netPayAmt??row.productNetPayAmt??row.paidGmv??0;}
function eff(row:any){return row.gmvCostRatio??row.productClickDealRate??row.overallPaymentRoi??row.netContributionShare??0;}
export function buildOutcomes(rows: BalanceRow[], entityType: EntityType, horizon: "1d"|"3d"|"7d"): BalanceOutcome[] {
  const h = horizon==="1d"?1:horizon==="3d"?3:7; const dates=[...new Set(rows.map(r=>r.dt))].sort(); const out:BalanceOutcome[]=[];
  for (let i=0;i<dates.length-h;i++) { const dt=dates[i]; const futureDt=dates[i+h]; const future=(rows as any[]).filter(r=>r.dt===futureDt); const futureMetrics=future.map(metric); const futureEff=future.map(eff); for (const r of (rows as any[]).filter(r=>r.dt===dt)) { const f=future.find(x=>id(x,entityType)===id(r,entityType)); if (!f) continue; const m=metric(f); const e=eff(f); const refund=f.refundRate??f.productRefundRate??null; out.push({ dt, entityType, entityId:id(r,entityType), horizon, futureNetPayAmt:m, futurePayAmt:f.payAmt??f.productPayAmt??f.paidGmv, futureGmvCostRatio:f.gmvCostRatio??null, futureRefundRate:refund, futureRoi:f.overallPaymentRoi??null, futureLowEfficiency:percentileRank(futureEff,e)<=25, futureHighRefund:(refund??0)>=0.2, futureTopQuantile:percentileRank(futureMetrics,m)>=75, futureBottomQuantile:percentileRank(futureMetrics,m)<=25 }); } }
  return out;
}
