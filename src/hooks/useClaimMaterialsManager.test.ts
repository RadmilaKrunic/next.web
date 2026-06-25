import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Field from "components/generics/Field/GenericField.types";
import Section from "components/generics/Section/GenericSection.types";
import { useClaimMaterialsManager } from "./useClaimMaterialsManager";

vi.mock("components/generics/utils", () => ({
  setDuplicatedArea: vi.fn((area, index, tabName) => ({
    ...area,
    name: `${tabName}_${area.name}#${index}`,
    index,
  })),
  mapFieldToFieldMapping: vi.fn((f) => ({
    ...f,
    fieldMapping: {
      originalName: f.name,
      map: f.name,
      parentMap: "",
      prefixes: [],
    },
  })),
}));

vi.mock("hooks/useDiagnosticsManager", () => ({
  buildRowValues: vi.fn(() => ({
    "claims_claimSpareParts#0_sparePartNumber": "PN-1",
  })),
}));

const claimsTab: Section = {
  name: "claims",
  label: "Claims",
  areas: [
    {
      name: "claimSpareParts",
      label: "sp",
      isMultiple: true,
      index: 0,
      fields: [
        { name: "claims_claimSpareParts#0_position", label: "p", type: "dropdown" },
        {
          name: "claims_claimSpareParts#0_sparePartNumber",
          label: "pn",
          type: "text",
          subtype: "diagnosticPartNumber",
        },
      ],
    },
  ],
} as unknown as Section;

const allFields: Field[] = [
  { name: "claims_claimSpareParts#0_position", label: "p", type: "dropdown" },
  {
    name: "claims_claimSpareParts#0_sparePartNumber",
    label: "pn",
    type: "text",
    subtype: "diagnosticPartNumber",
  },
];

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useClaimMaterialsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns defaults when no country configuration is cached", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const setTabs = vi.fn();
    const setAllFields = vi.fn();
    const setInitialFormValues = vi.fn();
    const setArePricesValidated = vi.fn();

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs,
          allFields,
          setAllFields,
          setInitialFormValues,
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated,
          readOnly: false,
          isResyncingRef: { current: false },
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.discountBase).toBe("NET_PRICE");
    expect(result.current.allowedPositions).toEqual([]);
    expect(result.current.addSpecialMaterialsAllowed).toBe(false);
  });

  it("filters allowed positions by permission", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });
    queryClient.setQueryData(["countryConfiguration", "ZA"], {
      diagnosticsConfiguration: {
        discountBase: "GROSS_PRICE",
        addSpecialMaterialsAllowed: true,
        rules: [
          {
            actionType: "REPAIR",
            jobType: "WARRANTY",
            rule: {
              allowedPositions: [
                { position: "SP", maxCount: 5, unitPriceSource: "USER" },
                { position: "PN", maxCount: 3, unitPriceSource: "SYSTEM" },
              ],
            },
          },
        ],
      },
    });

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated: vi.fn(),
          readOnly: false,
          isResyncingRef: { current: false },
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    expect(result.current.discountBase).toBe("GROSS_PRICE");
    expect(result.current.addSpecialMaterialsAllowed).toBe(true);
    expect(result.current.allowedPositions).toHaveLength(1);
    expect(result.current.allowedPositions[0].position).toBe("SP");
  });

  it("onAddRow exits early when readOnly is true", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const setArePricesValidated = vi.fn();

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated,
          readOnly: true,
          isResyncingRef: { current: false },
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.onAddRow({});
    });

    expect(setArePricesValidated).not.toHaveBeenCalled();
  });

  it("onAddMaterials appends only non-duplicate materials", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const formValuesRef = {
      current: {
        "claims_claimSpareParts#0_sparePartNumber": "P-EXISTING",
      },
    };

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef,
          arePricesValidated: false,
          setArePricesValidated: vi.fn(),
          readOnly: false,
          isResyncingRef: { current: false },
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    act(() => {
      result.current.onAddMaterials([
        { partNumber: "P-EXISTING", quantity: 1 },
        { partNumber: "P-NEW", quantity: 2, description: "new part" },
      ] as never);
    });

    expect(result.current.materials).toHaveLength(1);
    expect(result.current.materials[0].partNumber).toBe("P-NEW");
  });

  it("getExistingPartNumbers returns part numbers from form values", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated: vi.fn(),
          readOnly: false,
          isResyncingRef: { current: false },
        }),
      { wrapper: makeWrapper(queryClient) },
    );

    const values = {
      "claims_claimSpareParts#0_sparePartNumber": "P-1",
    };

    const existing = result.current.getExistingPartNumbers(values);
    expect(existing.has("P-1")).toBe(true);
  });

  it("markAllValidated marks materials as validated and sets global validated", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const setArePricesValidated = vi.fn();

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated,
          readOnly: false,
          isResyncingRef: { current: false },
        }),
      { wrapper: makeWrapper(queryClient) },
    );

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
        },
      ] as never);
    });

    act(() => {
      result.current.markAllValidated();
    });

    expect(result.current.materials[0].isValidated).toBe(true);
    expect(setArePricesValidated).toHaveBeenCalledWith(true);
  });

  it("markRowDirty marks one row dirty and unsets global validation", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["user"], { countryCode: "ZA", permissions: [] });

    const setArePricesValidated = vi.fn();

    const { result } = renderHook(
      () =>
        useClaimMaterialsManager({
          claimId: "C1",
          claimMaterials: undefined,
          currentActionType: "REPAIR",
          currentJobType: "WARRANTY",
          tabs: [claimsTab],
          setTabs: vi.fn(),
          allFields,
          setAllFields: vi.fn(),
          setInitialFormValues: vi.fn(),
          skipFormResetRef: { current: false },
          formValuesRef: { current: {} },
          arePricesValidated: false,
          setArePricesValidated,
          readOnly: false,
          isResyncingRef: { current: false },
        }),
      { wrapper: makeWrapper(queryClient) },
    );

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
    expect(setArePricesValidated).toHaveBeenCalledWith(false);
  });
});
