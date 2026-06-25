import { describe, it, expect, vi, beforeEach } from "vitest";
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
import { PERMISSIONS } from "utils/Permissions";
import {
  computeIsChargeable,
  getChargeablePendingInfo,
  getBoschInternalPending,
  buildRowValues,
  useDiagnosticsManager,
  type MaterialItem,
} from "./useDiagnosticsManager";
import type Field from "components/generics/Field/GenericField.types";
import type Area from "components/generics/Area/GenericArea.types";
import type Section from "components/generics/Section/GenericSection.types";
import type {
  AllowedPosition,
  CountryConfig,
} from "api/services/countryConfiguration/countryConfiguration";
import type { HeaderUserData } from "api/services/header/action";

const makeField = (name: string, subtype?: string, overrides: Partial<Field> = {}): Field =>
  ({
    name,
    label: name,
    type: "text",
    subtype,
    isDisabled: false,
    ...overrides,
  }) as Field;

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

const makeArea = (name: string, fields: Field[], index = 0): Area =>
  ({
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
  }) as Area;

const makeDiagnosticsTab = (areas: Area[]): Section =>
  ({
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
  }) as Section;

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

const makeCountryConfig = (allowedPositions: AllowedPosition[]): CountryConfig =>
  ({
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
          },
        },
      ],
    },
  }) as CountryConfig;

const makeUser = (permissions: string[] = []): HeaderUserData =>
  ({
    countryCode: "ZA",
    permissions,
    type: "SERVICE_CENTER",
  }) as HeaderUserData;

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

interface HookOverride {
  permissions?: string[];
  allowedPositions?: AllowedPosition[];
  diagnosticData?: { jobId?: string; materials?: unknown[]; archivedMaterials?: unknown[] };
  allFields?: Field[];
  tabs?: Section[];
  formValues?: Record<string, unknown>;
  arePricesValidated?: boolean;
  jobStatus?: string;
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

  return {
    props: {
      diagnosticData: overrides.diagnosticData,
      currentActionType: "REPAIR",
      currentJobType: "CHARGEABLE",
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
      jobStatus: overrides.jobStatus ?? "",
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

// ── computeIsChargeable ──────────────────────────────────────────────────────

describe("computeIsChargeable", () => {
  it("returns null when no diagnosticType fields exist", () => {
    const fields = [makeField("someField")];
    const values = { someField: "REPAIR" };
    expect(computeIsChargeable(fields, values)).toBeNull();
  });

  it("returns true when any diagnosticType field equals CHARGEABLE", () => {
    const fields = [makeField("type1", "diagnosticType"), makeField("type2", "diagnosticType")];
    const values = { type1: "WARRANTY", type2: "CHARGEABLE" };
    expect(computeIsChargeable(fields, values)).toBe(true);
  });

  it("returns false when all diagnosticType fields are non-CHARGEABLE", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "WARRANTY" };
    expect(computeIsChargeable(fields, values)).toBe(false);
  });

  it("returns false when diagnosticType field value is empty", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "" };
    expect(computeIsChargeable(fields, values)).toBe(false);
  });
});

// ── getChargeablePendingInfo ─────────────────────────────────────────────────

describe("getChargeablePendingInfo", () => {
  it("returns no pending when all chargeable rows are APPROVED", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "CHARGEABLE", status1: "APPROVED" };
    const { hasChargeablePending } = getChargeablePendingInfo(fields, values);
    expect(hasChargeablePending).toBe(false);
  });

  it("returns pending when a CHARGEABLE row is not APPROVED", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "CHARGEABLE", status1: "PENDING" };
    const { hasChargeablePending } = getChargeablePendingInfo(fields, values);
    expect(hasChargeablePending).toBe(true);
  });

  it("returns pending for SPECIAL_CONTRACT row not APPROVED", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "SPECIAL_CONTRACT", status1: "PENDING" };
    const { hasChargeablePending } = getChargeablePendingInfo(fields, values);
    expect(hasChargeablePending).toBe(true);
  });

  it("returns false when WARRANTY row is not APPROVED (not chargeable)", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "WARRANTY", status1: "PENDING" };
    const { hasChargeablePending } = getChargeablePendingInfo(fields, values);
    expect(hasChargeablePending).toBe(false);
  });

  it("marks row as pending when status field is absent", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "CHARGEABLE" };
    const { hasChargeablePending, pendingTypeFields } = getChargeablePendingInfo(fields, values);
    expect(hasChargeablePending).toBe(true);
    expect(pendingTypeFields).toHaveLength(1);
  });
});

// ── getBoschInternalPending ──────────────────────────────────────────────────

describe("getBoschInternalPending", () => {
  it("returns pending for COMMERCIAL_GOODWILL row not APPROVED", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "COMMERCIAL_GOODWILL", status1: "PENDING" };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(true);
  });

  it("returns pending for WARRANTY row with exchange actionType", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "WARRANTY", status1: "PENDING", actionType: "NEW_TOOL_EXCHANGE" };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(true);
  });

  it("returns pending for SERVICE_OFFERING row with exchange actionType", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = {
      type1: "SERVICE_OFFERING",
      status1: "PENDING",
      actionType: "SPARE_PARTS_EXCHANGE",
    };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(true);
  });

  it("returns false for WARRANTY row with non-exchange actionType (REPAIR)", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "WARRANTY", status1: "PENDING", actionType: "REPAIR" };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(false);
  });

  it("returns false when all rows are APPROVED", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "COMMERCIAL_GOODWILL", status1: "APPROVED" };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(false);
  });

  it("returns false for CHARGEABLE row (not a Bosch internal type)", () => {
    const fields = [
      makeField("type1", "diagnosticType"),
      makeField("status1", "diagnosticMaterialStatus"),
    ];
    const values = { type1: "CHARGEABLE", status1: "PENDING", actionType: "REPAIR" };
    const { hasBoschInternalPending } = getBoschInternalPending(fields, values);
    expect(hasBoschInternalPending).toBe(false);
  });
});

// ── buildRowValues ───────────────────────────────────────────────────────────

describe("buildRowValues", () => {
  it("maps item fields to area fields by subtype", () => {
    const areaFields: Field[] = [
      makeField("sparePart_position", "diagnosticPosition"),
      makeField("sparePart_partNumber", "diagnosticPartNumber"),
      makeField("sparePart_quantity", "diagnosticQuantity"),
      makeField("sparePart_unitPrice", "diagnosticUnitPrice"),
      makeField("sparePart_status", "diagnosticMaterialStatus"),
    ];
    const item = makeItem({
      position: "SP",
      partNumber: "ABC",
      quantity: 3,
      unitPrice: 100,
      status: "PENDING",
    });
    const result = buildRowValues(areaFields, item);

    expect(result["sparePart_position"]).toBe("SP");
    expect(result["sparePart_partNumber"]).toBe("ABC");
    expect(result["sparePart_quantity"]).toBe(3);
    expect(result["sparePart_unitPrice"]).toBe(100);
    expect(result["sparePart_status"]).toBe("PENDING");
  });

  it("uses default status PENDING when item has no status", () => {
    const areaFields: Field[] = [makeField("status_field", "diagnosticMaterialStatus")];
    const item = makeItem({ status: undefined });
    const result = buildRowValues(areaFields, item);
    expect(result["status_field"]).toBe("PENDING");
  });

  it("computes suggestedNetPrice from qty*unitPrice when item.suggestedNetPrice is 0", () => {
    const areaFields: Field[] = [makeField("snp", "diagnosticSuggestedNetPrice")];
    const item = makeItem({ quantity: 4, unitPrice: 25, suggestedNetPrice: 0 });
    const result = buildRowValues(areaFields, item);
    expect(result["snp"]).toBe(100);
  });

  it("uses item.suggestedNetPrice when provided and non-zero", () => {
    const areaFields: Field[] = [makeField("snp", "diagnosticSuggestedNetPrice")];
    const item = makeItem({ quantity: 4, unitPrice: 25, suggestedNetPrice: 90 });
    const result = buildRowValues(areaFields, item);
    expect(result["snp"]).toBe(90);
  });

  it("uses field defaultValue for unknown subtypes", () => {
    const areaFields: Field[] = [
      makeField("unknown_field", "unknownSubtype", { defaultValue: "DEFAULT" }),
    ];
    const item = makeItem();
    const result = buildRowValues(areaFields, item);
    expect(result["unknown_field"]).toBe("DEFAULT");
  });

  it("uses empty string as fallback when no subtype match and no defaultValue", () => {
    const areaFields: Field[] = [makeField("mystery_field", "noSuchSubtype")];
    const item = makeItem();
    const result = buildRowValues(areaFields, item);
    expect(result["mystery_field"]).toBe("");
  });

  it("defaults discount to 0 when item.discount is undefined", () => {
    const areaFields: Field[] = [makeField("disc", "diagnosticDiscount")];
    const item = makeItem({ discount: undefined as unknown as number });
    const result = buildRowValues(areaFields, item);
    expect(result["disc"]).toBe(0);
  });

  it("defaults totalAmount to 0 when item.totalAmount is 0", () => {
    const areaFields: Field[] = [makeField("total", "diagnosticTotalAmount")];
    const item = makeItem({ totalAmount: 0 });
    const result = buildRowValues(areaFields, item);
    expect(result["total"]).toBe(0);
  });
});

describe("useDiagnosticsManager hook behavior", () => {
  it("filters allowed positions by permission and sorts dropdown options", () => {
    const { props } = createHookProps({ permissions: [] });
    const { result } = renderHook(() => useDiagnosticsManager(props));

    expect(result.current.allowedPositions.map((p) => p.position)).toEqual(["SP", "PN", "LA"]);
    expect(result.current.positionDropdownOptions.map((p) => p.value)).toEqual(["LA", "PN", "SP"]);
  });

  it("resolves quantities for USER, DEFAULT, FAULT_CODES and LA labour override", () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useDiagnosticsManager(props));

    expect(result.current.getQuantityForPosition("SP", "FC:9", 5)).toBeUndefined();
    expect(result.current.getQuantityForPosition("PN", "FC:9", 5)).toBe(4);
    expect(result.current.getQuantityForPosition("LA", "FC:9", 0)).toBe(9);
    expect(result.current.getQuantityForPosition("LA", "FC:9", 7)).toBe(7);
  });

  it("loads API materials and marks flags", async () => {
    const { props } = createHookProps({
      diagnosticData: {
        jobId: "J-1",
        materials: [
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
      },
    });

    const { result } = renderHook(() => useDiagnosticsManager(props));

    await waitFor(() => {
      expect(result.current.apiMaterialsLoaded).toBe(true);
      expect(result.current.apiMaterialsEmpty).toBe(false);
      expect(result.current.materials).toHaveLength(1);
    });

    expect(result.current.materials[0].description).toBe("labourCost");
    expect(result.current.materials[0].isValidated).toBe(true);
  });

  it("adds imported materials and skips duplicates", async () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useDiagnosticsManager(props));

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

  it("adds new empty row with blank type selection", async () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useDiagnosticsManager(props));

    act(() => {
      result.current.onAddRow(props.formValuesRef.current);
    });

    await waitFor(() => {
      expect(result.current.materials.some((m) => m.type === "")).toBe(true);
    });
  });

  it("deletes row and disables validated prices", async () => {
    const { props, mocks } = createHookProps();
    const { result } = renderHook(() => useDiagnosticsManager(props));

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

  it("restores archived row as pending and unvalidated", async () => {
    const { props, mocks } = createHookProps({
      diagnosticData: {
        archivedMaterials: [
          {
            position: "SP",
            partNumber: "ARCH-1",
            description: "Old part",
            type: "WARRANTY",
            quantity: 1,
            status: "ARCHIVED",
            price: { unitPrice: 1, netAmount: 1, tax: 0, grossAmount: 1, totalAmount: 1 },
          },
        ],
      },
    });

    const { result } = renderHook(() => useDiagnosticsManager(props));

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
    const { result } = renderHook(() => useDiagnosticsManager(props));

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

  it("enableValidate reflects arePricesValidated and pending archived deletions", () => {
    const { props } = createHookProps({ arePricesValidated: true });
    const { result } = renderHook(() => useDiagnosticsManager(props));

    expect(result.current.enableValidate()).toBe(false);

    act(() => {
      result.current.setMaterials([makeItem({ partNumber: "Z" })]);
      result.current.onDeleteRow("diagnosticData_diagnosticsSpareParts#0");
    });

    expect(result.current.enableValidate()).toBe(true);
  });

  it("returns canArchiveOnDelete false for IN_DIAGNOSTICS status", () => {
    const { props } = createHookProps({
      jobStatus: "IN_DIAGNOSTICS",
      permissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_FREIGHT_ITEMS],
    });
    const { result } = renderHook(() => useDiagnosticsManager(props));

    expect(result.current.canArchiveOnDelete).toBe(false);
  });
});
