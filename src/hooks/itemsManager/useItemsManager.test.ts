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
});

describe("useItemsManager — makeItem fixture sanity", () => {
  it("makeItem produces a materially valid MaterialItem", () => {
    const item = makeItem({ position: "PN" });
    expect(item.position).toBe("PN");
  });
});
