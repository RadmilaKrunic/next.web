import { describe, it, expect } from "vitest";
import { extractDiagnosticFromValidateResponse } from "./JobOverview.utils";

describe("extractDiagnosticFromValidateResponse", () => {
  it("returns data.diagnostic when present", () => {
    const data = { diagnostic: { id: "D1", materials: [] } } as any;
    const res = extractDiagnosticFromValidateResponse(data, "J1");
    expect(res).toEqual(data.diagnostic);
  });

  it("constructs diagnostic from top-level fields when jobId present", () => {
    const data = { materials: [], priceSummaryDetailed: { total: 1 }, actionType: "REPAIR" } as any;
    const res = extractDiagnosticFromValidateResponse(data, "J2");
    expect(res).toBeDefined();
    expect((res as any).jobId).toBe("J2");
    expect((res as any).materials).toBeDefined();
  });

  it("returns undefined when no diagnostic info or jobId missing", () => {
    const data = { unrelated: true } as any;
    expect(extractDiagnosticFromValidateResponse(data, "J3")).toBeUndefined();
    expect(extractDiagnosticFromValidateResponse({ materials: [] } as any)).toBeUndefined();
  });
});
