import { describe, it, expect } from "vitest";
import {
  selectConfigForSurface,
  resolvePositionRule,
  isPositionProtected,
  resolveEditability,
  isSummaryControlledRow,
  resolveAutomaticRows,
} from "./itemRulesResolver";
import { ItemRulesConfig } from "api/services/itemRules/itemRules.types";

const baseConfig: ItemRulesConfig = {
  version: "1",
  countryCode: "TR",
  discountBase: "GROSS_PRICE",
  addSpecialMaterialsAllowed: true,
  positions: [
    {
      position: "LA",
      isProtected: true,
      minCount: 0,
      maxCount: 1,
      quantitySource: "SYSTEM",
      unitPriceSource: "SYSTEM",
      permissions: {
        canView: "DL_V",
        canDelete: "DL_I",
        canEditUnits: "DLUE",
        canEditUnitPrice: "DLPE",
        canEditDiscount: "DLDE",
        canEditTotal: "DLTE",
      },
    },
    {
      position: "SP",
      isProtected: false,
      minCount: 0,
      maxCount: 10,
      quantitySource: "MANUAL",
      unitPriceSource: "SYSTEM",
      permissions: {
        canView: "DS_V",
        canDelete: "DS_I",
        canEditUnits: "DSUE",
        canEditUnitPrice: "DSPE",
        canEditDiscount: "DSDE",
        canEditTotal: "DSTE",
      },
    },
  ],
  editability: [
    {
      contextType: "jobType",
      contextValue: "COMMERCIAL_GOODWILL",
      appliesToProtectedPositionsOnly: false,
      fields: { discount: true, totalAmount: true, netAmount: false },
      controlledBySummary: false,
    },
    {
      contextType: "jobType",
      contextValue: "CHARGEABLE",
      appliesToProtectedPositionsOnly: true,
      fields: { discount: true, totalAmount: true, netAmount: false },
      controlledBySummary: false,
    },
    {
      contextType: "jobType",
      contextValue: "CHARGEABLE",
      appliesToProtectedPositionsOnly: false,
      fields: { discount: false, totalAmount: false, netAmount: false },
      controlledBySummary: true,
    },
  ],
  automaticRows: [{ actionType: "REPAIR", jobType: "CHARGEABLE", automaticPositions: ["LA"] }],
  warrantyGating: { gatedTypes: ["WARRANTY"], disableTypeOptionsWhenInvalidSparePart: true },
  surfaceOverrides: {
    claimSpareParts: {
      editability: [
        {
          contextType: "claimStatus",
          contextValue: "REVISED",
          appliesToProtectedPositionsOnly: false,
          fields: { discount: true, totalAmount: true, netAmount: false },
          controlledBySummary: false,
        },
      ],
    },
  },
};

describe("selectConfigForSurface", () => {
  it("returns the base config when no surface is given", () => {
    expect(selectConfigForSurface(baseConfig)).toBe(baseConfig);
  });

  it("returns the base config when the surface has no override", () => {
    expect(selectConfigForSurface(baseConfig, "jobDiagnostics")).toBe(baseConfig);
  });

  it("merges a surface override on top of the base config", () => {
    const merged = selectConfigForSurface(baseConfig, "claimSpareParts");
    expect(merged.editability).toHaveLength(1);
    expect(merged.editability[0].contextValue).toBe("REVISED");
    expect(merged.positions).toBe(baseConfig.positions);
  });
});

describe("resolvePositionRule / isPositionProtected", () => {
  it("finds a position rule case-insensitively", () => {
    expect(resolvePositionRule(baseConfig, "la")?.position).toBe("LA");
  });

  it("returns null for an unknown position", () => {
    expect(resolvePositionRule(baseConfig, "ZZ")).toBeNull();
  });

  it("reports protected vs non-protected positions", () => {
    expect(isPositionProtected(baseConfig, "LA")).toBe(true);
    expect(isPositionProtected(baseConfig, "SP")).toBe(false);
  });

  it("treats an unknown position as not protected", () => {
    expect(isPositionProtected(baseConfig, "ZZ")).toBe(false);
  });
});

describe("resolveEditability", () => {
  it("is editable for COMMERCIAL_GOODWILL regardless of position", () => {
    expect(
      resolveEditability(baseConfig, {
        position: "SP",
        context: "jobType",
        contextValue: "COMMERCIAL_GOODWILL",
      }),
    ).toEqual({ discount: true, totalAmount: true, netAmount: false });
  });

  it("is editable for CHARGEABLE on a protected position", () => {
    expect(
      resolveEditability(baseConfig, {
        position: "LA",
        context: "jobType",
        contextValue: "CHARGEABLE",
      }),
    ).toEqual({ discount: true, totalAmount: true, netAmount: false });
  });

  it("is not directly editable for CHARGEABLE on a non-protected position", () => {
    expect(
      resolveEditability(baseConfig, {
        position: "SP",
        context: "jobType",
        contextValue: "CHARGEABLE",
      }),
    ).toEqual({ discount: false, totalAmount: false, netAmount: false });
  });

  it("returns all-false when no rule matches", () => {
    expect(
      resolveEditability(baseConfig, {
        position: "SP",
        context: "jobType",
        contextValue: "WARRANTY",
      }),
    ).toEqual({ discount: false, totalAmount: false, netAmount: false });
  });
});

describe("isSummaryControlledRow", () => {
  it("is true for CHARGEABLE on a non-protected position", () => {
    expect(
      isSummaryControlledRow(baseConfig, {
        position: "SP",
        context: "jobType",
        contextValue: "CHARGEABLE",
      }),
    ).toBe(true);
  });

  it("is false for CHARGEABLE on a protected position", () => {
    expect(
      isSummaryControlledRow(baseConfig, {
        position: "LA",
        context: "jobType",
        contextValue: "CHARGEABLE",
      }),
    ).toBe(false);
  });

  it("is false when no rule matches", () => {
    expect(
      isSummaryControlledRow(baseConfig, {
        position: "SP",
        context: "jobType",
        contextValue: "WARRANTY",
      }),
    ).toBe(false);
  });
});

describe("resolveAutomaticRows", () => {
  it("returns the automatic positions for a matching actionType/jobType", () => {
    expect(resolveAutomaticRows(baseConfig, "REPAIR", "CHARGEABLE")).toEqual(["LA"]);
  });

  it("returns an empty array when no rule matches", () => {
    expect(resolveAutomaticRows(baseConfig, "EXCHANGE", "WARRANTY")).toEqual([]);
  });
});
