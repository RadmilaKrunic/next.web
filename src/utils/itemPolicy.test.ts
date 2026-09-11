import { describe, it, expect } from "vitest";
import type { ItemPolicy } from "api/services/itemPolicy/itemPolicy.types";
import {
  allowsPermanentDelete,
  getDistributablePositions,
  getPositionAutofillMap,
  getPositionPermissions,
  isProtectedPosition,
  isWarrantyGatedType,
  resolvePriceFieldPolicy,
} from "./itemPolicy";

const PERMS = {
  canView: "V",
  canDelete: "D",
  canEditUnits: "U",
  canEditUnitPrice: "P",
  canEditDiscount: "DI",
  canEditTotal: "T",
};

const policy: ItemPolicy = {
  version: "test",
  countryCode: "ZA",
  positions: [
    {
      position: "LA",
      isProtected: true,
      isDistributable: false,
      autofill: { partNumber: "1609888887", descriptionKey: "labourCost" },
      permissions: PERMS,
    },
    { position: "SP", isProtected: false, isDistributable: true, permissions: PERMS },
  ],
  priceEditability: [
    {
      fieldSubTypes: ["diagnosticDiscount", "diagnosticTotalAmount", "diagnosticNetAmount"],
      contextType: "jobType",
      contextValue: "CHARGEABLE",
      appliesToProtectedPositionsOnly: true,
      isEditable: true,
      controlledBySummary: false,
    },
    {
      fieldSubTypes: ["diagnosticDiscount", "diagnosticTotalAmount", "diagnosticNetAmount"],
      contextType: "jobType",
      contextValue: "CHARGEABLE",
      appliesToProtectedPositionsOnly: false,
      isEditable: false,
      controlledBySummary: true,
    },
  ],
  fieldModeRestrictions: {
    diagnosticTotalAmount: "GROSS_PRICE",
    diagnosticNetAmount: "NET_PRICE",
  },
  warrantyGating: { gatedTypes: ["WARRANTY"], disableTypeOptionsWhenInvalidSparePart: true },
  statusesWithPermanentDelete: ["IN_DIAGNOSTICS"],
  surfaceOverrides: {
    claimDiagnosticsReadOnly: { priceEditability: [] },
  },
};

describe("itemPolicy", () => {
  it("resolves protected positions and permissions", () => {
    expect(isProtectedPosition(policy, "la")).toBe(true);
    expect(isProtectedPosition(policy, "SP")).toBe(false);
    expect(getPositionPermissions(policy, "SP")).toEqual(PERMS);
    expect(getPositionPermissions(policy, "XX")).toBeNull();
  });

  it("prefers the protected-position rule for protected rows", () => {
    expect(
      resolvePriceFieldPolicy(
        policy,
        { position: "LA", jobType: "CHARGEABLE", discountBase: "GROSS_PRICE" },
        "diagnosticDiscount",
      ),
    ).toEqual({ isEditable: true, controlledBySummary: false });
  });

  it("marks non-protected chargeable rows as summary controlled", () => {
    expect(
      resolvePriceFieldPolicy(
        policy,
        { position: "SP", jobType: "CHARGEABLE", discountBase: "GROSS_PRICE" },
        "diagnosticDiscount",
      ),
    ).toEqual({ isEditable: false, controlledBySummary: true });
  });

  it("applies discount-base restrictions per field", () => {
    const ctx = { position: "LA", jobType: "CHARGEABLE", discountBase: "NET_PRICE" };
    expect(resolvePriceFieldPolicy(policy, ctx, "diagnosticTotalAmount").isEditable).toBe(false);
    expect(resolvePriceFieldPolicy(policy, ctx, "diagnosticNetAmount").isEditable).toBe(true);
  });

  it("returns not-editable for unmatched contexts and missing policy", () => {
    expect(
      resolvePriceFieldPolicy(policy, { position: "LA", jobType: "WARRANTY" }, "diagnosticDiscount")
        .isEditable,
    ).toBe(false);
    expect(resolvePriceFieldPolicy(null, { position: "LA" }, "diagnosticDiscount").isEditable).toBe(
      false,
    );
  });

  it("honours surface overrides", () => {
    expect(
      resolvePriceFieldPolicy(
        policy,
        { position: "LA", jobType: "CHARGEABLE", surface: "claimDiagnosticsReadOnly" },
        "diagnosticDiscount",
      ).isEditable,
    ).toBe(false);
  });

  it("detects warranty gated types", () => {
    expect(isWarrantyGatedType(policy, "warranty")).toBe(true);
    expect(isWarrantyGatedType(policy, "CHARGEABLE")).toBe(false);
  });

  it("builds the position autofill map with translated descriptions", () => {
    const map = getPositionAutofillMap(policy, (key) => `t:${key}`);
    expect(map).toEqual({ LA: { partNumber: "1609888887", description: "t:labourCost" } });
    expect(getPositionAutofillMap(null, (key) => key)).toEqual({});
  });

  it("reads distributable positions and permanent-delete statuses", () => {
    expect(getDistributablePositions(policy)).toEqual(new Set(["SP"]));
    expect(allowsPermanentDelete(policy, "IN_DIAGNOSTICS")).toBe(true);
    expect(allowsPermanentDelete(policy, "REPAIR_DONE")).toBe(false);
    expect(allowsPermanentDelete(null, "IN_DIAGNOSTICS")).toBe(false);
  });
});
