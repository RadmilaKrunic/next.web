import { describe, it, expect } from "vitest";
import {
  selectConfigForSurface,
  resolvePositionRule,
  isPositionProtected,
  resolvePositionPermissions,
  resolveEditability,
  isSummaryControlledRow,
  resolveAutomaticRows,
  resolveAllowedPositions,
  resolveEnforceSparepartExists,
} from "./itemRulesResolver";
import { ItemPolicyConfig } from "api/services/itemPolicy/itemPolicy.types";
import { DiagnosticsRuleEntry } from "api/services/countryConfiguration/countryConfiguration";

const baseConfig: ItemPolicyConfig = {
  version: "1",
  countryCode: "TR",
  positions: [
    {
      position: "LA",
      isProtected: true,
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
      isEditable: true,
      controlledBySummary: false,
    },
    {
      contextType: "jobType",
      contextValue: "CHARGEABLE",
      appliesToProtectedPositionsOnly: true,
      isEditable: true,
      controlledBySummary: false,
    },
    {
      contextType: "jobType",
      contextValue: "CHARGEABLE",
      appliesToProtectedPositionsOnly: false,
      isEditable: false,
      controlledBySummary: true,
    },
    {
      contextType: "isNewRow",
      contextValue: "true",
      appliesToProtectedPositionsOnly: false,
      isEditable: true,
      controlledBySummary: false,
    },
    {
      contextType: "isNewRow",
      contextValue: "false",
      appliesToProtectedPositionsOnly: false,
      isEditable: false,
      controlledBySummary: false,
    },
  ],
  warrantyGating: { gatedTypes: ["WARRANTY"], disableTypeOptionsWhenInvalidSparePart: true },
  surfaceOverrides: {
    claimSpareParts: {
      editability: [
        {
          contextType: "claimStatus",
          contextValue: "REVISED",
          appliesToProtectedPositionsOnly: false,
          isEditable: true,
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

describe("resolvePositionRule / isPositionProtected / resolvePositionPermissions", () => {
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

  it("resolves permissions for a known position and null for an unknown one", () => {
    expect(resolvePositionPermissions(baseConfig, "SP")?.canDelete).toBe("DS_I");
    expect(resolvePositionPermissions(baseConfig, "ZZ")).toBeNull();
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

  it("exposes netAmount instead of totalAmount in NET_PRICE mode", () => {
    expect(
      resolveEditability(
        baseConfig,
        { position: "LA", context: "jobType", contextValue: "CHARGEABLE" },
        "NET_PRICE",
      ),
    ).toEqual({ discount: true, totalAmount: false, netAmount: true });
  });

  it("stays all-false in NET_PRICE mode when not editable", () => {
    expect(
      resolveEditability(
        baseConfig,
        { position: "SP", context: "jobType", contextValue: "CHARGEABLE" },
        "NET_PRICE",
      ),
    ).toEqual({ discount: false, totalAmount: false, netAmount: false });
  });

  // "isNewRow" backs claim spare parts' real editability rule (a new/not-yet-saved row has
  // editable price fields; an existing row doesn't) — resolved the same way as jobType/
  // claimStatus rules, just keyed on a different context dimension (see Phase 5 unification
  // plan, items-and-prices-refactor.md §15).
  it("resolves isNewRow context the same way as jobType/claimStatus", () => {
    expect(
      resolveEditability(baseConfig, {
        position: "SP",
        context: "isNewRow",
        contextValue: "true",
      }),
    ).toEqual({ discount: true, totalAmount: true, netAmount: false });

    expect(
      resolveEditability(baseConfig, {
        position: "SP",
        context: "isNewRow",
        contextValue: "false",
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

// Fixtures below mirror the real shape/values observed in TR's
// CountryConfig.diagnosticsConfiguration.rules — position eligibility and
// quantity/unitPrice sources genuinely vary per (actionType, jobType), not globally.
const diagnosticsRules: DiagnosticsRuleEntry[] = [
  {
    actionType: "REPAIR",
    jobType: "WARRANTY",
    rule: {
      automaticRows: ["LA"],
      allowedPositions: [
        {
          position: "LA",
          minCount: 1,
          maxCount: 1,
          quantity: { quantitySource: "FAULT_CODES", defaultQuantity: null },
          unitPriceSource: "SAP",
        },
        {
          position: "SP",
          minCount: 0,
          maxCount: 2147483647,
          quantity: { quantitySource: null, defaultQuantity: null },
          unitPriceSource: "SAP",
        },
        {
          position: "FR",
          minCount: 0,
          maxCount: 1,
          quantity: { quantitySource: "DEFAULT", defaultQuantity: 1 },
          unitPriceSource: "ASC",
        },
      ],
      enforceSparepartExists: true,
    },
  },
  {
    actionType: "NEW_TOOL_EXCHANGE",
    jobType: "WARRANTY",
    rule: {
      automaticRows: ["PN", "LA"],
      allowedPositions: [
        {
          position: "LA",
          minCount: 1,
          maxCount: 1,
          quantity: { quantitySource: "DEFAULT", defaultQuantity: 2 },
          unitPriceSource: "SAP",
        },
        {
          position: "PN",
          minCount: 1,
          maxCount: 1,
          quantity: { quantitySource: null, defaultQuantity: 1 },
          unitPriceSource: "SAP",
        },
      ],
      enforceSparepartExists: false,
    },
  },
];

describe("resolveAutomaticRows", () => {
  it("returns the automatic positions for a matching actionType/jobType", () => {
    expect(resolveAutomaticRows(diagnosticsRules, "REPAIR", "WARRANTY")).toEqual(["LA"]);
    expect(resolveAutomaticRows(diagnosticsRules, "NEW_TOOL_EXCHANGE", "WARRANTY")).toEqual([
      "PN",
      "LA",
    ]);
  });

  it("returns an empty array when no rule matches", () => {
    expect(resolveAutomaticRows(diagnosticsRules, "ACCESSORIES_EXCHANGE", "WARRANTY")).toEqual([]);
  });
});

describe("resolveAllowedPositions", () => {
  it("scopes allowed positions to the matching rule only", () => {
    const repairPositions = resolveAllowedPositions(diagnosticsRules, "REPAIR", "WARRANTY").map(
      (p) => p.position,
    );
    expect(repairPositions).toEqual(["LA", "SP", "FR"]);

    // PN is only eligible under NEW_TOOL_EXCHANGE, never REPAIR.
    expect(repairPositions).not.toContain("PN");

    const exchangePositions = resolveAllowedPositions(
      diagnosticsRules,
      "NEW_TOOL_EXCHANGE",
      "WARRANTY",
    ).map((p) => p.position);
    expect(exchangePositions).toEqual(["LA", "PN"]);
    expect(exchangePositions).not.toContain("SP");
  });

  it("returns an empty array when no rule matches", () => {
    expect(resolveAllowedPositions(diagnosticsRules, "SPARE_PARTS_EXCHANGE", "CHARGEABLE")).toEqual(
      [],
    );
  });
});

describe("resolveEnforceSparepartExists", () => {
  it("reads the flag from the matching rule", () => {
    expect(resolveEnforceSparepartExists(diagnosticsRules, "REPAIR", "WARRANTY")).toBe(true);
    expect(resolveEnforceSparepartExists(diagnosticsRules, "NEW_TOOL_EXCHANGE", "WARRANTY")).toBe(
      false,
    );
  });

  it("defaults to false when no rule matches", () => {
    expect(resolveEnforceSparepartExists(diagnosticsRules, "ACCESSORIES_EXCHANGE", "WARRANTY")).toBe(
      false,
    );
  });
});
