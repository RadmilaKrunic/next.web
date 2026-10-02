import { describe, it, expect } from "vitest";
import { makeFieldGetter } from "./ClaimOverview.utils";

describe("ClaimOverview utils", () => {
  it("makeFieldGetter returns form value by subtype mapping", () => {
    const fields = [
      { name: "a.position", subtype: "diagnosticPosition" },
      { name: "a.partNumber", subtype: "diagnosticPartNumber" },
    ];
    const formValues = { "a.position": "POS1", "a.partNumber": "PN1" };
    const get = makeFieldGetter(fields as any, formValues);
    expect(get("diagnosticPosition")).toBe("POS1");
    expect(get("diagnosticPartNumber")).toBe("PN1");
    expect(get("unknown")).toBeUndefined();
  });
});
