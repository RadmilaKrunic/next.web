import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Dedicated to Phase 3's debounced backend-authoritative price-validate call
// (items-and-prices-refactor.md §15/§10), gated behind ENABLE_PRICE_VALIDATE_API — split out
// from the main useItemsManager.test.ts (which stays untouched, running with the flag at its
// real default `false`) the same way useSparePartPriceCalculation.debounce.test.ts is split
// from useSparePartPriceCalculation.test.ts. Flag-off behavior needs no dedicated test here:
// the new effect's very first line is `if (!ENABLE_PRICE_VALIDATE_API) return;`, so
// useItemsManager.test.ts's existing 900+ lines already prove "zero behavior change while off"
// by construction — the same verification story ENABLE_ITEM_RULES_RESOLVER's rollout used.

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

vi.mock("utils/itemRulesResolver", async (importOriginal) => {
  const actual = await importOriginal<typeof import("utils/itemRulesResolver")>();
  return { ...actual, ENABLE_PRICE_VALIDATE_API: true };
});

const { diagnosticMutate, claimMutate } = vi.hoisted(() => ({
  diagnosticMutate: vi.fn(),
  claimMutate: vi.fn(),
}));

vi.mock("api/services/jobs/hooks", () => ({
  usePostValidateDiagnosticPrices: () => ({ mutate: diagnosticMutate }),
}));

vi.mock("api/services/claims/hooks", () => ({
  useValidateClaimPrices: () => ({ mutate: claimMutate }),
}));

import { useQueryClient } from "@tanstack/react-query";
import { useBareSalesRelation } from "api/services/bareSalesRelation/hooks";
import { useItemsManager } from "./useItemsManager";
import type { MaterialItem, ItemsSurfaceConfig } from "./itemsManager.types";
import type {
  AllowedPosition,
  CountryConfig,
  discountBase,
} from "api/services/countryConfiguration/countryConfiguration";
import type { HeaderUserData } from "api/services/header/action";
import type Field from "components/generics/Field/GenericField.types";
import type Area from "components/generics/Area/GenericArea.types";
import type Section from "components/generics/Section/GenericSection.types";

const makeField = (name: string, subtype?: string): Field => ({
  name,
  label: name,
  type: "text",
  subtype,
  isDisabled: false,
});

const makeArea = (name: string, fields: Field[]): Area => ({
  name,
  label: name,
  position: 0,
  fields,
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: false,
  isMultiple: true,
  index: 0,
});

const makeTab = (name: string, areas: Area[]): Section => ({
  name,
  label: name,
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

const allowedPosition: AllowedPosition = {
  position: "SP",
  minCount: 0,
  maxCount: 5,
  quantity: { quantitySource: "USER", defaultQuantity: 1 },
  unitPriceSource: "USER",
};

const countryConfiguration: CountryConfig = {
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
    addSpecialMaterialsAllowed: false,
    discountBase: "NET_PRICE",
    rules: [
      {
        actionType: "REPAIR",
        jobType: "CHARGEABLE",
        rule: { automaticRows: [], allowedPositions: [allowedPosition], enforceSparepartExists: false },
      },
    ],
  },
};

const user: HeaderUserData = {
  countryCode: "ZA",
  permissions: [],
  type: "SERVICE_CENTER",
} as unknown as HeaderUserData;

const rawMaterial = {
  position: "SP",
  partNumber: "PN-1",
  description: "Spare part",
  jobType: "CHARGEABLE",
  quantity: 1,
  price: { unitPrice: 50, tax: 0, discount: 0 },
  order: 1,
};

const toMaterialItem = (
  raw: Record<string, unknown>,
  _mode: discountBase,
  ctx: { forceValidated: boolean },
): MaterialItem => {
  const price = (raw.price as { unitPrice: number }) ?? { unitPrice: 0 };
  return {
    position: raw.position as string,
    partNumber: raw.partNumber as string,
    description: raw.description as string,
    type: raw.jobType as string,
    quantity: raw.quantity as number,
    unitPrice: price.unitPrice,
    netAmount: price.unitPrice,
    tax: 0,
    grossAmount: price.unitPrice,
    discount: 0,
    taxAmount: 0,
    totalAmount: price.unitPrice,
    suggestedNetPrice: price.unitPrice,
    isValidated: ctx.forceValidated,
    order: raw.order as number,
    isPriceSetManually: false,
  };
};

const buildConfig = (
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
  resetKey: "J-1",
  apiMaterials: [rawMaterial],
  apiArchivedMaterials: undefined,
  toMaterialItem,
  currentActionType: "REPAIR",
  currentJobType: "CHARGEABLE",
  autoBuildAutomaticRows: false,
  bareSalesAutofill: undefined,
  positionViewPermissions: {},
  positionInsertPermissions: undefined,
  newRowDefaults: { resolveType: () => "", resolvePosition: () => "" },
  deletionPolicy: { permanentDeleteFromActiveStatuses: undefined, supportsPermanentArchivedDelete: false },
  resyncOnApiMaterialsReferenceChange: false,
  setArePricesValidatedOnSync: false,
  jobStatus: "IN_DIAGNOSTICS",
  ...overrides,
});

const mountHook = (config: ItemsSurfaceConfig<Record<string, unknown>>) => {
  const setTabs = vi.fn();
  const setAllFields = vi.fn();
  const setInitialFormValues = vi.fn();
  const setArePricesValidated = vi.fn();
  const skipFormResetRef = { current: false };
  const formValuesRef = { current: { actionType: "REPAIR", jobType: "CHARGEABLE" } };

  const fields = [
    makeField(`${config.identity.naming.tabName}_${config.identity.naming.liveAreaMarker}#0_position`),
  ];
  const tabs = [
    makeTab(config.identity.naming.tabName, [
      makeArea(`${config.identity.naming.tabName}_${config.identity.naming.liveAreaMarker}#0`, fields),
    ]),
  ];

  return renderHook(() =>
    useItemsManager({
      config,
      tabs,
      setTabs,
      allFields: fields,
      setAllFields,
      setInitialFormValues,
      skipFormResetRef,
      formValuesRef,
      arePricesValidated: false,
      setArePricesValidated,
      readOnly: false,
    }),
  );
};

const getQueryData = vi.fn((key: unknown) => {
  if (Array.isArray(key) && key[0] === "user") return user;
  if (Array.isArray(key) && key[0] === "countryConfiguration") return countryConfiguration;
  return undefined;
});

beforeEach(() => {
  diagnosticMutate.mockClear();
  claimMutate.mockClear();
  getQueryData.mockClear();
  vi.mocked(useQueryClient).mockReturnValue({ getQueryData } as never);
  vi.mocked(useBareSalesRelation).mockReturnValue({ data: undefined } as never);
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useItemsManager — Phase 3 price validate (ENABLE_PRICE_VALIDATE_API)", () => {
  it("fires the diagnostic validate mutation ~500ms after a row is marked dirty", () => {
    const { result } = mountHook(buildConfig());
    expect(result.current.materials).toHaveLength(1);

    act(() => {
      result.current.markRowDirty(0);
    });
    expect(diagnosticMutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(diagnosticMutate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(diagnosticMutate).toHaveBeenCalledTimes(1);
    expect(claimMutate).not.toHaveBeenCalled();

    const [call] = diagnosticMutate.mock.calls[0];
    expect(call.jobId).toBe("J-1");
    expect(call.request.changedRows).toEqual([
      expect.objectContaining({ rowId: "row-0", row: expect.objectContaining({ position: "SP" }) }),
    ]);
    expect(call.mockContext.baseline.materials).toHaveLength(1);
  });

  it("applies a fresh response's materials back via setMaterials, marking the row validated", () => {
    const { result } = mountHook(buildConfig());

    act(() => {
      result.current.markRowDirty(0);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(diagnosticMutate).toHaveBeenCalledTimes(1);

    const [, opts] = diagnosticMutate.mock.calls[0];
    const requestId = diagnosticMutate.mock.calls[0][0].request.requestId;
    act(() => {
      opts.onSuccess({
        requestId,
        diagnostic: {
          materials: [
            {
              rowId: "row-0",
              position: "SP",
              partNumber: "PN-1",
              description: "Spare part",
              type: "CHARGEABLE",
              quantity: 1,
              isPriceSetManually: false,
              isValidated: true,
              changeStatus: "confirmed",
              price: {
                unitPrice: 60,
                netAmount: 60,
                tax: 0,
                grossAmount: 60,
                discount: 0,
                discountAmount: 0,
                taxAmount: 0,
                totalAmount: 60,
                suggestedNetPrice: 60,
              },
            },
          ],
        },
      });
    });

    expect(result.current.materials[0].isValidated).toBe(true);
    expect(result.current.materials[0].unitPrice).toBe(60);
  });

  it("discards a stale response whose requestId is no longer the latest", () => {
    const { result } = mountHook(buildConfig());

    act(() => {
      result.current.markRowDirty(0);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(diagnosticMutate).toHaveBeenCalledTimes(1);
    const firstCall = diagnosticMutate.mock.calls[0];
    const firstRequestId = firstCall[0].request.requestId;
    const firstOnSuccess = firstCall[1].onSuccess;

    // A second, genuinely different edit (quantity 1 -> 2) lands before the first call's
    // response arrives — markRowDirty alone wouldn't change the dirty-rows snapshot content
    // (isValidated stays false -> false), so the debounce needs an actual field change to
    // re-fire, exactly like a real second keystroke would produce.
    act(() => {
      result.current.setMaterials((prev) =>
        prev.map((m, i) => (i === 0 ? { ...m, quantity: 2, isValidated: false } : m)),
      );
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(diagnosticMutate).toHaveBeenCalledTimes(2);
    const secondCall = diagnosticMutate.mock.calls[1];
    expect(secondCall[0].request.requestId).not.toBe(firstRequestId);

    // The first (now-stale) call's response arrives after the second was already sent.
    act(() => {
      firstOnSuccess({
        requestId: firstRequestId,
        diagnostic: {
          materials: [
            {
              rowId: "row-0",
              position: "SP",
              partNumber: "PN-1",
              description: "Spare part",
              type: "CHARGEABLE",
              quantity: 1,
              isPriceSetManually: false,
              isValidated: true,
              changeStatus: "confirmed",
              price: {
                unitPrice: 999,
                netAmount: 999,
                tax: 0,
                grossAmount: 999,
                discount: 0,
                discountAmount: 0,
                taxAmount: 0,
                totalAmount: 999,
                suggestedNetPrice: 999,
              },
            },
          ],
        },
      });
    });

    // Stale response discarded — the row's price was never overwritten with the stale 999.
    expect(result.current.materials[0].unitPrice).not.toBe(999);
  });

  it("never fires for the claimDiagnosticsReadOnly surface", () => {
    const config = buildConfig({
      identity: {
        surface: "claimDiagnosticsReadOnly",
        naming: {
          tabName: "diagnosticData",
          liveAreaMarker: "diagnosticsSpareParts",
          archivedAreaMarker: "archivedSpareParts",
          liveMarkerCollidesWithArchived: false,
        },
      },
    });
    const { result } = mountHook(config);

    act(() => {
      result.current.markRowDirty(0);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(diagnosticMutate).not.toHaveBeenCalled();
    expect(claimMutate).not.toHaveBeenCalled();
  });

  it("fires the claim validate mutation for a claimSpareParts surface", () => {
    const config = buildConfig({
      identity: {
        surface: "claimSpareParts",
        naming: {
          tabName: "claims",
          liveAreaMarker: "claimSpareParts",
          archivedAreaMarker: "claimArchivedSpareParts",
          liveMarkerCollidesWithArchived: true,
        },
      },
      resetKey: "C-1",
    });
    const { result } = mountHook(config);

    act(() => {
      result.current.markRowDirty(0);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(claimMutate).toHaveBeenCalledTimes(1);
    expect(diagnosticMutate).not.toHaveBeenCalled();
    const [call] = claimMutate.mock.calls[0];
    expect(call.claimId).toBe("C-1");
    expect(call.mockContext.baseline.materials).toHaveLength(1);
  });
});
