import { describe, it, expect } from "vitest";
import {
  getPriceFieldEditability,
  isProtectedPosition,
  isSummaryControlledRow,
} from "./materialPriceEditability";

describe("isProtectedPosition", () => {
  it.each(["LA", "FR", "PC"])("returns true for protected position %s", (position) => {
    expect(isProtectedPosition(position)).toBe(true);
  });

  it.each(["PN", "SP", "AC"])("returns false for material position %s", (position) => {
    expect(isProtectedPosition(position)).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isProtectedPosition("la")).toBe(true);
    expect(isProtectedPosition("pn")).toBe(false);
  });

  it("returns false for empty/undefined", () => {
    expect(isProtectedPosition("")).toBe(false);
    expect(isProtectedPosition(undefined as unknown as string)).toBe(false);
  });
});

describe("getPriceFieldEditability", () => {
  describe("protected positions (LA / FR / PC)", () => {
    it.each(["LA", "FR", "PC"])(
      "CHARGEABLE on %s: discount + totalAmount editable in GROSS_PRICE",
      (position) => {
        const result = getPriceFieldEditability(position, "CHARGEABLE", "GROSS_PRICE");
        expect(result).toEqual({ discount: true, totalAmount: true, netAmount: false });
      },
    );

    it.each(["LA", "FR", "PC"])(
      "CHARGEABLE on %s: discount + netAmount editable in NET_PRICE",
      (position) => {
        const result = getPriceFieldEditability(position, "CHARGEABLE", "NET_PRICE");
        expect(result).toEqual({ discount: true, totalAmount: false, netAmount: true });
      },
    );

    it.each(["LA", "FR", "PC"])(
      "COMMERCIAL_GOODWILL on %s: discount + totalAmount editable in GROSS_PRICE",
      (position) => {
        const result = getPriceFieldEditability(position, "COMMERCIAL_GOODWILL", "GROSS_PRICE");
        expect(result).toEqual({ discount: true, totalAmount: true, netAmount: false });
      },
    );

    it.each(["LA", "FR", "PC"])(
      "COMMERCIAL_GOODWILL on %s: discount + netAmount editable in NET_PRICE",
      (position) => {
        const result = getPriceFieldEditability(position, "COMMERCIAL_GOODWILL", "NET_PRICE");
        expect(result).toEqual({ discount: true, totalAmount: false, netAmount: true });
      },
    );

    it.each(["WARRANTY", "SERVICE_OFFERING", "SPECIAL_CONTRACT", ""])(
      "%s on a protected position: nothing editable",
      (jobType) => {
        const result = getPriceFieldEditability("LA", jobType, "GROSS_PRICE");
        expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
      },
    );
  });

  describe("material positions (PN / SP / AC)", () => {
    it.each(["PN", "SP", "AC"])(
      "COMMERCIAL_GOODWILL on %s: discount + totalAmount editable in GROSS_PRICE",
      (position) => {
        const result = getPriceFieldEditability(position, "COMMERCIAL_GOODWILL", "GROSS_PRICE");
        expect(result).toEqual({ discount: true, totalAmount: true, netAmount: false });
      },
    );

    it.each(["PN", "SP", "AC"])(
      "COMMERCIAL_GOODWILL on %s: discount + netAmount editable in NET_PRICE",
      (position) => {
        const result = getPriceFieldEditability(position, "COMMERCIAL_GOODWILL", "NET_PRICE");
        expect(result).toEqual({ discount: true, totalAmount: false, netAmount: true });
      },
    );

    // The key rule this module exists to make explicit and testable: CHARGEABLE material
    // rows are NOT row-editable, regardless of mode — the summary panel owns the discount
    // for these and propagates it down via distributeGrossToRows/distributeNetToRows.
    it.each(["PN", "SP", "AC"])(
      "CHARGEABLE on %s: nothing row-editable in GROSS_PRICE (summary-controlled instead)",
      (position) => {
        const result = getPriceFieldEditability(position, "CHARGEABLE", "GROSS_PRICE");
        expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
      },
    );

    it.each(["PN", "SP", "AC"])(
      "CHARGEABLE on %s: nothing row-editable in NET_PRICE (summary-controlled instead)",
      (position) => {
        const result = getPriceFieldEditability(position, "CHARGEABLE", "NET_PRICE");
        expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
      },
    );

    it.each(["WARRANTY", "SERVICE_OFFERING", "SPECIAL_CONTRACT", ""])(
      "%s on a material position: nothing editable",
      (jobType) => {
        const result = getPriceFieldEditability("SP", jobType, "GROSS_PRICE");
        expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
      },
    );
  });

  it("is case-insensitive on jobType", () => {
    const result = getPriceFieldEditability("SP", "commercial_goodwill", "GROSS_PRICE");
    expect(result.discount).toBe(true);
  });

  it("treats an unknown position as a material (non-protected) position", () => {
    const result = getPriceFieldEditability("ZZ", "CHARGEABLE", "GROSS_PRICE");
    expect(result).toEqual({ discount: false, totalAmount: false, netAmount: false });
  });
});

describe("isSummaryControlledRow", () => {
  it.each(["PN", "SP", "AC"])("returns true for CHARGEABLE on material position %s", (position) => {
    expect(isSummaryControlledRow(position, "CHARGEABLE")).toBe(true);
  });

  it.each(["PN", "SP", "AC"])(
    "returns false for COMMERCIAL_GOODWILL on material position %s",
    (position) => {
      expect(isSummaryControlledRow(position, "COMMERCIAL_GOODWILL")).toBe(false);
    },
  );

  it.each(["LA", "FR", "PC"])(
    "returns false for CHARGEABLE on protected position %s (row itself is editable there)",
    (position) => {
      expect(isSummaryControlledRow(position, "CHARGEABLE")).toBe(false);
    },
  );
});
