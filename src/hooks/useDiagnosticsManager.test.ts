import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}));

vi.mock("api/services/bareSalesRelation/hooks", () => ({
  useBareSalesRelation: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("utils/scrollToError", () => ({
  scrollToTop: vi.fn(),
}));

vi.mock("components/generics/utils", () => ({
  setDuplicatedArea: vi.fn((area) => area),
  mapFieldToFieldMapping: vi.fn((field) => field),
  syncFieldsToTabs: vi.fn((tabs) => tabs),
}));

import { useQueryClient } from "@tanstack/react-query";
import { useBareSalesRelation } from "api/services/bareSalesRelation/hooks";
import { setDuplicatedArea } from "components/generics/utils";
import { scrollToTop } from "utils/scrollToError";
import { MessagesContext } from "@/contexts/messagescontext";
import { PERMISSIONS } from "utils/Permissions";
import {
  computeIsChargeable,
  getChargeablePendingInfo,
  getBoschInternalPending,
  hasWarrantyOrProServiceItems,
  buildRowValues,
  buildMaterialsRowValues,
  getSummaryDetailedRowValues,
  buildSummaryDetailedRowValues,
  getSummaryTotalRowValues,
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
import type { SummaryDetail } from "modules/JobManagement/JobList/JobList.types";

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

const makeSummaryDetail = (overrides: Partial<SummaryDetail> = {}): SummaryDetail => ({
  jobType: "CHARGEABLE",
  total: {
    discount: 10,
    grossAmount: 119,
    netAmount: 100,
    suggestedNetPrice: 100,
    taxAmount: 19,
    totalAmount: 109,
    discountAmount: 10,
  },
  materialRelated: {
    discount: 5,
    grossAmount: 59.5,
    netAmount: 50,
    suggestedNetPrice: 50,
    taxAmount: 9.5,
    totalAmount: 54.5,
    discountAmount: 5,
  },
  serviceRelated: {
    discount: 0,
    grossAmount: 0,
    netAmount: 0,
    suggestedNetPrice: 0,
    taxAmount: 0,
    totalAmount: 0,
    discountAmount: 0,
  },
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

interface HookOverride {
  permissions?: string[];
  allowedPositions?: AllowedPosition[];
  diagnosticData?: {
    jobId?: string;
    materials?: unknown[];
    archivedMaterials?: unknown[];
    priceSummaryDetailed?: unknown;
  };
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
  const formValuesRef: { current: Record<string, unknown> } = {
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

afterEach(() => {
  vi.unstubAllGlobals();
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

// ── hasWarrantyOrProServiceItems ───────────────────────────────────────────

describe("hasWarrantyOrProServiceItems", () => {
  it("returns true when a diagnostic type is WARRANTY", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "WARRANTY" };

    expect(hasWarrantyOrProServiceItems(fields, values)).toBe(true);
  });

  it("returns true when a diagnostic type is SERVICE_OFFERING", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "SERVICE_OFFERING" };

    expect(hasWarrantyOrProServiceItems(fields, values)).toBe(true);
  });

  it("returns false when diagnostic types do not match", () => {
    const fields = [makeField("type1", "diagnosticType")];
    const values = { type1: "CHARGEABLE" };

    expect(hasWarrantyOrProServiceItems(fields, values)).toBe(false);
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
    const item = makeItem({ discount: undefined });
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

describe("getSummaryDetailedRowValues", () => {
  it("maps total.* fields and jobType by subtype", () => {
    const areaFields: Field[] = [
      makeField("row0_suggestedNetPrice", "diagnosticSummarySuggestedNetPrice"),
      makeField("row0_netAmount", "diagnosticSummaryNetAmount"),
      makeField("row0_taxAmount", "diagnosticSummaryTaxAmount"),
      makeField("row0_grossAmount", "diagnosticSummaryGrossAmount"),
      makeField("row0_totalAmount", "diagnosticSummaryTotalAmount"),
      makeField("row0_jobType", "summaryDetailedJobType"),
    ];
    const item = makeSummaryDetail({ jobType: "WARRANTY" });
    const result = getSummaryDetailedRowValues(areaFields, item);

    expect(result["row0_suggestedNetPrice"]).toBe(item.total.suggestedNetPrice);
    expect(result["row0_netAmount"]).toBe(item.total.netAmount);
    expect(result["row0_taxAmount"]).toBe(item.total.taxAmount);
    expect(result["row0_grossAmount"]).toBe(item.total.grossAmount);
    expect(result["row0_totalAmount"]).toBe(item.total.totalAmount);
    expect(result["row0_jobType"]).toBe("WARRANTY");
  });

  it("maps the NET and GROSS discount fields from total.discount", () => {
    const areaFields: Field[] = [
      makeField("row0_discountNet", "diagnosticSummaryDiscountNet"),
      makeField("row0_discountGross", "diagnosticSummaryDiscount"),
    ];
    const item = makeSummaryDetail({ total: { ...makeSummaryDetail().total, discount: 42 } });
    const result = getSummaryDetailedRowValues(areaFields, item);

    expect(result["row0_discountNet"]).toBe(42);
    expect(result["row0_discountGross"]).toBe(42);
  });

  it("maps materialRelated.* fields for the chargeable material breakdown", () => {
    const areaFields: Field[] = [
      makeField("row0_matDiscountNet", "diagnosticSummaryDiscountNetMaterial"),
      makeField("row0_matNetAmount", "diagnosticSummaryNetAmountMaterial"),
      makeField("row0_matTaxAmount", "diagnosticSummaryTaxAmountMaterial"),
      makeField("row0_matGrossAmount", "diagnosticSummaryGrossAmountMaterial"),
      makeField("row0_matDiscountGross", "diagnosticSummaryDiscountMaterial"),
      makeField("row0_matTotalAmount", "diagnosticSummaryTotalAmountMaterial"),
    ];
    const item = makeSummaryDetail();
    const result = getSummaryDetailedRowValues(areaFields, item);

    expect(result["row0_matDiscountNet"]).toBe(item.materialRelated.discount);
    expect(result["row0_matNetAmount"]).toBe(item.materialRelated.netAmount);
    expect(result["row0_matTaxAmount"]).toBe(item.materialRelated.taxAmount);
    expect(result["row0_matGrossAmount"]).toBe(item.materialRelated.grossAmount);
    expect(result["row0_matDiscountGross"]).toBe(item.materialRelated.discount);
    expect(result["row0_matTotalAmount"]).toBe(item.materialRelated.totalAmount);
  });

  it("falls back to the field defaultValue when total/materialRelated are missing", () => {
    const areaFields: Field[] = [
      makeField("row0_suggestedNetPrice", "diagnosticSummarySuggestedNetPrice", {
        defaultValue: 0,
      }),
    ];
    const item = { jobType: "CHARGEABLE" } as unknown as SummaryDetail;
    const result = getSummaryDetailedRowValues(areaFields, item);

    expect(result["row0_suggestedNetPrice"]).toBe(0);
  });
});

describe("buildSummaryDetailedRowValues", () => {
  it("zips details[] with areas[] by index and merges each row's field values", () => {
    const chargeableFields: Field[] = [
      makeField("diagnosticsSummaryDetailed#0_jobType", "summaryDetailedJobType"),
      makeField("diagnosticsSummaryDetailed#0_totalAmount", "diagnosticSummaryTotalAmount"),
    ];
    const warrantyFields: Field[] = [
      makeField("diagnosticsSummaryDetailed#1_jobType", "summaryDetailedJobType"),
      makeField("diagnosticsSummaryDetailed#1_totalAmount", "diagnosticSummaryTotalAmount"),
    ];
    const areas = [
      makeArea("diagnosticsSummaryDetailed#0", chargeableFields, 0),
      makeArea("diagnosticsSummaryDetailed#1", warrantyFields, 1),
    ];
    const details = [
      makeSummaryDetail({
        jobType: "CHARGEABLE",
        total: { ...makeSummaryDetail().total, totalAmount: 100 },
      }),
      makeSummaryDetail({
        jobType: "WARRANTY",
        total: { ...makeSummaryDetail().total, totalAmount: 50 },
      }),
    ];

    const result = buildSummaryDetailedRowValues({
      details,
      areas,
      fields: [...chargeableFields, ...warrantyFields],
    });

    expect(result["diagnosticsSummaryDetailed#0_jobType"]).toBe("CHARGEABLE");
    expect(result["diagnosticsSummaryDetailed#0_totalAmount"]).toBe(100);
    expect(result["diagnosticsSummaryDetailed#1_jobType"]).toBe("WARRANTY");
    expect(result["diagnosticsSummaryDetailed#1_totalAmount"]).toBe(50);
  });

  it("skips a detail entry when there is no matching area at that index", () => {
    const fields: Field[] = [makeField("row0_jobType", "summaryDetailedJobType")];
    const areas = [makeArea("row0", fields, 0)];
    const details = [
      makeSummaryDetail({ jobType: "CHARGEABLE" }),
      makeSummaryDetail({ jobType: "WARRANTY" }),
    ];

    const result = buildSummaryDetailedRowValues({ details, areas, fields });

    expect(result["row0_jobType"]).toBe("CHARGEABLE");
    expect(Object.keys(result)).toHaveLength(1);
  });

  it("returns an empty object when details is undefined", () => {
    expect(buildSummaryDetailedRowValues({ details: undefined, areas: [], fields: [] })).toEqual(
      {},
    );
  });
});

describe("getSummaryTotalRowValues", () => {
  it("maps priceSummaryDetailed.total onto diagnosticsSummaryTotal's fields by subtype", () => {
    const areaFields: Field[] = [
      makeField("totalSuggestedNetPrice", "diagnosticSummarySuggestedNetPrice"),
      makeField("totalNetAmount", "diagnosticSummaryNetAmount"),
      makeField("totalTaxAmount", "diagnosticSummaryTaxAmount"),
      makeField("totalGrossAmount", "diagnosticSummaryGrossAmount"),
      makeField("totalAmount", "diagnosticSummaryTotalAmount"),
      makeField("totalDiscountNet", "diagnosticSummaryDiscountNet"),
      makeField("totalDiscountGross", "diagnosticSummaryDiscount"),
    ];
    const total = makeSummaryDetail().total;

    const result = getSummaryTotalRowValues(areaFields, total);

    expect(result["totalSuggestedNetPrice"]).toBe(total.suggestedNetPrice);
    expect(result["totalNetAmount"]).toBe(total.netAmount);
    expect(result["totalTaxAmount"]).toBe(total.taxAmount);
    expect(result["totalGrossAmount"]).toBe(total.grossAmount);
    expect(result["totalAmount"]).toBe(total.totalAmount);
    expect(result["totalDiscountNet"]).toBe(total.discount);
    expect(result["totalDiscountGross"]).toBe(total.discount);
  });

  it("falls back to the field defaultValue when total is undefined", () => {
    const areaFields: Field[] = [
      makeField("totalAmount", "diagnosticSummaryTotalAmount", { defaultValue: 0 }),
    ];

    const result = getSummaryTotalRowValues(areaFields);

    expect(result["totalAmount"]).toBe(0);
  });
});

describe("buildMaterialsRowValues (LA quantity sync)", () => {
  const rowFields: Field[] = [
    makeField("row0_position", "diagnosticPosition"),
    makeField("row0_quantity", "diagnosticQuantity"),
  ];
  const rowArea = makeArea("row0", rowFields);

  it("overrides the LA row's quantity with the freshly computed value even when reusing existing row values", () => {
    const item = makeItem({ position: "LA", quantity: 3 });
    const formValues = {
      row0_position: "LA",
      row0_quantity: 99,
    };

    const result = buildMaterialsRowValues({
      materials: [item],
      areas: [rowArea],
      fields: rowFields,
      formValues,
      currentCount: 1,
      forceRebuild: false,
    });

    expect(result["row0_quantity"]).toBe(3);
  });

  it("keeps the existing quantity for non-LA rows when reusing existing row values", () => {
    const item = makeItem({ position: "SP", quantity: 3 });
    const formValues = {
      row0_position: "SP",
      row0_quantity: 99,
    };

    const result = buildMaterialsRowValues({
      materials: [item],
      areas: [rowArea],
      fields: rowFields,
      formValues,
      currentCount: 1,
      forceRebuild: false,
    });

    expect(result["row0_quantity"]).toBe(99);
  });

  it("backfills blank description from API when reusing existing row values", () => {
    const rowFields: Field[] = [
      makeField("row0_position", "diagnosticPosition"),
      makeField("row0_sparePartNumber", "diagnosticPartNumber"),
      makeField("row0_description", "diagnosticDescription"),
    ];
    const rowArea = makeArea("row0", rowFields);
    const item = makeItem({ position: "PN", description: "Updated description" });
    const formValues = {
      row0_position: "PN",
      row0_sparePartNumber: "06019H2103",
      row0_description: "",
    };

    const result = buildMaterialsRowValues({
      materials: [item],
      areas: [rowArea],
      fields: rowFields,
      formValues,
      currentCount: 1,
      forceRebuild: false,
    });

    expect(result["row0_description"]).toBe("Updated description");
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

  it("falls back to defaultQuantity when faultCodeValue has no ':' separator", () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useDiagnosticsManager(props));

    expect(result.current.getQuantityForPosition("LA", "FC9", 0)).toBe(2);
  });

  it("falls back to defaultQuantity when faultCodeValue is empty", () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useDiagnosticsManager(props));

    expect(result.current.getQuantityForPosition("LA", "", 0)).toBe(2);
  });

  it("falls back to defaultQuantity for an unrecognized quantitySource", () => {
    const { props } = createHookProps({
      allowedPositions: [makeAllowedPosition("AC", "UNKNOWN_SOURCE", 6, 1)],
    });
    const { result } = renderHook(() => useDiagnosticsManager(props));

    expect(result.current.getQuantityForPosition("AC")).toBe(6);
  });

  it("returns defaultQuantity when the parsed fault code number is NaN", () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useDiagnosticsManager(props));

    expect(result.current.getQuantityForPosition("LA", "FC:abc", 0)).toBe(2);
  });

  it("returns undefined when the position has no matching allowed position config", () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useDiagnosticsManager(props));

    expect(result.current.getQuantityForPosition("ZZ")).toBeUndefined();
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

  it("collapses multiple SP rows to one when switching to spare parts exchange", async () => {
    const { props } = createHookProps();
    const { result, rerender } = renderHook(
      ({ currentActionType }) =>
        useDiagnosticsManager({
          ...props,
          currentActionType,
        }),
      {
        initialProps: { currentActionType: "REPAIR" },
      },
    );

    act(() => {
      result.current.setMaterials([
        makeItem({ position: "SP", partNumber: "SP-1", origin: "specialMaterial" }),
        makeItem({ position: "SP", partNumber: "SP-2", origin: "explosionDrawing" }),
        makeItem({ position: "PN", partNumber: "PN-1" }),
      ]);
    });

    rerender({ currentActionType: "SPARE_PARTS_EXCHANGE" });

    await waitFor(() => {
      expect(result.current.materials.filter((item) => item.position === "SP")).toHaveLength(1);
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

  it("reindexes spare-parts form keys when deleting the first row", async () => {
    const { props } = createHookProps({
      formValues: {
        "diagnosticData_diagnosticsSpareParts#0_position": "SP",
        "diagnosticData_diagnosticsSpareParts#0_sparePartNumber": "ROW-0",
        "diagnosticData_diagnosticsSpareParts#1_position": "PN",
        "diagnosticData_diagnosticsSpareParts#1_sparePartNumber": "ROW-1",
        "diagnosticData_diagnosticsSpareParts#2_position": "LA",
        "diagnosticData_diagnosticsSpareParts#2_sparePartNumber": "ROW-2",
      } as Record<string, unknown>,
    });
    const { result } = renderHook(() => useDiagnosticsManager(props));

    act(() => {
      result.current.onDeleteRow("diagnosticData_diagnosticsSpareParts#0");
    });

    await waitFor(() => {
      expect(props.formValuesRef.current["diagnosticData_diagnosticsSpareParts#0_position"]).toBe(
        "PN",
      );
      expect(
        props.formValuesRef.current["diagnosticData_diagnosticsSpareParts#0_sparePartNumber"],
      ).toBe("ROW-1");
      expect(props.formValuesRef.current["diagnosticData_diagnosticsSpareParts#1_position"]).toBe(
        "LA",
      );
      expect(
        props.formValuesRef.current["diagnosticData_diagnosticsSpareParts#1_sparePartNumber"],
      ).toBe("ROW-2");
      expect(
        props.formValuesRef.current["diagnosticData_diagnosticsSpareParts#2_position"],
      ).toBeUndefined();
    });
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

  it("resets rejected row status to pending after item edit", async () => {
    const { props } = createHookProps();
    const { result } = renderHook(() => useDiagnosticsManager(props));

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

// ── Additional coverage: effects, row callbacks and helpers ──────────────────

const SPARE = "diagnosticData_diagnosticsSpareParts";
const ARCHIVED = "diagnosticData_archivedSpareParts";
const SUMMARY_DETAILED = "diagnosticData_diagnosticsSummaryDetailed";
const SUMMARY_TOTAL = "diagnosticData_diagnosticsSummaryTotal";

const spareFields = (i: number): Field[] => [
  makeField(`${SPARE}#${i}_position`, "diagnosticPosition"),
  makeField(`${SPARE}#${i}_sparePartNumber`, "diagnosticPartNumber"),
  makeField(`${SPARE}#${i}_description`, "diagnosticDescription"),
  makeField(`${SPARE}#${i}_quantity`, "diagnosticQuantity"),
  makeField(`${SPARE}#${i}_netAmount`, "diagnosticNetAmount"),
];

const spareArea = (i: number): Area => makeArea(`${SPARE}#${i}`, spareFields(i), i);

const renameDuplicatedArea = (area: Area, index: number): Area => ({
  ...area,
  name: area.name.replace(/#\d+/, `#${index}`),
  index,
  fields: area.fields.map((f) => ({ ...f, name: f.name.replace(/#\d+/, `#${index}`) })),
});

type Setter<T> = { mock: { calls: unknown[][] } } & ((arg: T) => void);

const functionalCalls = <T>(setter: unknown): Array<(prev: T) => T> =>
  (setter as Setter<T>).mock.calls
    .map((call) => call[0])
    .filter((arg): arg is (prev: T) => T => typeof arg === "function");

const arrayCalls = <T>(setter: unknown): T[] =>
  (setter as Setter<T>).mock.calls.map((call) => call[0] as T).filter((arg) => Array.isArray(arg));

const mergedInitialValues = (setter: unknown): Record<string, unknown> =>
  (setter as Setter<unknown>).mock.calls.reduce<Record<string, unknown>>((acc, call) => {
    const arg = call[0];
    if (typeof arg === "function") {
      return (arg as (prev: Record<string, unknown>) => Record<string, unknown>)(acc);
    }
    return arg as Record<string, unknown>;
  }, {});

const countAreas = (tabs: Section[]) =>
  tabs.find((tab) => tab.name === "diagnosticData")?.areas.length ?? 0;

const renderManager = (
  props: ReturnType<typeof createHookProps>["props"],
  setMessages: (updater: unknown) => void = vi.fn(),
) =>
  renderHook(() => useDiagnosticsManager(props), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(
        MessagesContext.Provider,
        { value: { messages: [], setMessages: setMessages as never } },
        children,
      ),
  });

const apiMaterial = (overrides: Record<string, unknown> = {}) => ({
  id: "M-1",
  position: "SP",
  partNumber: "PART-1",
  description: "API description",
  jobType: "CHARGEABLE",
  quantity: 1,
  status: "PENDING",
  price: { unitPrice: 10, netAmount: 10, tax: 10, taxAmount: 1, grossAmount: 11, totalAmount: 11 },
  ...overrides,
});

const apiArchivedMaterial = (partNumber: string) => ({
  position: "SP",
  partNumber,
  description: "Old part",
  jobType: "WARRANTY",
  quantity: 1,
  status: "ARCHIVED",
  price: { unitPrice: 1, netAmount: 1, tax: 0, grossAmount: 1, totalAmount: 1 },
});

describe("useDiagnosticsManager effects", () => {
  afterEach(() => {
    vi.mocked(setDuplicatedArea).mockImplementation((area) => area);
  });

  describe("API sync", () => {
    it("flags empty API materials", async () => {
      const { props } = createHookProps({ diagnosticData: { jobId: "J-E", materials: [] } });
      const { result } = renderManager(props);

      await waitFor(() => {
        expect(result.current.apiMaterialsLoaded).toBe(true);
      });
      expect(result.current.apiMaterialsEmpty).toBe(true);
      expect(result.current.hasExistingDiagnostic).toBe(true);
    });

    it("maps API materials without price or position to safe defaults", async () => {
      const { props } = createHookProps({
        diagnosticData: {
          jobId: "J-D",
          materials: [{ id: "M-D", partNumber: undefined, jobType: undefined }],
        },
      });
      const { result } = renderManager(props);

      await waitFor(() => {
        expect(result.current.materials).toHaveLength(1);
      });
      const row = result.current.materials[0];
      expect(row.position).toBe("");
      expect(row.partNumber).toBe("");
      expect(row.description).toBe("");
      expect(row.type).toBe("");
      expect(row.quantity).toBe(1);
      expect(row.unitPrice).toBe(0);
      expect(row.materialId).toBe("M-D");
    });

    it("preserves the tax of an unsaved row when the API returns the same position without tax", async () => {
      const { props } = createHookProps();
      const { result, rerender } = renderManager(props);

      act(() => {
        result.current.setMaterials([makeItem({ position: "PN", tax: 19, materialId: undefined })]);
      });
      props.diagnosticData = {
        materials: [apiMaterial({ id: undefined, position: "PN", price: { tax: 0 } })],
      };
      rerender();

      await waitFor(() => {
        expect(result.current.materials[0]?.tax).toBe(19);
      });
    });

    it("keeps the API tax for rows that already have an id", async () => {
      const { props } = createHookProps({
        diagnosticData: {
          jobId: "J-T",
          materials: [apiMaterial({ id: "M-T", price: { tax: 7, unitPrice: 1 } })],
        },
      });
      const { result } = renderManager(props);

      await waitFor(() => {
        expect(result.current.materials[0]?.tax).toBe(7);
      });
    });

    it("clears state when the job id changes", async () => {
      const { props } = createHookProps({
        diagnosticData: { jobId: "J-1", materials: [apiMaterial({ position: "LA", id: "M-LA" })] },
      });
      const { result, rerender } = renderManager(props);

      await waitFor(() => {
        expect(result.current.materials.map((m) => m.position)).toEqual(["LA"]);
      });

      props.diagnosticData = { jobId: "J-2", materials: [] };
      rerender();

      await waitFor(() => {
        expect(result.current.materials.map((m) => m.position)).toEqual(["PN"]);
      });
      expect(result.current.apiMaterialsEmpty).toBe(true);
    });

    it("loads archived materials from the API", async () => {
      const { props, mocks } = createHookProps({
        diagnosticData: { jobId: "J-A", archivedMaterials: [apiArchivedMaterial("ARCH-9")] },
      });
      renderManager(props);

      await waitFor(() => {
        expect(
          mergedInitialValues(mocks.setInitialFormValues)[`${ARCHIVED}#0_sparePartNumber`],
        ).toBe("ARCH-9");
      });
    });
  });

  describe("rule change rebuild", () => {
    it("does not build rows while the manager is read-only", () => {
      const { props } = createHookProps();
      props.readOnly = true;
      const { result } = renderManager(props);

      expect(result.current.materials).toHaveLength(0);
    });

    it("does not build rows without an action type or job type", () => {
      const { props } = createHookProps();
      const { result } = renderManager({ ...props, currentJobType: "" });

      expect(result.current.materials).toHaveLength(0);
    });

    it("defers the rebuild until the country configuration is available", () => {
      const { props, mocks } = createHookProps();
      mocks.getQueryData.mockImplementation((key: unknown) =>
        Array.isArray(key) && key[0] === "user" ? makeUser() : undefined,
      );
      const { result } = renderManager(props);

      expect(result.current.materials).toHaveLength(0);
      expect(result.current.allowedPositions).toEqual([]);
      expect(result.current.discountBase).toBe("NET_PRICE");
    });

    it("rebuilds automatic rows when API rows have no id", async () => {
      const { props, mocks } = createHookProps({
        diagnosticData: {
          jobId: "J-N",
          materials: [apiMaterial({ id: undefined, position: "SP" })],
        },
      });
      const { result } = renderManager(props);

      await waitFor(() => {
        expect(result.current.materials.map((m) => m.position)).toEqual(["PN"]);
      });
      expect(mocks.setArePricesValidated).toHaveBeenCalledWith(false);
    });

    it("keeps special-material and explosion-drawing SP rows that remain allowed", async () => {
      const { props } = createHookProps();
      const { result, rerender } = renderHook(
        ({ jobType }) => useDiagnosticsManager({ ...props, currentJobType: jobType }),
        { initialProps: { jobType: "WARRANTY" } },
      );

      act(() => {
        result.current.setMaterials([
          makeItem({ position: "SP", partNumber: "SM", origin: "specialMaterial" }),
          makeItem({ position: "SP", partNumber: "ED", origin: "explosionDrawing" }),
          makeItem({ position: "SP", partNumber: "MANUAL" }),
        ]);
      });
      rerender({ jobType: "CHARGEABLE" });

      await waitFor(() => {
        expect(result.current.materials.map((m) => m.partNumber)).toEqual(["", "SM", "ED"]);
      });
    });

    it("drops special-material rows when special materials are not allowed", async () => {
      const { props } = createHookProps({ formValues: { actionType: "NEW_TOOL_EXCHANGE" } });
      const { result, rerender } = renderHook(
        ({ jobType }) => useDiagnosticsManager({ ...props, currentJobType: jobType }),
        { initialProps: { jobType: "WARRANTY" } },
      );

      act(() => {
        result.current.setMaterials([
          makeItem({ position: "SP", partNumber: "SM", origin: "specialMaterial" }),
          makeItem({ position: "SP", partNumber: "ED", origin: "explosionDrawing" }),
        ]);
      });
      rerender({ jobType: "CHARGEABLE" });

      await waitFor(() => {
        expect(result.current.materials.map((m) => m.partNumber)).toEqual(["", "ED"]);
      });
      expect(result.current.addSpecialMaterialsAllowed).toBe(false);
    });

    it("drops explosion-drawing rows when SP is no longer allowed", async () => {
      const { props } = createHookProps({
        allowedPositions: [makeAllowedPosition("PN", "DEFAULT", 1, 1)],
      });
      const { result, rerender } = renderHook(
        ({ jobType }) => useDiagnosticsManager({ ...props, currentJobType: jobType }),
        { initialProps: { jobType: "CHARGEABLE" } },
      );

      act(() => {
        result.current.setMaterials([
          makeItem({ position: "SP", partNumber: "SM", origin: "specialMaterial" }),
          makeItem({ position: "SP", partNumber: "ED", origin: "explosionDrawing" }),
        ]);
      });
      rerender({ jobType: "WARRANTY" });

      await waitFor(() => {
        expect(result.current.materials.map((m) => m.partNumber)).toEqual(["SM"]);
      });
    });
  });

  describe("bare sales relation autofill", () => {
    it("fills the PN row from sales data available on first build", async () => {
      const { props } = createHookProps();
      vi.mocked(useBareSalesRelation).mockReturnValue({
        data: { salesSku: "SKU-1", desc: "Sales desc" },
      } as never);
      const { result } = renderManager(props);

      await waitFor(() => {
        expect(result.current.materials[0]?.partNumber).toBe("SKU-1");
      });
      expect(result.current.materials[0].description).toBe("Sales desc");
    });

    it("falls back to an empty description when sales data has none", async () => {
      const { props } = createHookProps();
      vi.mocked(useBareSalesRelation).mockReturnValue({ data: { salesSku: "SKU-1" } } as never);
      const { result } = renderManager(props);

      await waitFor(() => {
        expect(result.current.materials[0]?.partNumber).toBe("SKU-1");
      });
      expect(result.current.materials[0].description).toBe("");
    });

    it("applies late-arriving sales data to an empty PN row and forces a rebuild", async () => {
      const { props, mocks } = createHookProps();
      const { result, rerender } = renderManager(props);

      await waitFor(() => {
        expect(result.current.materials).toHaveLength(1);
      });

      vi.mocked(useBareSalesRelation).mockReturnValue({
        data: { salesSku: "SKU-2", desc: "Late desc" },
      } as never);
      rerender();

      await waitFor(() => {
        expect(result.current.materials[0].partNumber).toBe("SKU-2");
      });
      expect(result.current.materials[0].description).toBe("Late desc");
      await waitFor(() => {
        expect(mergedInitialValues(mocks.setInitialFormValues)[`${SPARE}#0_sparePartNumber`]).toBe(
          "SKU-2",
        );
      });
      expect(props.skipFormResetRef.current).toBe(true);
    });

    it("uses an empty description for late sales data without desc", async () => {
      const { props } = createHookProps();
      const { result, rerender } = renderManager(props);

      await waitFor(() => {
        expect(result.current.materials).toHaveLength(1);
      });
      vi.mocked(useBareSalesRelation).mockReturnValue({ data: { salesSku: "SKU-3" } } as never);
      rerender();

      await waitFor(() => {
        expect(result.current.materials[0].partNumber).toBe("SKU-3");
      });
      expect(result.current.materials[0].description).toBe("");
    });

    it("does not overwrite a PN row that already has a part number", async () => {
      const { props } = createHookProps();
      const { result, rerender } = renderManager(props);

      act(() => {
        result.current.setMaterials([makeItem({ position: "PN", partNumber: "KEEP" })]);
      });
      vi.mocked(useBareSalesRelation).mockReturnValue({ data: { salesSku: "SKU-4" } } as never);
      rerender();

      expect(result.current.materials[0].partNumber).toBe("KEEP");
    });

    it("ignores late sales data when there is no PN row", async () => {
      const { props } = createHookProps();
      const { result, rerender } = renderManager(props);

      act(() => {
        result.current.setMaterials([makeItem({ position: "SP", partNumber: "SP-1" })]);
      });
      vi.mocked(useBareSalesRelation).mockReturnValue({ data: { salesSku: "SKU-5" } } as never);
      rerender();

      expect(result.current.materials.map((m) => m.partNumber)).toEqual(["SP-1"]);
    });

    it("queries sales relation only for pre-approval action types and non-internal users", () => {
      const baretoolField = makeField("bareTool", "baretoolNumber");
      const { props } = createHookProps({
        allFields: [...diagnosticFields, baretoolField],
        formValues: { bareTool: "BT-1" },
      });
      renderManager({ ...props, currentActionType: "NEW_TOOL_EXCHANGE" });

      expect(useBareSalesRelation).toHaveBeenCalledWith(
        { bareTool: "BT-1", countryCode: "ZA", language: "EN" },
        { enabled: true },
      );
    });

    it("disables the sales relation query for non pre-approval action types", () => {
      const baretoolField = makeField("bareTool", "baretoolNumber");
      const { props } = createHookProps({
        allFields: [...diagnosticFields, baretoolField],
        formValues: { bareTool: "BT-1" },
      });
      renderManager(props);

      expect(useBareSalesRelation).toHaveBeenCalledWith(expect.anything(), { enabled: false });
    });
  });

  describe("spare parts areas", () => {
    it("adds areas, fields and form values when there are more materials than areas", async () => {
      const { props, mocks } = createHookProps();
      vi.mocked(setDuplicatedArea).mockImplementation(renameDuplicatedArea);
      const { result } = renderManager(props);

      await waitFor(() => {
        expect(result.current.materials).toHaveLength(1);
      });

      act(() => {
        result.current.setMaterials([
          makeItem({ position: "PN", partNumber: "A" }),
          makeItem({ partNumber: "B" }),
          makeItem({ partNumber: "C" }),
        ]);
      });

      await waitFor(() => {
        expect(
          functionalCalls<Section[]>(mocks.setTabs).some(
            (update) => countAreas(update(props.tabs)) > countAreas(props.tabs),
          ),
        ).toBe(true);
      });

      const grownTabs = functionalCalls<Section[]>(mocks.setTabs)
        .map((update) => update(props.tabs))
        .find((tabs) => countAreas(tabs) > countAreas(props.tabs))!;
      const diagnosticTab = grownTabs.find((tab) => tab.name === "diagnosticData")!;
      expect(diagnosticTab.areas.map((a) => a.name)).toEqual(
        expect.arrayContaining([`${SPARE}#1`, `${SPARE}#2`]),
      );

      const grownFields = functionalCalls<Field[]>(mocks.setAllFields)
        .map((update) => update(props.allFields))
        .find((fields) => fields.length > props.allFields.length)!;
      expect(grownFields.some((f) => f.name === `${SPARE}#2_description`)).toBe(true);
      expect(props.skipFormResetRef.current).toBe(true);

      const initial = mergedInitialValues(mocks.setInitialFormValues);
      expect(initial[`${SPARE}#1_quantity`]).toBe(2);
    });

    it("leaves other tabs untouched when adding areas", async () => {
      const { props, mocks } = createHookProps();
      vi.mocked(setDuplicatedArea).mockImplementation(renameDuplicatedArea);
      const { result } = renderManager(props);
      await waitFor(() => {
        expect(result.current.materials).toHaveLength(1);
      });

      act(() => {
        result.current.setMaterials([makeItem({ partNumber: "A" }), makeItem({ partNumber: "B" })]);
      });

      const otherTab: Section = { ...makeDiagnosticsTab([spareArea(5)]), name: "other" };
      await waitFor(() => {
        const updates = functionalCalls<Section[]>(mocks.setTabs);
        expect(
          updates.some((update) => countAreas(update(props.tabs)) > countAreas(props.tabs)),
        ).toBe(true);
      });
      const grown = functionalCalls<Section[]>(mocks.setTabs)
        .map((update) => update([...props.tabs, otherTab]))
        .find((tabs) => countAreas(tabs) > countAreas(props.tabs))!;
      expect(grown.find((tab) => tab.name === "other")).toBe(otherTab);
    });

    it("removes surplus areas and fields when there are fewer materials than areas", async () => {
      const allFields = [0, 1, 2].flatMap(spareFields);
      const tabs = [makeDiagnosticsTab([spareArea(0), spareArea(1), spareArea(2)])];
      const { props, mocks } = createHookProps({ tabs, allFields });
      const otherTab: Section = { ...makeDiagnosticsTab([spareArea(1)]), name: "other" };
      renderManager(props);

      await waitFor(() => {
        expect(
          functionalCalls<Section[]>(mocks.setTabs).some(
            (update) => countAreas(update(tabs)) < countAreas(tabs),
          ),
        ).toBe(true);
      });

      const shrunk = functionalCalls<Section[]>(mocks.setTabs)
        .map((update) => update([...tabs, otherTab]))
        .find((next) => countAreas(next) < countAreas(tabs))!;
      expect(shrunk.find((tab) => tab.name === "diagnosticData")!.areas.map((a) => a.name)).toEqual(
        [`${SPARE}#0`],
      );
      expect(shrunk.find((tab) => tab.name === "other")).toBe(otherTab);

      const remainingFields = functionalCalls<Field[]>(mocks.setAllFields)
        .map((update) => update(allFields))
        .find((fields) => fields.length < allFields.length)!;
      expect(remainingFields.some((f) => f.name.includes("#1_") || f.name.includes("#2_"))).toBe(
        false,
      );
    });

    it("merges non-row form values into the initial values on a normal rebuild", async () => {
      const { props, mocks } = createHookProps({
        formValues: { customerNote: "keep me", emptyValue: "" },
      });
      renderManager(props);

      await waitFor(() => {
        expect(mocks.setInitialFormValues).toHaveBeenCalled();
      });

      const initial = mergedInitialValues(mocks.setInitialFormValues);
      expect(initial.customerNote).toBe("keep me");
      expect("emptyValue" in initial).toBe(false);
      expect(initial[`${SPARE}#0_sparePartNumber`]).toBe("");
    });

    it("appends the SP option to position fields of special-material rows when SP is not allowed", async () => {
      const fields = spareFields(0);
      const tabs = [makeDiagnosticsTab([makeArea(`${SPARE}#0`, fields, 0)])];
      const { props, mocks } = createHookProps({
        tabs,
        allFields: fields,
        allowedPositions: [
          makeAllowedPosition("PN", "DEFAULT", 1, 2),
          makeAllowedPosition("LA", "DEFAULT", 1, 2),
        ],
      });
      vi.mocked(setDuplicatedArea).mockImplementation(renameDuplicatedArea);
      const { result } = renderManager(props);

      await waitFor(() => {
        expect(result.current.materials).toHaveLength(1);
      });
      act(() => {
        result.current.setMaterials([
          makeItem({ position: "PN", partNumber: "A" }),
          makeItem({ position: "SP", partNumber: "B", origin: "specialMaterial" }),
        ]);
      });

      await waitFor(() => {
        const grown = functionalCalls<Field[]>(mocks.setAllFields)
          .map((update) => update(fields))
          .find((next) => next.length > fields.length);
        const spField = grown?.find((f) => f.name === `${SPARE}#1_position`);
        expect(spField?.options?.some((o) => o.value === "SP")).toBe(true);
      });
    });
  });

  describe("archived spare parts areas", () => {
    it("adds archived areas and default position options when more archived rows exist", async () => {
      const { props, mocks } = createHookProps({
        diagnosticData: {
          jobId: "J-AR",
          archivedMaterials: [apiArchivedMaterial("A1"), apiArchivedMaterial("A2")],
        },
      });
      vi.mocked(setDuplicatedArea).mockImplementation(renameDuplicatedArea);
      renderManager(props);

      await waitFor(() => {
        expect(
          mergedInitialValues(mocks.setInitialFormValues)[`${ARCHIVED}#1_sparePartNumber`],
        ).toBe("A2");
      });
      expect(mergedInitialValues(mocks.setInitialFormValues)[`${ARCHIVED}#0_sparePartNumber`]).toBe(
        "A1",
      );

      const updatedFields = functionalCalls<Field[]>(mocks.setAllFields)
        .map((update) => update(props.allFields))
        .find((fields) => fields.some((f) => f.name === `${ARCHIVED}#1_position`))!;
      const archivedPositions = updatedFields.filter((f) => f.subtype === "archivedPosition");
      expect(archivedPositions).toHaveLength(2);
      expect(archivedPositions[0].options?.map((o) => o.value)).toEqual([
        "LA",
        "PN",
        "SP",
        "AC",
        "FR",
        "PC",
      ]);

      const tabs = functionalCalls<Section[]>(mocks.setTabs)
        .map((update) => update(props.tabs))
        .find((next) => countAreas(next) > countAreas(props.tabs))!;
      expect(tabs.find((tab) => tab.name === "diagnosticData")!.areas.map((a) => a.name)).toContain(
        `${ARCHIVED}#1`,
      );
    });

    it("keeps existing archived position options", async () => {
      const archivedWithOptions = archivedFields.map((f) =>
        f.subtype === "archivedPosition" ? { ...f, options: [{ value: "SP", name: "SP" }] } : f,
      );
      const { props, mocks } = createHookProps({
        allFields: [...diagnosticFields, ...archivedWithOptions],
        diagnosticData: { jobId: "J-AO", archivedMaterials: [apiArchivedMaterial("A1")] },
      });
      renderManager(props);

      await waitFor(() => {
        expect(functionalCalls<Field[]>(mocks.setAllFields).length).toBeGreaterThan(0);
      });
      const updated = functionalCalls<Field[]>(mocks.setAllFields)
        .map((update) => update(props.allFields))
        .find((fields) => fields.some((f) => f.subtype === "archivedPosition"))!;
      expect(updated.find((f) => f.subtype === "archivedPosition")?.options).toEqual([
        { value: "SP", name: "SP" },
      ]);
    });

    it("does nothing when there is no archived template area", async () => {
      const tabs = [makeDiagnosticsTab([diagnosticsArea])];
      const { props, mocks } = createHookProps({
        tabs,
        diagnosticData: { jobId: "J-NA", archivedMaterials: [apiArchivedMaterial("A1")] },
      });
      renderManager(props);

      await waitFor(() => {
        expect(mocks.setArePricesValidated).toHaveBeenCalled();
      });
      expect(
        mergedInitialValues(mocks.setInitialFormValues)[`${ARCHIVED}#0_sparePartNumber`],
      ).toBeUndefined();
    });

    it("does nothing when the diagnostic tab is missing", async () => {
      const { props, mocks } = createHookProps({
        tabs: [],
        diagnosticData: { jobId: "J-NT", archivedMaterials: [apiArchivedMaterial("A1")] },
      });
      renderManager(props);

      await waitFor(() => {
        expect(mocks.setArePricesValidated).toHaveBeenCalled();
      });
      expect(mocks.setInitialFormValues).not.toHaveBeenCalled();
    });

    it("reuses the cached archived template after the archived area disappears from the tabs", async () => {
      const { props, mocks } = createHookProps({
        diagnosticData: { jobId: "J-C", archivedMaterials: [apiArchivedMaterial("A1")] },
      });
      vi.mocked(setDuplicatedArea).mockImplementation(renameDuplicatedArea);
      const { result, rerender } = renderManager(props);

      await waitFor(() => {
        expect(
          mergedInitialValues(mocks.setInitialFormValues)[`${ARCHIVED}#0_sparePartNumber`],
        ).toBe("A1");
      });

      props.tabs = [makeDiagnosticsTab([spareArea(0)])];
      rerender();
      act(() => {
        result.current.setMaterials([makeItem({ partNumber: "ROW" })]);
      });
      mocks.setInitialFormValues.mockClear();
      act(() => {
        result.current.onDeleteRow(`${SPARE}#0`);
      });

      await waitFor(() => {
        const merged = mergedInitialValues(mocks.setInitialFormValues);
        expect(merged[`${ARCHIVED}#0_sparePartNumber`]).toBe("A1");
        expect(merged[`${ARCHIVED}#1_sparePartNumber`]).toBeDefined();
      });
    });
  });

  describe("position dropdown sync", () => {
    it("updates diagnostic position options and leaves claim fields untouched", async () => {
      const claimField = makeField("claims_row_position", "diagnosticPosition", { options: [] });
      const { props, mocks } = createHookProps({
        allFields: [...diagnosticFields, ...archivedFields, claimField],
      });
      renderManager(props);

      await waitFor(() => {
        expect(arrayCalls<Field[]>(mocks.setAllFields).length).toBeGreaterThan(0);
      });
      const updated = arrayCalls<Field[]>(mocks.setAllFields)[0];
      const positionField = updated.find((f) => f.name === `${SPARE}#0_position`)!;
      expect(positionField.options?.map((o) => o.value)).toEqual(["LA", "PN", "SP"]);
      expect(updated.find((f) => f.name === "claims_row_position")).toBe(claimField);
      expect(props.skipFormResetRef.current).toBe(true);
      expect(functionalCalls<Section[]>(mocks.setTabs).length).toBeGreaterThan(0);
    });

    it("keeps the SP option on a row whose value is SP even when SP is no longer allowed", async () => {
      const { props, mocks } = createHookProps({
        allowedPositions: [
          makeAllowedPosition("PN", "DEFAULT", 1, 2),
          makeAllowedPosition("LA", "DEFAULT", 1, 2),
        ],
      });
      renderManager(props);

      await waitFor(() => {
        expect(arrayCalls<Field[]>(mocks.setAllFields).length).toBeGreaterThan(0);
      });
      const updated = arrayCalls<Field[]>(mocks.setAllFields)[0];
      expect(
        updated.find((f) => f.name === `${SPARE}#0_position`)?.options?.map((o) => o.value),
      ).toEqual(["LA", "PN", "SP"]);
    });

    it("does not update fields when the position options are already in sync", async () => {
      const synced = makeField(`${SPARE}#0_position`, "diagnosticPosition", {
        options: [
          { value: "LA", name: "LA" },
          { value: "PN", name: "PN" },
        ],
      });
      const { props, mocks } = createHookProps({
        allFields: [synced],
        allowedPositions: [
          makeAllowedPosition("PN", "DEFAULT", 1, 2),
          makeAllowedPosition("LA", "DEFAULT", 1, 2),
        ],
        formValues: { [`${SPARE}#0_position`]: "PN" },
      });
      renderManager(props);

      await waitFor(() => {
        expect(mocks.setArePricesValidated).toHaveBeenCalled();
      });
      expect(arrayCalls<Field[]>(mocks.setAllFields)).toHaveLength(0);
    });
  });

  describe("price summary", () => {
    const summaryTemplate = (i: number): Area =>
      makeArea(
        `${SUMMARY_DETAILED}#${i}`,
        [
          makeField(`${SUMMARY_DETAILED}#${i}_jobType`, "summaryDetailedJobType"),
          makeField(`${SUMMARY_DETAILED}#${i}_net`, "diagnosticSummaryNetAmount"),
        ],
        i,
      );
    const totalArea = makeArea(
      SUMMARY_TOTAL,
      [
        makeField(`${SUMMARY_TOTAL}_net`, "diagnosticSummaryNetAmount"),
        makeField(`${SUMMARY_TOTAL}_gross`, "diagnosticSummaryGrossAmount"),
      ],
      0,
    );
    const summaryFields = (areas: Area[]) => areas.flatMap((a) => a.fields);
    const total = {
      discount: 0,
      grossAmount: 238,
      netAmount: 200,
      suggestedNetPrice: 200,
      taxAmount: 38,
      totalAmount: 238,
      discountAmount: 0,
    };

    it("creates one detailed area per job type and fills the total area", async () => {
      const areas = [diagnosticsArea, summaryTemplate(0), totalArea];
      const { props, mocks } = createHookProps({
        tabs: [makeDiagnosticsTab(areas)],
        allFields: [...diagnosticFields, ...summaryFields(areas)],
        diagnosticData: {
          jobId: "J-S",
          priceSummaryDetailed: {
            total,
            byJobType: [
              makeSummaryDetail({ jobType: "CHARGEABLE" }),
              makeSummaryDetail({ jobType: "WARRANTY" }),
            ],
          },
        },
      });
      vi.mocked(setDuplicatedArea).mockImplementation(renameDuplicatedArea);
      renderManager(props);

      await waitFor(() => {
        const merged = mergedInitialValues(mocks.setInitialFormValues);
        expect(merged[`${SUMMARY_DETAILED}#0_jobType`]).toBe("CHARGEABLE");
        expect(merged[`${SUMMARY_DETAILED}#1_jobType`]).toBe("WARRANTY");
        expect(merged[`${SUMMARY_TOTAL}_net`]).toBe(200);
        expect(merged[`${SUMMARY_TOTAL}_gross`]).toBe(238);
      });

      const grownTabs = functionalCalls<Section[]>(mocks.setTabs)
        .map((update) => update(props.tabs))
        .find((tabs) => countAreas(tabs) > countAreas(props.tabs))!;
      expect(
        grownTabs.find((tab) => tab.name === "diagnosticData")!.areas.map((a) => a.name),
      ).toContain(`${SUMMARY_DETAILED}#1`);
      const grownFields = functionalCalls<Field[]>(mocks.setAllFields)
        .map((update) => update(props.allFields))
        .find((fields) => fields.some((f) => f.name === `${SUMMARY_DETAILED}#1_net`));
      expect(grownFields).toBeDefined();
    });

    it("removes surplus detailed areas when fewer job types are returned", async () => {
      const areas = [diagnosticsArea, summaryTemplate(0), summaryTemplate(1), summaryTemplate(2)];
      const allFields = [...diagnosticFields, ...summaryFields(areas)];
      const { props, mocks } = createHookProps({
        tabs: [makeDiagnosticsTab(areas)],
        allFields,
        diagnosticData: {
          jobId: "J-S2",
          priceSummaryDetailed: { total, byJobType: [makeSummaryDetail()] },
        },
      });
      const otherTab: Section = { ...makeDiagnosticsTab([spareArea(1)]), name: "other" };
      renderManager(props);

      await waitFor(() => {
        expect(
          functionalCalls<Section[]>(mocks.setTabs).some(
            (update) => countAreas(update(props.tabs)) < countAreas(props.tabs),
          ),
        ).toBe(true);
      });
      const shrunk = functionalCalls<Section[]>(mocks.setTabs)
        .map((update) => update([...props.tabs, otherTab]))
        .find((tabs) => countAreas(tabs) < countAreas(props.tabs))!;
      expect(shrunk.find((tab) => tab.name === "other")).toBe(otherTab);
      const remaining = functionalCalls<Field[]>(mocks.setAllFields)
        .map((update) => update(allFields))
        .find((fields) => fields.length < allFields.length)!;
      expect(remaining.some((f) => f.name.startsWith(`${SUMMARY_DETAILED}#1`))).toBe(false);
    });

    it("skips the detailed sync when there is no summary template area", async () => {
      const { props, mocks } = createHookProps({
        diagnosticData: {
          jobId: "J-S3",
          priceSummaryDetailed: { total, byJobType: [makeSummaryDetail()] },
        },
      });
      renderManager(props);

      await waitFor(() => {
        expect(mocks.setArePricesValidated).toHaveBeenCalled();
      });
      expect(
        Object.keys(mergedInitialValues(mocks.setInitialFormValues)).some((key) =>
          key.includes("SummaryDetailed"),
        ),
      ).toBe(false);
    });

    it("skips the detailed sync when the diagnostic tab is missing", async () => {
      const { props, mocks } = createHookProps({
        tabs: [],
        diagnosticData: {
          jobId: "J-S4",
          priceSummaryDetailed: { total, byJobType: [makeSummaryDetail()] },
        },
      });
      renderManager(props);

      await waitFor(() => {
        expect(mocks.setArePricesValidated).toHaveBeenCalled();
      });
      expect(mocks.setInitialFormValues).not.toHaveBeenCalled();
    });

    it("ignores a price summary without job types", async () => {
      const areas = [diagnosticsArea, totalArea];
      const { props, mocks } = createHookProps({
        tabs: [makeDiagnosticsTab(areas)],
        diagnosticData: { jobId: "J-S5", priceSummaryDetailed: { total, byJobType: [] } },
      });
      renderManager(props);

      await waitFor(() => {
        expect(mocks.setArePricesValidated).toHaveBeenCalled();
      });
      expect(
        mergedInitialValues(mocks.setInitialFormValues)[`${SUMMARY_TOTAL}_net`],
      ).toBeUndefined();
    });

    it("exposes and updates the job type breakdown", async () => {
      const { props } = createHookProps();
      const { result } = renderManager(props);
      const first = makeSummaryDetail({ jobType: "CHARGEABLE" });
      const second = makeSummaryDetail({ jobType: "WARRANTY" });

      expect(result.current.priceSummaryDetailedByJobType).toEqual([]);

      act(() => {
        result.current.setPriceSummaryDetailedByJobType([first]);
      });
      expect(result.current.priceSummaryDetailedByJobType).toEqual([first]);

      act(() => {
        result.current.setPriceSummaryDetailedByJobType((prev) => [...prev, second]);
      });
      expect(result.current.priceSummaryDetailedByJobType).toEqual([first, second]);
    });
  });

  describe("onAddRow", () => {
    it("does nothing without form values", async () => {
      const { props, mocks } = createHookProps();
      const { result } = renderManager(props);
      await waitFor(() => {
        expect(result.current.materials).toHaveLength(1);
      });
      mocks.setArePricesValidated.mockClear();

      act(() => {
        result.current.onAddRow(undefined);
      });

      expect(result.current.materials).toHaveLength(1);
      expect(mocks.setArePricesValidated).not.toHaveBeenCalled();
    });

    it("does not add a row once the maximum number of rows is reached", () => {
      const { props, mocks } = createHookProps({
        allowedPositions: [makeAllowedPosition("SP", "USER", 1, 1)],
      });
      const { result } = renderManager(props);
      mocks.setArePricesValidated.mockClear();

      act(() => {
        result.current.onAddRow(props.formValuesRef.current);
      });

      expect(result.current.materials).toHaveLength(0);
      expect(mocks.setArePricesValidated).not.toHaveBeenCalled();
    });

    it("picks the first position that still has capacity and its default quantity", async () => {
      const { props } = createHookProps({
        allowedPositions: [
          makeAllowedPosition("SP", "USER", 1, 2),
          makeAllowedPosition("PN", "DEFAULT", 4, 2),
        ],
      });
      const { result } = renderManager(props);
      await waitFor(() => {
        expect(result.current.materials).toHaveLength(1);
      });

      act(() => {
        result.current.onAddRow(props.formValuesRef.current);
      });

      const added = result.current.materials.at(-1)!;
      expect(result.current.materials).toHaveLength(2);
      expect(added.position).toBe("PN");
      expect(added.quantity).toBe(4);
    });

    it("uses the fault code labour quantity for a new LA row", () => {
      const { props } = createHookProps({
        allowedPositions: [makeAllowedPosition("LA", "FAULT_CODES", 2, 2)],
      });
      const { result } = renderManager(props);

      act(() => {
        result.current.onAddRow(props.formValuesRef.current);
      });

      expect(result.current.materials.at(-1)).toMatchObject({ position: "LA", quantity: 7 });
    });

    it("adds a blank-position row when the only allowed position needs an insert permission", () => {
      const { props } = createHookProps({
        permissions: [PERMISSIONS.DIAGNOSTICS.CAN_VIEW_FREIGHT_ITEMS],
        allowedPositions: [makeAllowedPosition("FR", "DEFAULT", 1, 1)],
      });
      const { result } = renderManager(props);

      act(() => {
        result.current.onAddRow(props.formValuesRef.current);
      });

      expect(result.current.materials.at(-1)).toMatchObject({ position: "", quantity: 1 });
    });

    it("allows freight rows for users with the insert permission", () => {
      const { props } = createHookProps({
        permissions: [
          PERMISSIONS.DIAGNOSTICS.CAN_VIEW_FREIGHT_ITEMS,
          PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_FREIGHT_ITEMS,
        ],
        allowedPositions: [makeAllowedPosition("FR", "DEFAULT", 1, 1)],
        formValues: { [`${SPARE}#0_position`]: "" },
      });
      const { result } = renderManager(props);

      act(() => {
        result.current.onAddRow(props.formValuesRef.current);
      });

      expect(result.current.materials.at(-1)?.position).toBe("FR");
    });
  });

  describe("onDeleteRow", () => {
    const threeRowSetup = () => {
      const areas = [spareArea(0), spareArea(1), spareArea(2), archivedArea];
      const formValues: Record<string, unknown> = {};
      [0, 1, 2].forEach((i) => {
        formValues[`${SPARE}#${i}_position`] = "SP";
        formValues[`${SPARE}#${i}_sparePartNumber`] = `PN${i}`;
        formValues[`${SPARE}#${i}_description`] = `D${i}`;
      });
      return createHookProps({
        tabs: [makeDiagnosticsTab(areas)],
        allFields: [...[0, 1, 2].flatMap(spareFields), ...archivedFields],
        formValues,
      });
    };

    it("compacts the remaining rows after deleting a middle row and archives it", async () => {
      const { props, mocks } = threeRowSetup();
      const { result } = renderManager(props);
      act(() => {
        result.current.setMaterials([
          makeItem({ partNumber: "x0" }),
          makeItem({ partNumber: "x1" }),
          makeItem({ partNumber: "x2" }),
        ]);
      });

      act(() => {
        result.current.onDeleteRow(`${SPARE}#1`);
      });

      const compactedTabs = arrayCalls<Section[]>(mocks.setTabs)[0];
      const diagnosticTab = compactedTabs.find((tab) => tab.name === "diagnosticData")!;
      expect(diagnosticTab.areas.map((a) => a.name)).toEqual([
        `${SPARE}#0`,
        `${SPARE}#1`,
        `${ARCHIVED}#0`,
      ]);
      expect(diagnosticTab.areas[1].index).toBe(1);
      expect(diagnosticTab.areas[1].fields.map((f) => f.name)).toContain(
        `${SPARE}#1_sparePartNumber`,
      );

      const compactedFields = arrayCalls<Field[]>(mocks.setAllFields).find(
        (fields) => !fields.some((f) => f.name === `${SPARE}#2_sparePartNumber`),
      )!;
      expect(compactedFields.some((f) => f.name === `${SPARE}#2_sparePartNumber`)).toBe(false);
      expect(compactedFields.some((f) => f.name === `${SPARE}#1_sparePartNumber`)).toBe(true);

      expect(props.formValuesRef.current[`${SPARE}#1_sparePartNumber`]).toBe("PN2");
      expect(props.formValuesRef.current[`${SPARE}#2_sparePartNumber`]).toBeUndefined();
      const initial = mocks.setInitialFormValues.mock.calls.find(
        (call) => typeof call[0] === "object",
      )![0] as Record<string, unknown>;
      expect(initial[`${SPARE}#1_sparePartNumber`]).toBe("PN2");
      expect(initial[`${SPARE}#2_sparePartNumber`]).toBeUndefined();

      expect(result.current.materials.map((m) => m.partNumber)).toEqual(["PN0", "PN2"]);
      expect(props.skipFormResetRef.current).toBe(true);
      expect(result.current.enableValidate()).toBe(true);
    });

    it("does not archive the row when the job is in a permanent-delete status", async () => {
      const { props } = createHookProps({ jobStatus: "IN_DIAGNOSTICS", arePricesValidated: true });
      const { result } = renderManager(props);
      act(() => {
        result.current.setMaterials([makeItem({ partNumber: "ROW" })]);
      });

      act(() => {
        result.current.onDeleteRow(`${SPARE}#0`);
      });

      expect(result.current.enableValidate()).toBe(false);
    });

    it("ignores unknown area names", async () => {
      const { props, mocks } = createHookProps();
      const { result } = renderManager(props);
      act(() => {
        result.current.setMaterials([makeItem({ partNumber: "ROW" })]);
      });

      act(() => {
        result.current.onDeleteRow("diagnosticData_diagnosticsSpareParts#9");
      });

      expect(arrayCalls<Section[]>(mocks.setTabs)).toHaveLength(0);
      expect(result.current.materials).toHaveLength(1);
    });

    it("ignores deletes when the diagnostic tab is missing", () => {
      const { props, mocks } = createHookProps({ tabs: [] });
      const { result } = renderManager(props);

      act(() => {
        result.current.onDeleteRow(`${SPARE}#0`);
      });

      expect(arrayCalls<Section[]>(mocks.setTabs)).toHaveLength(0);
    });

    it("markAllValidated clears pending archived deletions", () => {
      const { props, mocks } = createHookProps({ arePricesValidated: true });
      const { result } = renderManager(props);
      act(() => {
        result.current.setMaterials([makeItem({ partNumber: "ROW" })]);
      });
      act(() => {
        result.current.onDeleteRow(`${SPARE}#0`);
      });
      expect(result.current.enableValidate()).toBe(true);

      act(() => {
        result.current.markAllValidated();
      });

      expect(mocks.setArePricesValidated).toHaveBeenCalledWith(true);
      expect(result.current.enableValidate()).toBe(false);
    });
  });

  describe("onAddMaterials", () => {
    it("falls back to the job type from the form for imported materials", async () => {
      const { props } = createHookProps();
      const { result } = renderManager(props);

      act(() => {
        result.current.onAddMaterials([{ partNumber: "N1" }]);
      });

      const added = result.current.materials.find((m) => m.partNumber === "N1")!;
      expect(added.type).toBe("CHARGEABLE");
      expect(added.quantity).toBe(1);
      expect(added.position).toBe("");
    });

    it("replaces empty rows that share a position with an imported material", async () => {
      const { props } = createHookProps({
        formValues: { [`${SPARE}#0_sparePartNumber`]: "" },
      });
      const { result } = renderManager(props);
      await waitFor(() => {
        expect(result.current.materials).toHaveLength(1);
      });

      act(() => {
        result.current.onAddMaterials([{ partNumber: "N2", position: "SP" }]);
      });

      expect(result.current.materials.map((m) => m.partNumber)).toEqual(["N2"]);
    });

    it("does nothing when every imported material already exists", async () => {
      const { props, mocks } = createHookProps();
      const { result } = renderManager(props);
      await waitFor(() => {
        expect(result.current.materials).toHaveLength(1);
      });
      mocks.setArePricesValidated.mockClear();

      act(() => {
        result.current.onAddMaterials([{ partNumber: "EXISTING-PN" }]);
      });

      expect(result.current.materials).toHaveLength(1);
      expect(mocks.setArePricesValidated).not.toHaveBeenCalled();
    });
  });

  describe("onRestoreRow", () => {
    const archivedProps = (overrides: Parameters<typeof createHookProps>[0] = {}) =>
      createHookProps({
        diagnosticData: { jobId: "J-R", archivedMaterials: [apiArchivedMaterial("ARCH-1")] },
        ...overrides,
      });

    it("shows an error and keeps the row archived when the position is full", async () => {
      const setMessages = vi.fn();
      const { props, mocks } = archivedProps({
        allowedPositions: [makeAllowedPosition("SP", "USER", 1, 1)],
      });
      const { result } = renderManager(props, setMessages);
      await waitFor(() => {
        expect(mocks.setInitialFormValues).toHaveBeenCalled();
      });
      act(() => {
        result.current.setMaterials([makeItem({ position: "SP", partNumber: "FULL" })]);
      });

      act(() => {
        result.current.onRestoreRow(`${ARCHIVED}#0`);
      });

      expect(setMessages).toHaveBeenCalledTimes(1);
      const updater = setMessages.mock.calls[0][0] as (prev: unknown[]) => unknown[];
      expect(updater([])).toEqual([{ type: "error", text: "restoreNotAllowed", duration: 5000 }]);
      expect(scrollToTop).toHaveBeenCalled();
      expect(result.current.materials.map((m) => m.partNumber)).not.toContain("ARCH-1");
    });

    it("ignores unknown archived areas", async () => {
      const setMessages = vi.fn();
      const { props, mocks } = archivedProps();
      const { result } = renderManager(props, setMessages);
      await waitFor(() => {
        expect(mocks.setInitialFormValues).toHaveBeenCalled();
      });
      mocks.setArePricesValidated.mockClear();

      act(() => {
        result.current.onRestoreRow(`${ARCHIVED}#7`);
      });

      expect(setMessages).not.toHaveBeenCalled();
      expect(mocks.setArePricesValidated).not.toHaveBeenCalled();
    });

    it("ignores restores when the diagnostic tab is missing", () => {
      const { props, mocks } = createHookProps({ tabs: [] });
      const { result } = renderManager(props);
      mocks.setArePricesValidated.mockClear();

      act(() => {
        result.current.onRestoreRow(`${ARCHIVED}#0`);
      });

      expect(mocks.setArePricesValidated).not.toHaveBeenCalled();
    });

    it("ignores restores when no archived material exists for the area", () => {
      const { props, mocks } = createHookProps();
      const { result } = renderManager(props);
      mocks.setArePricesValidated.mockClear();

      act(() => {
        result.current.onRestoreRow(`${ARCHIVED}#0`);
      });

      expect(mocks.setArePricesValidated).not.toHaveBeenCalled();
    });

    it("removes the archived area and fields when a row is restored", async () => {
      const { props, mocks } = archivedProps();
      const { result } = renderManager(props);
      await waitFor(() => {
        expect(mocks.setInitialFormValues).toHaveBeenCalled();
      });

      act(() => {
        result.current.onRestoreRow(`${ARCHIVED}#0`);
      });

      const remainingFields = functionalCalls<Field[]>(mocks.setAllFields)
        .map((update) => update(props.allFields))
        .find((fields) => fields.length < props.allFields.length)!;
      expect(remainingFields.some((f) => f.name.startsWith(ARCHIVED))).toBe(false);

      const otherTab: Section = { ...makeDiagnosticsTab([archivedArea]), name: "other" };
      const nextTabs = functionalCalls<Section[]>(mocks.setTabs)
        .map((update) => update([...props.tabs, otherTab]))
        .find((tabs) => countAreas(tabs) < countAreas(props.tabs))!;
      expect(nextTabs.find((tab) => tab.name === "other")).toBe(otherTab);
    });
  });

  describe("helpers", () => {
    it("getPositionConfig returns the configured position or undefined", () => {
      const { props } = createHookProps();
      const { result } = renderManager(props);

      expect(result.current.getPositionConfig("PN")?.position).toBe("PN");
      expect(result.current.getPositionConfig("ZZ")).toBeUndefined();
    });

    it("getExistingPartNumbers collects non-empty part numbers from the given form values", () => {
      const { props } = createHookProps();
      const { result } = renderManager(props);

      expect(
        result.current.getExistingPartNumbers({ [`${SPARE}#0_sparePartNumber`]: "AAA" }),
      ).toEqual(new Set(["AAA"]));
      expect(result.current.getExistingPartNumbers({ [`${SPARE}#0_sparePartNumber`]: "" })).toEqual(
        new Set(),
      );
    });

    it("getExistingPartNumbers returns an empty set when no fields are loaded", () => {
      const { props } = createHookProps({ allFields: [] });
      const { result } = renderManager(props);

      expect(result.current.getExistingPartNumbers({ anything: "x" })).toEqual(new Set());
    });

    it("setRevisedRejectedRowPending ignores unknown areas and non-resettable statuses", () => {
      const { props } = createHookProps();
      const { result } = renderManager(props);
      act(() => {
        result.current.setMaterials([makeItem({ status: "APPROVED" })]);
      });

      act(() => {
        result.current.setRevisedRejectedRowPending("unknown-area");
        result.current.setRevisedRejectedRowPending(`${SPARE}#0`);
      });

      expect(result.current.materials[0].status).toBe("APPROVED");
    });

    it("setRevisedRejectedRowPending resets REVISED rows", () => {
      const { props } = createHookProps();
      const { result } = renderManager(props);
      act(() => {
        result.current.setMaterials([makeItem({ status: "REVISED" })]);
      });

      act(() => {
        result.current.setRevisedRejectedRowPending(`${SPARE}#0`);
      });

      expect(result.current.materials[0].status).toBe("PENDING");
    });

    it("setRevisedRejectedRowPending ignores rows without a status", () => {
      const { props } = createHookProps();
      const { result } = renderManager(props);
      act(() => {
        result.current.setMaterials([makeItem({ status: undefined })]);
      });

      act(() => {
        result.current.setRevisedRejectedRowPending(`${SPARE}#0`);
      });

      expect(result.current.materials[0].status).toBeUndefined();
    });

    it("setRevisedRejectedRowPending ignores calls when the diagnostic tab is missing", () => {
      const { props } = createHookProps({ tabs: [] });
      const { result } = renderManager(props);
      act(() => {
        result.current.setMaterials([makeItem({ status: "REJECTED" })]);
      });

      act(() => {
        result.current.setRevisedRejectedRowPending(`${SPARE}#0`);
      });

      expect(result.current.materials[0].status).toBe("REJECTED");
    });
  });
});
