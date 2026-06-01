import type { AdBalanceRow, BalanceRow, EntityType, FeatureGroupScores } from "../../core/src/types.js";
import { percentileRank } from "../../core/src/math.js";
function id(row: any, entityType: EntityType): string { return entityType==="room"?row.roomId:entityType==="product"?row.productId:entityType==="carrier"?row.carrierType:row.entityId; }
export interface FeatureRow { dt:string; entityType:EntityType; entityId:string; row:BalanceRow; features:FeatureGroupScores; futureLeakGuardMaxSourceDt:string; }
export function buildFeatureRows(rows: BalanceRow[], entityType: EntityType): FeatureRow[] {
  const byDate = new Map<string, BalanceRow[]>(); for (const r of rows) { const arr=byDate.get(r.dt)??[]; arr.push(r); byDate.set(r.dt,arr); }
  const out:FeatureRow[]=[];
  for (const [dt, group] of byDate) {
    const vals = (fn:(r:any)=>number|null|undefined) => group.map((r)=>fn(r)).filter((v):v is number=>typeof v==="number"&&Number.isFinite(v));
    const net=vals((r)=>r.netPayAmt??r.productNetPayAmt??r.paidGmv); const pay=vals((r)=>r.payAmt??r.productPayAmt??r.paidGmv); const eff=vals((r)=>r.gmvCostRatio??r.productClickDealRate??r.overallPaymentRoi??r.netContributionShare); const refund=vals((r)=>r.refundRate??r.productRefundRate??0); const growth=vals((r)=> entityType==="product" ? ((r.productClickDealRate??0)*(1-(r.exposureShareInRoom??0))) : entityType==="ad_material"||entityType==="ad_account" ? ((r.overallPaymentRoi??0)*(1-(r.costShare??0))) : (r.gmvCostRatio??r.netContributionShare??0));
    for (const row of group as any[]) {
      const contribution=percentileRank(net.length?net:pay, row.netPayAmt??row.productNetPayAmt??row.paidGmv??0);
      const efficiency=percentileRank(eff, row.gmvCostRatio??row.productClickDealRate??row.overallPaymentRoi??row.netContributionShare??0);
      const quality=100-percentileRank(refund, row.refundRate??row.productRefundRate??0);
      const stability=Math.max(0,100-((row.abnormalCount??0)*20)-((row.warningCount??0)*10));
      const growthSpace=percentileRank(growth, entityType==="product"?((row.productClickDealRate??0)*(1-(row.exposureShareInRoom??0))):entityType.startsWith("ad_")?((row.overallPaymentRoi??0)*(1-(row.costShare??0))):(row.gmvCostRatio??row.netContributionShare??0));
      let riskPenalty=100-quality + (row.dataQuality.issues.length*8); if (row.dataQuality.sampleLevel==="low") riskPenalty+=20; if (!row.dataQuality.usable) riskPenalty+=50;
      out.push({ dt, entityType, entityId:id(row, entityType), row, features:{ contribution, efficiency, quality, stability, growthSpace, riskPenalty:Math.min(100,riskPenalty) }, futureLeakGuardMaxSourceDt: dt });
    }
  }
  return out;
}
export function buildAllFeatureRows(tables:{rooms:BalanceRow[];products:BalanceRow[];carriers:BalanceRow[];ads:AdBalanceRow[]}) { return [ ...buildFeatureRows(tables.rooms,"room"), ...buildFeatureRows(tables.products,"product"), ...buildFeatureRows(tables.carriers,"carrier"), ...buildFeatureRows(tables.ads.filter(a=>a.entityType==="ad_account"),"ad_account"), ...buildFeatureRows(tables.ads.filter(a=>a.entityType==="ad_material"),"ad_material") ]; }
