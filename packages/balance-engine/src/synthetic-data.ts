export interface SyntheticData { roomRows: any[]; productRows: any[]; carrierRows: any[]; adRows: any[]; }
const dts = Array.from({ length: 30 }, (_, i) => `2026-05-${String(i + 1).padStart(2, "0")}`);
export function generateSyntheticData(): SyntheticData {
  const roomRows:any[]=[]; const productRows:any[]=[]; const carrierRows:any[]=[]; const adRows:any[]=[];
  for (const [dayIndex, dt] of dts.entries()) {
    for (let r=1; r<=20; r++) {
      const stable = r <= 4; const volatile = r >= 18; const base = stable ? 18000 : 7000 + r*220;
      const wave = volatile ? (dayIndex % 3 === 0 ? 0.35 : 1.75) : 1 + Math.sin((dayIndex+r)/5)*0.08;
      const payAmt = Math.round(base * wave); const refundRate = r === 7 ? 0.28 : stable ? 0.035 : 0.08 + (r%5)*0.015;
      const cost = Math.round(payAmt / (stable ? 5.4 : r === 12 ? 1.15 : 2.3 + (r%4)*0.35));
      roomRows.push({ dt, roomId:`room_${r}`, anchorId:`anchor_${r}`, anchorName:`Synthetic Anchor ${r}`, shopId:`shop_${1+(r%3)}`, payAmt, netPayAmt:Math.round(payAmt*(1-refundRate)), orderCnt:Math.round(payAmt/120), payUserCnt:Math.round(payAmt/160), cost, refundAmt:Math.round(payAmt*refundRate), liveHours: volatile ? 3 + (dayIndex%5) : 6, abnormalCount: volatile ? 3 : r===12 ? 2 : 0, warningCount: volatile ? 2 : 0 });
    }
    for (let p=1; p<=100; p++) {
      const roomId = `room_${1+(p%20)}`; const lowExposureHighConv = p<=10; const highClickLowPay = p>10&&p<=20; const highRefund = p>20&&p<=30; const tiny = p>95;
      const exposure = tiny ? 20 + p : lowExposureHighConv ? 450 + dayIndex*9 : 2200 + p*18;
      const ctr = lowExposureHighConv ? 0.22 : highClickLowPay ? 0.28 : 0.08 + (p%7)*0.01;
      const click = Math.round(exposure * ctr);
      const deal = lowExposureHighConv ? 0.24 : highClickLowPay ? 0.015 : 0.07 + (p%5)*0.006;
      const orders = Math.max(0, Math.round(click * deal)); const payAmt = orders * (80 + (p%9)*15);
      const refundRate = highRefund ? 0.36 : 0.04 + (p%4)*0.02;
      productRows.push({ dt, roomId, productId:`product_${p}`, productName:`Synthetic Product ${p}`, shopId:`shop_${1+(p%3)}`, productExposure:exposure, productClick:click, productPayAmt:payAmt, productNetPayAmt:Math.round(payAmt*(1-refundRate)), productOrderCnt:orders, productPayUserCnt:Math.max(0,orders-1), productRefundAmt:Math.round(payAmt*refundRate), skuId:p%4===0?null:`sku_${p}`, inventoryQty:p%4===0?null:50+p, costPrice:p%4===0?null:20+(p%10) });
    }
    for (const [i, carrierType] of ["live","short_video","product_card","search","other"].entries()) {
      const payAmt = [90000,35000,22000,18000,6000][i] + dayIndex*300 + i*500;
      carrierRows.push({ dt, shopId:"shop_1", carrierType, payAmt, netPayAmt:Math.round(payAmt*(carrierType==="short_video"?0.84:0.94)), orderCnt:Math.round(payAmt/110), payUserCnt:Math.round(payAmt/145), cost: carrierType==="live"?Math.round(payAmt/3):Math.round(payAmt/5), refundAmt: carrierType==="short_video"?Math.round(payAmt*.16):Math.round(payAmt*.06) });
    }
    for (let a=1; a<=10; a++) adRows.push({ dt, entityType:"ad_account", entityId:`ad_account_${a}`, shopId:`shop_${1+(a%3)}`, cost:2000+a*300, paidGmv:(a<=3?6:a===8?0.8:2.2)*(2000+a*300), paidOrderCnt:80+a, followupRoi:a===8?0.5:1.8, planId:null, campaignId:null, attributionWindow:null });
    for (let m=1; m<=50; m++) { const highCostLowRoi=m<=8; const highRoiLowSpend=m>8&&m<=18; const cost=highRoiLowSpend?180+m*3:highCostLowRoi?4500+m*50:700+m*20; const roi=highRoiLowSpend?7.5:highCostLowRoi?0.7:2.2+(m%6)*.25; adRows.push({ dt, entityType:"ad_material", entityId:`ad_material_${m}`, shopId:`shop_${1+(m%3)}`, cost, paidGmv:Math.round(cost*roi), paidOrderCnt:Math.round(cost*roi/100), followupRoi: highCostLowRoi?0.6:roi*.75, planId:null, campaignId:null, attributionWindow:null }); }
  }
  return { roomRows, productRows, carrierRows, adRows };
}
