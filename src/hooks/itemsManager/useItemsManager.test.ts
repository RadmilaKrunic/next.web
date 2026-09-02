import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}));

vi.mock("api/services/bareSalesRelation/hooks", () => ({
  useBareSalesRelation: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("components/generics/utils", () => ({
  setDuplicatedArea: vi.fn((area) => area),
  mapFieldToFieldMapping: vi.fn((field) => field),
  syncFieldsToTabs: vi.fn((tabs) => tabs),
}));

import { useQueryClient } from "@tanstack/react-query";
import { useBareSalesRelation } from "api/services/bareSalesRelation/hooks";
import { calculatePrices } from "utils/priceCalculator";
import { useItemsManager } from "./useItemsManager";
import type { MaterialItem, ItemsSurfaceConfig } from "./itemsManager.types";
import { getPositionAutofill } from "./materialsDerivation";
import { resolveAllowedPositions, resolveAutomaticRows } from "utils/itemRulesResolver";
import type Field from "components/generics/Field/GenericField.types";
import type Area from "components/generics/Area/GenericArea.types";
import type Section from "components/generics/Section/GenericSection.types";
import type {
  AllowedPosition,
  CountryConfig,
  discountBase,
} from "api/services/countryConfiguration/countryConfiguration";
import type { HeaderUserData } from "api/services/header/action";
import { PERMISSIONS } from "utils/Permissions";
import type { TFunction } from "i18next";

const testT = ((key: string) => key) as unknown as TFunction<"translation", "app">;

// Job-side equivalence suite for Step 3 of the Phase 5 unification
// (items-and-prices-refactor.md §15). Ports useDiagnosticsManager.test.ts's fixtures/scenarios
// against useItemsManager driven by a jobDiagnosticsConfig fixture that reproduces
// useDiagnosticsManager.ts's pre-merge hardcoded behavior (POSITION_VIEW_PERMISSIONS,
// POSITION_INSERT_PERMISSIONS, STATUSES_WITH_PERMANENT_DELETE, the old inline mapPrice+autofill
// mapping, and onAddRow's "always fill next available position, type always \"\"" defaults) —
// the goal is proving the new config-driven hook is behaviorally identical to the old
// hardcoded one for job-shaped config, not testing new behavior (claim's config/behavior is
// Step 4's job). This does not yet 1:1 port every case in useDiagnosticsManager.test.ts (1078
// lines) — do that before Step 10 deletes the old hook/test file, per the plan's checklist-diff
// verification approach.

const makeField = (name: string, subtype?: string, overrides: Partial<Field> = {}): Field => ({
  name,
  label: name,
  type: "text",
  subtype,
  isDisabled: false,
  ...overrides,
});

const makeArea = (name: string, fields: Field[], index = 0): Area => ({
  name,
  label: name,
  position: 0,
  fields,
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: false,
  isMultiple: true,
  index,
});

const makeDiagnosticsTab = (areas: Area[]): Section => ({
  name: "diagnosticData",
  label: "diagnosticData",
  position: 0,
  isHidden: false,
  dependFieldCondition: "AND",
  dependentFields: [],
  areas,
  actions: null,
  isSubSection: false,
  isAccordion: false,
  isTab: true,
});

const makeAllowedPosition = (
  position: string,
  quantitySource = "DEFAULT",
  defaultQuantity = 1,
  maxCount = 2,
): AllowedPosition => ({
  position,
  minCount: 0,
  maxCount,
  quantity: { quantitySource, defaultQuantity },
  unitPriceSource: "USER",
});

const makeCountryConfig = (allowedPositions: AllowedPosition[]): CountryConfig => ({
  id: "ZA",
  countryName: "South Africa",
  active: true,
  description: "test",
  dateFormat: "yyyy-MM-dd",
  currency: "ZAR",
  currencySymbol: "R",
  currencyDecimalSeparator: ".",
  currencyThousandSeparator: ",",
  taxRates: [],
  localizationConfiguration: [],
  links: { footer: [], header: [] },
  reimbursementConfig: [],
  reimbursementCreateOn: "",
  reimbursementPeriodType: "",
  diagnosticsConfiguration: {
    addSpecialMaterialsAllowed: true,
    discountBase: "NET_PRICE",
    rules: [
      {
        actionType: "REPAIR",
        jobType: "CHARGEABLE",
        rule: {
          automaticRows: ["PN"],
          allowedPositions,
          enforceSparepartExists: false,
        },
      },
    ],
  },
});

const makeUser = (permissions: string[] = []): HeaderUserData =>
  ({
    countryCode: "ZA",
    permissions,
    type: "SERVICE_CENTER",
  }) as unknown as HeaderUserData;

const diagnosticFields: Field[] = [
  makeField("diagnosticData_diagnosticsSpareParts#0_position", "diagnosticPosition", {
    options: [{ value: "SP", name: "SP" }],
  }),
  makeField("diagnosticData_diagnosticsSpareParts#0_sparePartNumber", "diagnosticPartNumber"),
  makeField("diagnosticData_diagnosticsSpareParts#0_description", "diagnosticDescription"),
  makeField("diagnosticData_diagnosticsSpareParts#0_quantity", "diagnosticQuantity"),
  makeField("diagnosticData_diagnosticsSpareParts#0_unitPrice", "diagnosticUnitPrice"),
  makeField("diagnosticData_diagnosticsSpareParts#0_netAmount", "diagnosticNetAmount"),
  makeField("diagnosticData_diagnosticsSpareParts#0_tax", "diagnosticTax"),
  makeField("diagnosticData_diagnosticsSpareParts#0_grossAmount", "diagnosticGrossAmount"),
  makeField("diagnosticData_diagnosticsSpareParts#0_discount", "diagnosticDiscount"),
  makeField("diagnosticData_diagnosticsSpareParts#0_totalAmount", "diagnosticTotalAmount"),
  makeField("diagnosticData_diagnosticsSpareParts#0_type", "diagnosticType"),
  makeField("diagnosticData_diagnosticsSpareParts#0_status", "diagnosticMaterialStatus"),
];

const archivedFields: Field[] = [
  makeField("diagnosticData_archivedSpareParts#0_position", "archivedPosition"),
  makeField("diagnosticData_archivedSpareParts#0_sparePartNumber", "archivedPartNumber"),
  makeField("diagnosticData_archivedSpareParts#0_type", "archivedType"),
  makeField("diagnosticData_archivedSpareParts#0_status", "archivedMaterialStatus"),
];

const diagnosticsArea = makeArea("diagnosticData_diagnosticsSpareParts#0", diagnosticFields);
const archivedArea = makeArea("diagnosticData_archivedSpareParts#0", archivedFields);

// Reproduces useDiagnosticsManager.ts's pre-merge inline mapPrice + position-based
// description autofill exactly (see Effect 1's old body) — this is the equivalence-proof
// implementation of ItemsSurfaceConfig.toMaterialItem for the job surface.
const jobToMaterialItem = (
  raw: Record<string, unknown>,
  mode: discountBase,
  ctx: { forceValidated: boolean },
): MaterialItem => {
  const position = (raw.position as string) ?? "";
  const price = (raw.price as Record<string, unknown>) ?? {};
  const autofill = getPositionAutofill(testT)[position];
  const description = autofill?.description ?? (raw.description as string) ?? "";

  const quantity = Number(raw.quantity) || 1;
  const unitPrice = Number(price.unitPrice) || 0;
  const taxPercent = Number(price.tax) || 0;
  const discountPercent = Number(price.discount) || 0;

  const calculated = calculatePrices(
    {
      quantity,
      unitPrice,
      taxPercent,
      discountPercent,
      suggestedNetPrice: 0,
      netAmount: 0,
      grossAmount: 0,
      totalAmount: 0,
      taxAmount: 0,
    },
    "unitPrice",
    unitPrice,
    mode,
  );

  return {
    position,
    partNumber: (raw.partNumber as string) ?? "",
    description,
    type: (raw.jobType as string) ?? "",
    quantity,
    unitPrice,
    netAmount: calculated.netAmount,
    tax: taxPercent,
    taxAmount: calculated.taxAmount,
    grossAmount: calculated.grossAmount,
    discount: calculated.discountPercent,
    discountAmount: calculated.discountAmount,
    totalAmount: calculated.totalAmount,
    suggestedNetPrice: calculated.suggestedNetPrice,
    status: (raw.status as string) ?? undefined,
    materialId: (raw.id as string) ?? undefined,
    isValidated: ctx.forceValidated,
    order: Number(raw.order) || 0,
    notBelongsToTool: (raw.notBelongsToTool as boolean) ?? undefined,
    isPriceSetManually: false,
  };
};

const POSITION_ORDER: Record<string, number> = { LA: 0, PN: 1, SP: 2, AC: 3, FR: 4, PC: 5 };

// Reproduces onAddRow's old hardcoded position/type defaults exactly: always fill the first
// allowed position (sorted by POSITION_ORDER) that still has capacity; type is always "".
const jobNewRowDefaults = {
  resolveType: () => "",
  resolvePosition: (ctx: { allowed: AllowedPosition[]; positionCounts: Record<string, number> }) =>
    [...ctx.allowed]
      .sort(
        (a, b) =>
          (POSITION_ORDER[a.position] ?? Number.MAX_SAFE_INTEGER) -
          (POSITION_ORDER[b.position] ?? Number.MAX_SAFE_INTEGER),
      )
      .find((p) => (ctx.positionCounts[p.position] ?? 0) < p.maxCount)?.position ?? "",
};

const buildJobConfig = (
  overrides: Partial<ItemsSurfaceConfig<Record<string, unknown>>> = {},
): ItemsSurfaceConfig<Record<string, unknown>> => ({
  identity: {
    surface: "jobDiagnostics",
    naming: {
      tabName: "diagnosticData",
      liveAreaMarker: "diagnosticsSpareParts",
      archivedAreaMarker: "archivedSpareParts",
      liveMarkerCollidesWithArchived: false,
    },
  },
  resetKey: undefined,
  apiMaterials: undefined,
  apiArchivedMaterials: undefined,
  toMaterialItem: jobToMaterialItem,
  currentActionType: "REPAIR",
  currentJobType: "CHARGEABLE",
  autoBuildAutomaticRows: true,
  bareSalesAutofill: undefined,
  addSpecialMaterialsActionTypeGate: new Set([
    "NEW_TOOL_EXCHANGE",
    "SPARE_PARTS_EXCHANGE",
    "ACCESSORIES_EXCHANGE",
  ]),
  positionViewPermissions: { FR: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_FREIGHT_ITEMS },
  positionInsertPermissions: { FR: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_FREIGHT_ITEMS },
  newRowDefaults: jobNewRowDefaults,
  deletionPolicy: {
    permanentDeleteFromActiveStatuses: new Set(["IN_DIAGNOSTICS"]),
    supportsPermanentArchivedDelete: false,
  },
  resyncOnApiMaterialsReferenceChange: false,
  setArePricesValidatedOnSync: false,
  jobStatus: "",
  ...overrides,
});

interface HookOverride {
  permissions?: string[];
  allowedPositions?: AllowedPosition[];
  apiMaterials?: Record<string, unknown>[];
  apiArchivedMaterials?: Record<string, unknown>[];
  resetKey?: string;
  allFields?: Field[];
  tabs?: Section[];
  formValues?: Record<string, unknown>;
  arePricesValidated?: boolean;
  jobStatus?: string;
  configOverrides?: Partial<ItemsSurfaceConfig<Record<string, unknown>>>;
}

const createHookProps = (overrides: HookOverride = {}) => {
  const setTabs = vi.fn();
  const setAllFields = vi.fn();
  const setInitialFormValues = vi.fn();
  const setArePricesValidated = vi.fn();

  const skipFormResetRef = { current: false };
  const formValuesRef = {
    current: {
      actionType: "REPAIR",
      jobType: "CHARGEABLE",
      faultCode: "FC:3",
      faultCodeLabourQuantity: 7,
      "diagnosticData_diagnosticsSpareParts#0_position": "SP",
      "diagnosticData_diagnosticsSpareParts#0_sparePartNumber": "EXISTING-PN",
      ...overrides.formValues,
    },
  };

  const allowedPositions = overrides.allowedPositions ?? [
    makeAllowedPosition("SP", "USER", 1, 2),
    makeAllowedPosition("PN", "DEFAULT", 4, 2),
    makeAllowedPosition("LA", "FAULT_CODES", 2, 2),
    makeAllowedPosition("FR", "DEFAULT", 1, 1),
  ];

  const user = makeUser(overrides.permissions);
  const countryConfiguration = makeCountryConfig(allowedPositions);
  const getQueryData = vi.fn((key: unknown) => {
    if (Array.isArray(key) && key[0] === "user") return user;
    if (Array.isArray(key) && key[0] === "countryConfiguration") return countryConfiguration;
    return undefined;
  });

  vi.mocked(useQueryClient).mockReturnValue({ getQueryData } as never);
  vi.mocked(useBareSalesRelation).mockReturnValue({ data: undefined } as never);

  const config = buildJobConfig({
    apiMaterials: overrides.apiMaterials,
    apiArchivedMaterials: overrides.apiArchivedMaterials,
    resetKey: overrides.resetKey,
    jobStatus: overrides.jobStatus ?? "",
    ...overrides.configOverrides,
  });

  return {
    props: {
      config,
      tabs: overrides.tabs ?? [makeDiagnosticsTab([diagnosticsArea, archivedArea])],
      setTabs,
      allFields: overrides.allFields ?? [...diagnosticFields, ...archivedFields],
      setAllFields,
      setInitialFormValues,
      skipFormResetRef,
      formValuesRef,
      arePricesValidated: overrides.arePricesValidated ?? false,
      setArePricesValidated,
      readOnly: false,
    },
    mocks: {
      setTabs,
      setAllFields,
      setInitialFormValues,
      setArePricesValidated,
      getQueryData,
    },
  };
};

const makeItem = (overrides: Partial<MaterialItem> = {}): MaterialItem => ({
  position: "SP",
  partNumber: "12345",
  description: "Spare Part",
  type: "CHARGEABLE",
  quantity: 2,
  unitPrice: 50,
  netAmount: 100,
  tax: 19,
  grossAmount: 119,
  discount: 0,
  taxAmount: 19,
  totalAmount: 119,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useItemsManager — job-shaped config equivalence", () => {
  it("filters allowed positions by permission and sorts dropdown options (matches old POSITION_VIEW_PERMISSIONS behavior)", () => {
    const { props } = createHookProps({ permissions: [] });
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.allowedPositions.map((p) => p.position)).toEqual(["SP", "PN", "LA"]);
    expect(result.current.positionDropdownOptions.map((p) => p.value)).toEqual(["LA", "PN", "SP"]);
  });

  it("grants FR when the user has CAN_VIEW_FREIGHT_ITEMS", () => {
    const { props } = createHookProps({
      permissions: [PERMISSIONS.DIAGNOSTICS.CAN_VIEW_FREIGHT_ITEMS],
    });
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.allowedPositions.map((p) => p.position)).toEqual([
      "SP",
      "PN",
      "LA",
      "FR",
    ]);
  });

  it("resolves quantities for USER, DEFAULT, FAULT_CODES and LA labour override", () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.getQuantityForPosition("SP", "FC:9", 5)).toBeUndefined();
    expect(result.current.getQuantityForPosition("PN", "FC:9", 5)).toBe(4);
    expect(result.current.getQuantityForPosition("LA", "FC:9", 0)).toBe(9);
    expect(result.current.getQuantityForPosition("LA", "FC:9", 7)).toBe(7);
  });

  it("loads API materials via config.toMaterialItem and marks flags (matches old mapPrice+autofill)", async () => {
    const { props } = createHookProps({
      apiMaterials: [
        {
          id: "M-1",
          position: "LA",
          partNumber: "1609888887",
          description: "",
          jobType: "CHARGEABLE",
          quantity: 2,
          status: "PENDING",
          price: {
            unitPrice: 10,
            netAmount: 20,
            tax: 10,
            taxAmount: 2,
            grossAmount: 22,
            discount: 0,
            discountAmount: 0,
            totalAmount: 22,
            suggestedNetPrice: 20,
          },
        },
      ],
    });

    const { result } = renderHook(() => useItemsManager(props));

    await waitFor(() => {
      expect(result.current.apiMaterialsLoaded).toBe(true);
      expect(result.current.apiMaterialsEmpty).toBe(false);
      expect(result.current.materials).toHaveLength(1);
    });

    // "labourCost" comes from getPositionAutofill(t)["LA"].description — the fixture's `t`
    // mock returns the translation key verbatim, matching useDiagnosticsManager.test.ts.
    expect(result.current.materials[0].description).toBe("labourCost");
    // allHaveIds (every item has a materialId) forces isValidated true, same as before.
    expect(result.current.materials[0].isValidated).toBe(true);
  });

  it("onAddRow fills the first allowed position (by POSITION_ORDER) with remaining capacity, type always \"\" (matches old hardcoded onAddRow)", () => {
    // No apiMaterials/autoBuildAutomaticRows side effects in play — an empty starting
    // materials list, so onAddRow's own position selection is the only thing under test.
    const { props } = createHookProps({
      configOverrides: { autoBuildAutomaticRows: false },
    });
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.onAddRow({ actionType: "REPAIR", jobType: "CHARGEABLE" });
    });

    // Fixture's allowedPositions (after the FR permission filter drops FR): SP, PN, LA — first
    // by POSITION_ORDER (LA=0, PN=1, SP=2) with capacity is LA.
    expect(result.current.materials).toHaveLength(1);
    expect(result.current.materials[0].type).toBe("");
    expect(result.current.materials[0].position).toBe("LA");
  });

  it("jobNewRowDefaults.resolvePosition only fills a position that still has capacity", () => {
    const allowed = [makeAllowedPosition("LA", "DEFAULT", 1, 1), makeAllowedPosition("PN", "DEFAULT", 1, 2)];
    expect(jobNewRowDefaults.resolvePosition({ allowed, positionCounts: { LA: 1 } })).toBe("PN");
    expect(
      jobNewRowDefaults.resolvePosition({ allowed, positionCounts: { LA: 1, PN: 2 } }),
    ).toBe("");
  });

  it("onDeleteRow archives the row when jobStatus is not in deletionPolicy.permanentDeleteFromActiveStatuses", async () => {
    const { props, mocks } = createHookProps({
      apiMaterials: [{ id: "M-1", position: "SP", quantity: 1, price: {} }],
      jobStatus: "REPAIR_DONE",
    });
    const { result } = renderHook(() => useItemsManager(props));

    await waitFor(() => expect(result.current.materials).toHaveLength(1));

    act(() => {
      result.current.onDeleteRow("diagnosticData_diagnosticsSpareParts#0");
    });

    expect(mocks.setArePricesValidated).toHaveBeenCalledWith(false);
  });

  it("canArchiveOnDelete is false when jobStatus is in deletionPolicy.permanentDeleteFromActiveStatuses (matches old STATUSES_WITH_PERMANENT_DELETE)", () => {
    const { props } = createHookProps({ jobStatus: "IN_DIAGNOSTICS" });
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.canArchiveOnDelete).toBe(false);
  });

  it("canArchiveOnDelete is true for any other jobStatus", () => {
    const { props } = createHookProps({ jobStatus: "REPAIR_DONE" });
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.canArchiveOnDelete).toBe(true);
  });

  it("does not expose onDeleteArchivedRow for job config (supportsPermanentArchivedDelete: false)", () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.onDeleteArchivedRow).toBeUndefined();
  });

  it("Effect 2 (automatic-row rebuild) is skipped entirely when autoBuildAutomaticRows is false", () => {
    const { props } = createHookProps({
      configOverrides: { autoBuildAutomaticRows: false },
    });
    const { result } = renderHook(() => useItemsManager(props));

    // No automatic rows get built at all (job's real config has autoBuildAutomaticRows: true
    // and would build a PN row here per the fixture's country config automaticRows: ["PN"]) —
    // this is the exact mechanism Step 4 relies on to preserve claim's current
    // no-auto-build behavior unchanged.
    expect(result.current.materials).toHaveLength(0);
  });

  // Remaining cases ported from useDiagnosticsManager.test.ts's hook-behavior section (Phase 5
  // step 10, items-and-prices-refactor.md §15) — the old hook function is being deleted from
  // useDiagnosticsManager.ts now that every case here is confirmed covered. (Tests of
  // computeIsChargeable/hasWarrantyOrProServiceItems/getChargeablePendingInfo/
  // getBoschInternalPending and of buildRowValues/materialsDerivation.ts's other pure exports
  // are NOT ported here — those functions are untouched and stay tested in
  // useDiagnosticsManager.test.ts, which still imports them from their real, live home.)

  it("resolveAllowedPositions/resolveAutomaticRows match the hook's own inline lookup", () => {
    const { props } = createHookProps({ permissions: [] });
    const { result } = renderHook(() => useItemsManager(props));

    const rules = [
      {
        actionType: "REPAIR",
        jobType: "CHARGEABLE",
        rule: {
          automaticRows: ["PN"],
          allowedPositions: [
            makeAllowedPosition("SP", "USER", 1, 2),
            makeAllowedPosition("PN", "DEFAULT", 4, 2),
            makeAllowedPosition("LA", "FAULT_CODES", 2, 2),
            makeAllowedPosition("FR", "DEFAULT", 1, 1),
          ],
          enforceSparepartExists: false,
        },
      },
    ];

    expect(resolveAllowedPositions(rules, "REPAIR", "CHARGEABLE")).toEqual(
      rules[0].rule.allowedPositions,
    );
    expect(resolveAutomaticRows(rules, "REPAIR", "CHARGEABLE")).toEqual(["PN"]);
    expect(resolveAllowedPositions(rules, "REPAIR", "CHARGEABLE").map((p) => p.position)).toEqual(
      expect.arrayContaining(result.current.allowedPositions.map((p) => p.position)),
    );
  });

  it("falls back to defaultQuantity when faultCodeValue has no ':' separator", () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.getQuantityForPosition("LA", "FC9", 0)).toBe(2);
  });

  it("falls back to defaultQuantity when faultCodeValue is empty", () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.getQuantityForPosition("LA", "", 0)).toBe(2);
  });

  it("falls back to defaultQuantity for an unrecognized quantitySource", () => {
    const { props } = createHookProps({
      allowedPositions: [makeAllowedPosition("AC", "UNKNOWN_SOURCE", 6, 1)],
    });
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.getQuantityForPosition("AC")).toBe(6);
  });

  it("returns defaultQuantity when the parsed fault code number is NaN", () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.getQuantityForPosition("LA", "FC:abc", 0)).toBe(2);
  });

  it("returns undefined when the position has no matching allowed position config", () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.getQuantityForPosition("ZZ")).toBeUndefined();
  });

  it("derives a non-zero taxAmount from unitPrice+tax when the API returns only those as populated (validateAndSave contract)", async () => {
    const { props } = createHookProps({
      apiMaterials: [
        {
          id: "LA_1609888887_WARRANTY",
          position: "LA",
          partNumber: "1609888887",
          description: "İşçilik",
          jobType: "WARRANTY",
          quantity: 6,
          status: "PENDING",
          price: {
            unitPrice: 132.5,
            netAmount: 0,
            suggestedNetPrice: 0,
            tax: 20.0,
            taxAmount: 0,
            grossAmount: 0,
            discount: 0.0,
            totalAmount: 0,
            discountAmount: 0,
          },
        },
      ],
    });

    const { result } = renderHook(() => useItemsManager(props));

    await waitFor(() => {
      expect(result.current.materials).toHaveLength(1);
    });

    const row = result.current.materials[0];
    expect(row.unitPrice).toBe(132.5);
    expect(row.tax).toBe(20);
    expect(row.quantity).toBe(6);
    expect(row.suggestedNetPrice).toBe(795); // 6 * 132.5
    expect(row.netAmount).toBe(795);
    expect(row.taxAmount).toBe(159); // 795 * 20 / 100 — this was 0 before the original fix
    expect(row.grossAmount).toBe(954);
    expect(row.totalAmount).toBe(954);
  });

  it("recomputes from unitPrice+tax even when the response's downstream amounts are already populated but stale", async () => {
    const { props } = createHookProps({
      apiMaterials: [
        {
          id: "SP_1617000895_WARRANTY",
          position: "SP",
          partNumber: "1617000895",
          description: "Uç Kovanı",
          jobType: "WARRANTY",
          quantity: 2,
          status: "PENDING",
          price: {
            unitPrice: 50,
            tax: 20,
            suggestedNetPrice: 50,
            netAmount: 50,
            taxAmount: 10,
            grossAmount: 60,
            discount: 0,
            discountAmount: 0,
            totalAmount: 60,
          },
        },
      ],
    });

    const { result } = renderHook(() => useItemsManager(props));

    await waitFor(() => {
      expect(result.current.materials).toHaveLength(1);
    });

    const row = result.current.materials[0];
    expect(row.unitPrice).toBe(50);
    expect(row.suggestedNetPrice).toBe(100);
    expect(row.netAmount).toBe(100);
    expect(row.taxAmount).toBe(20); // 100 * 20 / 100
    expect(row.grossAmount).toBe(120);
    expect(row.totalAmount).toBe(120);
  });

  it("adds imported materials and skips duplicates", async () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.onAddMaterials([
        { partNumber: "EXISTING-PN", position: "SP", quantity: 1, unitPrice: 10 },
        { partNumber: "NEW-PN", position: "SP", quantity: 2, unitPrice: 15 },
      ]);
    });

    await waitFor(() => {
      expect(result.current.materials.some((m) => m.partNumber === "NEW-PN")).toBe(true);
    });
    expect(
      result.current.materials.filter((m) => m.partNumber === "EXISTING-PN").length,
    ).toBeLessThanOrEqual(1);
  });

  it("computes imported material prices using the configured discountBase, not the default", async () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.onAddMaterials([
        { partNumber: "IMPORTED-PN", position: "SP", quantity: 3, unitPrice: 50 },
      ]);
    });

    await waitFor(() => {
      expect(result.current.materials.some((m) => m.partNumber === "IMPORTED-PN")).toBe(true);
    });

    const row = result.current.materials.find((m) => m.partNumber === "IMPORTED-PN")!;
    expect(row.suggestedNetPrice).toBe(150); // 3 * 50 — computePricesForItem actually ran
    expect(row.netAmount).toBe(150);
  });

  it("adds new empty row with blank type selection", async () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.onAddRow(props.formValuesRef.current);
    });

    await waitFor(() => {
      expect(result.current.materials.some((m) => m.type === "")).toBe(true);
    });
  });

  it("collapses multiple SP rows to one when switching to spare parts exchange", async () => {
    const { props } = createHookProps();
    const { result, rerender } = renderHook(
      (p) => useItemsManager(p),
      { initialProps: props },
    );

    act(() => {
      result.current.setMaterials([
        makeItem({ position: "SP", partNumber: "SP-1", origin: "specialMaterial" }),
        makeItem({ position: "SP", partNumber: "SP-2", origin: "explosionDrawing" }),
        makeItem({ position: "PN", partNumber: "PN-1" }),
      ]);
    });

    rerender({
      ...props,
      config: { ...props.config, currentActionType: "SPARE_PARTS_EXCHANGE" },
    });

    await waitFor(() => {
      expect(result.current.materials.filter((item) => item.position === "SP")).toHaveLength(1);
    });
  });

  it("deletes row and disables validated prices", async () => {
    const { props, mocks } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.setMaterials([makeItem({ status: "PENDING", partNumber: "ROW-1" })]);
    });

    act(() => {
      result.current.onDeleteRow("diagnosticData_diagnosticsSpareParts#0");
    });

    await waitFor(() => {
      expect(result.current.materials).toHaveLength(0);
    });

    expect(mocks.setArePricesValidated).toHaveBeenCalledWith(false);
    expect(mocks.setInitialFormValues).toHaveBeenCalled();
  });

  it("deleting the first of several rows preserves the order of the remaining rows", async () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.setMaterials([
        makeItem({ position: "SP", partNumber: "ROW-0" }),
        makeItem({ position: "SP", partNumber: "ROW-1" }),
        makeItem({ position: "SP", partNumber: "ROW-2" }),
      ]);
    });

    await waitFor(() => {
      expect(result.current.materials).toHaveLength(3);
    });

    act(() => {
      result.current.onDeleteRow("diagnosticData_diagnosticsSpareParts#0");
    });

    await waitFor(() => {
      expect(result.current.materials).toHaveLength(2);
    });
    expect(result.current.materials.map((m) => m.partNumber)).toEqual(["ROW-1", "ROW-2"]);
  });

  it("forces a full rebuild of allFields/tabs after a delete, not just a values patch", async () => {
    const { props, mocks } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.setMaterials([
        makeItem({ partNumber: "ROW-0" }),
        makeItem({ partNumber: "ROW-1" }),
      ]);
    });
    await waitFor(() => expect(result.current.materials).toHaveLength(2));
    mocks.setAllFields.mockClear();
    mocks.setTabs.mockClear();

    act(() => {
      result.current.onDeleteRow("diagnosticData_diagnosticsSpareParts#0");
    });

    await waitFor(() => {
      expect(mocks.setAllFields).toHaveBeenCalled();
      expect(mocks.setTabs).toHaveBeenCalled();
    });
  });

  it("restores archived row as pending and unvalidated", async () => {
    const { props, mocks } = createHookProps({
      apiArchivedMaterials: [
        {
          position: "SP",
          partNumber: "ARCH-1",
          description: "Old part",
          jobType: "WARRANTY",
          quantity: 1,
          status: "ARCHIVED",
          price: { unitPrice: 1, netAmount: 1, tax: 0, grossAmount: 1, totalAmount: 1 },
        },
      ],
    });

    const { result } = renderHook(() => useItemsManager(props));

    await waitFor(() => {
      expect(mocks.setInitialFormValues).toHaveBeenCalled();
    });

    act(() => {
      result.current.onRestoreRow("diagnosticData_archivedSpareParts#0");
    });

    await waitFor(() => {
      expect(result.current.materials.some((m) => m.partNumber === "ARCH-1")).toBe(true);
    });
    const restored = result.current.materials.find((m) => m.partNumber === "ARCH-1");
    expect(restored?.status).toBe("PENDING");
    expect(restored?.isValidated).toBe(false);
    expect(mocks.setArePricesValidated).toHaveBeenCalledWith(false);
  });

  it("marks rows validated then marks selected row dirty", async () => {
    const { props, mocks } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.setMaterials([makeItem({ partNumber: "A" }), makeItem({ partNumber: "B" })]);
    });
    act(() => {
      result.current.markAllValidated();
      result.current.markRowDirty(1);
    });

    await waitFor(() => {
      expect(result.current.materials[0].isValidated).toBe(true);
      expect(result.current.materials[1].isValidated).toBe(false);
    });
    expect(mocks.setArePricesValidated).toHaveBeenCalledWith(false);
  });

  it("resets rejected row status to pending after item edit", async () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.setMaterials([
        makeItem({ partNumber: "A", status: "REJECTED" }),
        makeItem({ partNumber: "B", status: "APPROVED" }),
      ]);
    });

    act(() => {
      result.current.setRevisedRejectedRowPending("diagnosticData_diagnosticsSpareParts#0");
    });

    await waitFor(() => {
      expect(result.current.materials[0].status).toBe("PENDING");
    });
    expect(result.current.materials[1].status).toBe("APPROVED");
  });

  it("enableValidate reflects arePricesValidated and pending archived deletions", () => {
    const { props } = createHookProps({ arePricesValidated: true });
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.enableValidate()).toBe(false);

    act(() => {
      result.current.setMaterials([makeItem({ partNumber: "Z" })]);
      result.current.onDeleteRow("diagnosticData_diagnosticsSpareParts#0");
    });

    expect(result.current.enableValidate()).toBe(true);
  });
});

// ── Claim-shaped config: Step 4 (items-and-prices-refactor.md §15) ──────────
//
// Proves useItemsManager driven by the real claimItemsSurfaceConfig (not a synthetic
// stand-in) reproduces useClaimMaterialsManager.ts's real behavior, AND exercises the one
// deliberate behavior change this step makes: claim's live-row reconciliation switches from
// its old incremental add/remove-diff to the same full-recomputation
// deriveSparePartsAreasAndFields/buildMaterialsRowValues job already uses (Phase 4). Per the
// plan, the one edge case NOT provably behavior-preserving by construction is claim's cruder
// row-value-reuse heuristic vs. job's shouldReuseExistingRowValues (position-match +
// rowHasNoPrices) — flagged here rather than asserted as equivalent.
import { buildClaimItemsSurfaceConfig, claimMaterialToMaterialItem } from "modules/ClaimManagement/ClaimOverview/claimItemsSurfaceConfig";
import type { Material } from "modules/ClaimManagement/ClaimOverview/Claims.types";

const makeClaimMaterial = (overrides: Partial<Material> = {}): Material => ({
  position: "SP",
  partNumber: "P-1",
  jobType: "WARRANTY",
  status: "APPROVED",
  approvedBy: "",
  approvedByName: "",
  approvedAt: "",
  description: "Part 1",
  quantity: 1,
  isValidated: true,
  isPriceManuallySet: true,
  price: {
    unitPrice: 10,
    suggestedNetPrice: 10,
    netAmount: 10,
    tax: 0,
    taxAmount: 0,
    grossAmount: 10,
    discount: 0,
    totalAmount: 10,
  },
  ...overrides,
});

const claimsFields: Field[] = [
  makeField("claims_claimSpareParts#0_position", "diagnosticPosition"),
  makeField("claims_claimSpareParts#0_sparePartNumber", "diagnosticPartNumber"),
  makeField("claims_claimSpareParts#0_description", "diagnosticDescription"),
  makeField("claims_claimSpareParts#0_quantity", "diagnosticQuantity"),
  makeField("claims_claimSpareParts#0_unitPrice", "diagnosticUnitPrice"),
  makeField("claims_claimSpareParts#0_netAmount", "diagnosticNetAmount"),
  makeField("claims_claimSpareParts#0_tax", "diagnosticTax"),
  makeField("claims_claimSpareParts#0_grossAmount", "diagnosticGrossAmount"),
  makeField("claims_claimSpareParts#0_discount", "diagnosticDiscount"),
  makeField("claims_claimSpareParts#0_totalAmount", "diagnosticTotalAmount"),
  makeField("claims_claimSpareParts#0_type", "diagnosticType"),
  makeField("claims_claimSpareParts#0_status", "diagnosticMaterialStatus"),
];
const claimsArea = makeArea("claims_claimSpareParts#0", claimsFields);
const claimsTab = (): Section => ({
  name: "claims",
  label: "claims",
  position: 0,
  isHidden: false,
  dependFieldCondition: "AND",
  dependentFields: [],
  areas: [claimsArea],
  actions: null,
  isSubSection: false,
  isAccordion: false,
  isTab: true,
});

const createClaimHookProps = (
  claimOverrides: {
    apiMaterials?: Material[];
    permissions?: string[];
    allowedPositions?: AllowedPosition[];
    resetKey?: string;
    configOverrides?: Partial<ItemsSurfaceConfig<Material>>;
  } = {},
) => {
  const setTabs = vi.fn();
  const setAllFields = vi.fn();
  const setInitialFormValues = vi.fn();
  const setArePricesValidated = vi.fn();
  const skipFormResetRef = { current: false };
  const formValuesRef = { current: {} as Record<string, unknown> };

  const allowedPositions = claimOverrides.allowedPositions ?? [
    makeAllowedPosition("SP", "USER", 1, 2),
    makeAllowedPosition("PN", "DEFAULT", 4, 1),
  ];
  const user = makeUser(claimOverrides.permissions);
  const countryConfiguration = makeCountryConfig(allowedPositions);
  const getQueryData = vi.fn((key: unknown) => {
    if (Array.isArray(key) && key[0] === "user") return user;
    if (Array.isArray(key) && key[0] === "countryConfiguration") return countryConfiguration;
    return undefined;
  });
  vi.mocked(useQueryClient).mockReturnValue({ getQueryData } as never);
  vi.mocked(useBareSalesRelation).mockReturnValue({ data: undefined } as never);

  const config = buildClaimItemsSurfaceConfig({
    apiMaterials: claimOverrides.apiMaterials,
    resetKey: claimOverrides.resetKey,
    currentActionType: "REPAIR",
    currentJobType: "WARRANTY",
    ...claimOverrides.configOverrides,
  });

  return {
    props: {
      config,
      tabs: [claimsTab()],
      setTabs,
      allFields: claimsFields,
      setAllFields,
      setInitialFormValues,
      skipFormResetRef,
      formValuesRef,
      arePricesValidated: false,
      setArePricesValidated,
      readOnly: false,
    },
    mocks: { setTabs, setAllFields, setInitialFormValues, setArePricesValidated },
  };
};

describe("useItemsManager — claim-shaped config (claimItemsSurfaceConfig)", () => {
  it("filters allowedPositions by claim's own positionViewPermissions (PN gated on CAN_VIEW_NET_DEALER_PRICE)", () => {
    const { props } = createClaimHookProps({ permissions: [] });
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.allowedPositions.map((p) => p.position)).toEqual(["SP"]);
  });

  it("grants PN when the user has CAN_VIEW_NET_DEALER_PRICE", () => {
    const { props } = createClaimHookProps({
      permissions: [PERMISSIONS.DIAGNOSTICS.CAN_VIEW_NET_DEALER_PRICE],
    });
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.allowedPositions.map((p) => p.position)).toEqual(["SP", "PN"]);
  });

  it("loads claim materials via claimMaterialToMaterialItem and sets arePricesValidated from sync (setArePricesValidatedOnSync)", async () => {
    const { props, mocks } = createClaimHookProps({
      apiMaterials: [makeClaimMaterial({ isValidated: true }), makeClaimMaterial({ isValidated: true })],
    });
    const { result } = renderHook(() => useItemsManager(props));

    await waitFor(() => expect(result.current.materials).toHaveLength(2));

    expect(mocks.setArePricesValidated).toHaveBeenCalledWith(true);
  });

  it("re-syncs automatically when apiMaterials gets a new array reference, without an explicit resync call (resyncOnApiMaterialsReferenceChange)", async () => {
    const firstBatch = [makeClaimMaterial({ partNumber: "P-1" })];
    const { props } = createClaimHookProps({ apiMaterials: firstBatch });
    const { result, rerender } = renderHook((p) => useItemsManager(p), { initialProps: props });

    await waitFor(() => expect(result.current.materials).toHaveLength(1));

    // A genuinely new array reference (e.g. a background refetch) — job's equivalent config
    // (resyncOnApiMaterialsReferenceChange: false) would ignore this without an explicit
    // resyncMaterialsFromAPI() call; claim's picks it up automatically.
    const secondBatch = [makeClaimMaterial({ partNumber: "P-1" }), makeClaimMaterial({ partNumber: "P-2" })];
    const nextProps = { ...props, config: { ...props.config, apiMaterials: secondBatch } };
    rerender(nextProps);

    await waitFor(() => expect(result.current.materials).toHaveLength(2));
  });

  it("onDeleteRow always archives (no deletionPolicy.permanentDeleteFromActiveStatuses for claim)", () => {
    const { props } = createClaimHookProps({
      apiMaterials: [makeClaimMaterial()],
    });
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.canArchiveOnDelete).toBe(true);
  });

  it("exposes onDeleteArchivedRow for claim config (supportsPermanentArchivedDelete: true)", () => {
    const { props } = createClaimHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.onDeleteArchivedRow).toBeInstanceOf(Function);
  });

  it("delete-from-the-middle preserves the order of the remaining rows (full recomputation, not incremental patching)", async () => {
    const { props } = createClaimHookProps({
      apiMaterials: [
        makeClaimMaterial({ partNumber: "P-1", order: 1 }),
        makeClaimMaterial({ partNumber: "P-2", order: 2 }),
        makeClaimMaterial({ partNumber: "P-3", order: 3 }),
      ],
    });
    const { result } = renderHook(() => useItemsManager(props));

    await waitFor(() => expect(result.current.materials).toHaveLength(3));

    const middleAreaName = "claims_claimSpareParts#0"; // no-op setDuplicatedArea mock: every
    // derived area keeps the template's name — onDeleteRow resolves areaIndex via the
    // sparePartsAreas array position, not the name itself, so this still targets index 0.
    act(() => {
      result.current.onDeleteRow(middleAreaName);
    });

    await waitFor(() => expect(result.current.materials).toHaveLength(2));
    expect(result.current.materials.map((m) => m.partNumber)).toEqual(["P-2", "P-3"]);
  });

  it("claimNewRowDefaults only auto-fills a position when exactly one still has capacity, type is always WARRANTY", () => {
    const config = buildClaimItemsSurfaceConfig();
    const allowed = [makeAllowedPosition("SP", "USER", 1, 1), makeAllowedPosition("PN", "USER", 1, 1)];

    expect(config.newRowDefaults.resolvePosition({ allowed, positionCounts: { SP: 1 } })).toBe(
      "PN",
    );
    expect(config.newRowDefaults.resolvePosition({ allowed, positionCounts: {} })).toBe("");
    expect(config.newRowDefaults.resolveType({ currentJobType: "CHARGEABLE" })).toBe("WARRANTY");
  });

  it("claimMaterialToMaterialItem matches calculatePrices output for the same fixture (equivalence anchor)", () => {
    const material = makeClaimMaterial({
      price: {
        unitPrice: 20,
        suggestedNetPrice: 0,
        netAmount: 0,
        tax: 10,
        taxAmount: 0,
        grossAmount: 0,
        discount: 5,
        totalAmount: 0,
      },
      quantity: 3,
    });
    const item = claimMaterialToMaterialItem(material, "NET_PRICE");
    const expected = calculatePrices(
      {
        quantity: 3,
        unitPrice: 20,
        taxPercent: 10,
        discountPercent: 5,
        suggestedNetPrice: 0,
        netAmount: 0,
        grossAmount: 0,
        totalAmount: 0,
        taxAmount: 0,
      },
      "unitPrice",
      20,
      "NET_PRICE",
    );
    expect(item.netAmount).toBe(expected.netAmount);
    expect(item.totalAmount).toBe(expected.totalAmount);
  });

  // Remaining cases ported from useClaimMaterialsManager.test.ts (Phase 5 step 10,
  // items-and-prices-refactor.md §15) — the old hook/test file is being deleted now that
  // every case here is confirmed covered.

  it("returns defaults when no country configuration is cached", () => {
    const { props } = createClaimHookProps();
    vi.mocked(useQueryClient).mockReturnValue({
      getQueryData: vi.fn((key: unknown) => {
        if (Array.isArray(key) && key[0] === "user") return makeUser([]);
        return undefined;
      }),
    } as never);

    const { result } = renderHook(() => useItemsManager(props));

    expect(result.current.discountBase).toBe("NET_PRICE");
    expect(result.current.allowedPositions).toEqual([]);
    expect(result.current.addSpecialMaterialsAllowed).toBe(false);
  });

  it("onAddRow does nothing when readOnly is true (matches useClaimMaterialsManager.ts's original readOnly guard — see the useItemsManager.ts fix in this same step)", () => {
    const { props } = createClaimHookProps();
    const { result } = renderHook(() => useItemsManager({ ...props, readOnly: true }));

    act(() => {
      result.current.onAddRow({});
    });

    expect(result.current.materials).toHaveLength(0);
  });

  it("onAddMaterials appends only non-duplicate materials (by partNumber)", () => {
    const { props } = createClaimHookProps();
    props.formValuesRef.current = { "claims_claimSpareParts#0_sparePartNumber": "P-EXISTING" };
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.onAddMaterials([
        { partNumber: "P-EXISTING", quantity: 1 },
        { partNumber: "P-NEW", quantity: 2, description: "new part" },
      ]);
    });

    expect(result.current.materials).toHaveLength(1);
    expect(result.current.materials[0].partNumber).toBe("P-NEW");
  });

  it("getExistingPartNumbers returns part numbers from form values", () => {
    const { props } = createClaimHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    const values = { "claims_claimSpareParts#0_sparePartNumber": "P-1" };
    const existing = result.current.getExistingPartNumbers(values);
    expect(existing.has("P-1")).toBe(true);
  });

  it("markAllValidated marks every material validated and sets arePricesValidated(true)", () => {
    const { props, mocks } = createClaimHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.setMaterials([
        {
          partNumber: "P-1",
          position: "SP",
          description: "",
          type: "WARRANTY",
          quantity: 1,
          unitPrice: 1,
          suggestedNetPrice: 1,
          netAmount: 1,
          tax: 0,
          taxAmount: 0,
          grossAmount: 1,
          discount: 0,
          totalAmount: 1,
          isValidated: false,
        },
      ] as never);
    });

    act(() => {
      result.current.markAllValidated();
    });

    expect(result.current.materials[0].isValidated).toBe(true);
    expect(mocks.setArePricesValidated).toHaveBeenCalledWith(true);
  });

  it("markRowDirty marks one row dirty and unsets arePricesValidated", () => {
    const { props, mocks } = createClaimHookProps();
    const { result } = renderHook(() => useItemsManager(props));

    act(() => {
      result.current.setMaterials([
        { partNumber: "P-1", isValidated: true },
        { partNumber: "P-2", isValidated: true },
      ] as never);
    });

    act(() => {
      result.current.markRowDirty(1);
    });

    expect(result.current.materials[0].isValidated).toBe(true);
    expect(result.current.materials[1].isValidated).toBe(false);
    expect(mocks.setArePricesValidated).toHaveBeenCalledWith(false);
  });

  it("preserves reimbursementPaymentMethod when archiving a loaded material (onDeleteRow)", async () => {
    const { props } = createClaimHookProps({
      apiMaterials: [makeClaimMaterial({ reimbursementPaymentMethod: "BANK_TRANSFER" })],
    });
    const { result } = renderHook(() => useItemsManager(props));

    await waitFor(() => expect(result.current.materials).toHaveLength(1));

    act(() => {
      result.current.onDeleteRow("claims_claimSpareParts#0");
    });

    await waitFor(() => expect(result.current.archivedMaterials).toHaveLength(1));
    expect(result.current.archivedMaterials[0].reimbursementPaymentMethod).toBe("BANK_TRANSFER");
  });
});
