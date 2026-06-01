import type { DataQuality, DataQualityIssue, DataQualityIssueCode } from "./types.js";

export function createDataQuality(sampleSize = 0): DataQuality {
  return {
    usable: true,
    sampleSize,
    sampleLevel: sampleSize === 0 ? "none" : sampleSize < 5 ? "low" : sampleSize < 20 ? "medium" : "high",
    inventoryUsable: true,
    profitUsable: true,
    financeUsable: true,
    adAttributionUsable: true,
    adAttributionLevel: "none",
    issues: [],
  };
}

export function addIssue(
  dq: DataQuality,
  code: DataQualityIssueCode,
  message: string,
  severity: DataQualityIssue["severity"] = "warning",
  field?: string,
): DataQuality {
  dq.issues.push({ code, severity, message, field });
  if (severity === "critical") dq.usable = false;
  if (code === "mapping_missing") {
    dq.inventoryUsable = false;
    dq.profitUsable = false;
  }
  if (code === "finance_discontinuous") {
    dq.financeUsable = false;
    dq.profitUsable = false;
  }
  if (code === "ad_attribution_missing") {
    dq.adAttributionUsable = false;
    dq.adAttributionLevel = "none";
  }
  return dq;
}

export function hasIssue(dq: DataQuality, code: DataQualityIssueCode): boolean {
  return dq.issues.some((issue) => issue.code === code);
}

export function sampleAllowed(dq: DataQuality, min: "low" | "medium" | "high" = "low"): boolean {
  const order = { none: 0, low: 1, medium: 2, high: 3 } as const;
  return order[dq.sampleLevel ?? "none"] >= order[min];
}
