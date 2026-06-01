import { describe, expect, it } from "vitest";
import { renderShadowReport } from "../packages/report-renderer/src/render-shadow-report.js";

describe("report renderer", () => {
  it("includes recommendation evidence and data-quality warnings", () => {
    const md = renderShadowReport(
      "2026-05-01",
      [
        {
          dt: "2026-05-01",
          entityType: "product",
          entityId: "p1",
          recommendationType: "add",
          score: 88,
          scoreBreakdown: {} as any,
          strength: "strong",
          rank: 1,
          evidence: [{ label: "Efficiency", value: 90, explanation: "good" }],
          dataQuality: { usable: true, issues: [{ code: "mapping_missing", severity: "warning", message: "missing" }] },
          configId: "c",
        },
      ],
      [],
      [],
    );
    expect(md).toContain("Efficiency=90");
    expect(md).toContain("mapping_missing");
    expect(md).toContain("not causal uplift proof");
  });
});
