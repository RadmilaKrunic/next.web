import { describe, it, expect } from "vitest";
import { PERMISSIONS } from "./Permissions";

describe("PERMISSIONS", () => {
  it("exports ACCESS permissions", () => {
    expect(PERMISSIONS.ACCESS.CAN_ACCESS_ASC_GLOBALLY).toBe("AG_M");
    expect(PERMISSIONS.ACCESS.CAN_ACCESS_ASC_IN_COUNTRY).toBe("AC_M");
  });

  it("exports APPROVAL permissions", () => {
    expect(PERMISSIONS.APPROVAL.CAN_VIEW).toBe("A__V");
    expect(PERMISSIONS.APPROVAL.CAN_PERFORM_CLAIM_DECISION).toBe("AC_A");
  });

  it("exports FEATURE_FLAGS permissions", () => {
    expect(PERMISSIONS.FEATURE_FLAGS.CAN_VIEW).toBe("FF_V");
    expect(PERMISSIONS.FEATURE_FLAGS.CAN_TOGGLE).toBe("FF_T");
  });

  it("exports DIAGNOSTICS permissions", () => {
    expect(PERMISSIONS.DIAGNOSTICS.CAN_VIEW_DIAGNOSTICS_ON_JOBS_AND_CLAIMS).toBe("D__V");
    expect(PERMISSIONS.DIAGNOSTICS.CAN_VIEW_NET_DEALER_PRICE).toBe("D_NV");
  });

  it("all permission values are strings", () => {
    const allValues: string[] = [];
    const traverse = (obj: Record<string, unknown>) => {
      for (const v of Object.values(obj)) {
        if (typeof v === "string") allValues.push(v);
        else if (typeof v === "object" && v !== null) traverse(v as Record<string, unknown>);
      }
    };
    traverse(PERMISSIONS as unknown as Record<string, unknown>);
    expect(allValues.length).toBeGreaterThan(0);
    allValues.forEach((v) => expect(typeof v).toBe("string"));
  });
});
