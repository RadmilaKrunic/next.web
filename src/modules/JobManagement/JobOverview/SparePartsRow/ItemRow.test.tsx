import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Formik, useFormikContext } from "formik";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { DiagnosticsContext } from "../DiagnosticsContext";
import { ClaimContext } from "../../../ClaimManagement/ClaimOverview/ClaimContext";
import { createDefaultItemsContextValue, type ItemsContextValue } from "hooks/itemsManager/ItemsContext";
import ItemRow from "./ItemRow";
import { jobItemRowSurfaceConfig } from "./jobItemRowSurfaceConfig";
import { claimItemRowSurfaceConfig } from "../../../ClaimManagement/ClaimOverview/ClaimSparePartsRow/claimItemRowSurfaceConfig";
import type Field from "components/generics/Field/GenericField.types";

// Phase 5 unification (items-and-prices-refactor.md §15 step 6) — this file is a
// deliberately-scoped, real verification pass proving the merged ItemRow renders and
// behaves correctly for both the job (ItemRowSurfaceConfig=jobItemRowSurfaceConfig) and
// claim (claimItemRowSurfaceConfig) surfaces, focused on every divergence point named in
// ItemRowSurfaceConfig.ts's field docstrings and confirmed against the two pre-merge
// components (SparePartsRow.tsx, ClaimSparePartsRow.tsx). It is NOT a 1:1 port of every
// case in SparePartsRow.test.tsx (2037 lines) / ClaimSparePartsRow.test.tsx (691 lines) —
// that full historical-parity port is explicitly flagged as a remaining task before
// Step 10 can delete those two old test files (see items-and-prices-refactor.md §15).

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({ onClick, iconName }: { onClick?: () => void; iconName: string }) => (
    <button type="button" data-testid={`icon-${iconName}`} onClick={onClick}>
      {iconName}
    </button>
  ),
  Divider: () => <div data-testid="divider" />,
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(() => true),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ jobId: "job-1" }),
}));

vi.mock("../CustomerMessageModal/CustomerMessageModal", () => ({
  default: () => null,
}));

vi.mock(
  "../../../ClaimManagement/ApprovalList/ApprovalListTable/ApprovalActionsFlyout/ApprovalActionsFlyout",
  () => ({
    default: () => null,
  }),
);

vi.mock("components/generics/Field/GenericField", () => ({
  default: function MockGenericField({ field }: { field: Field }) {
    const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
    const fieldValue = values[field.name];
    const normalizedValue =
      typeof fieldValue === "string" || typeof fieldValue === "number" ? String(fieldValue) : "";

    if (field.type === "dropdown") {
      return (
        <select
          data-testid={`field-${field.name}`}
          value={normalizedValue}
          disabled={field.isDisabled}
          onChange={(e) => {
            void setFieldValue(field.name, e.target.value);
          }}
        >
          {(field.options ?? []).map((option) => (
            <option
              key={`${field.name}-${String(option.value)}`}
              value={String(option.value ?? "")}
              disabled={option.disabled}
            >
              {String(option.name ?? option.value ?? "")}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        data-testid={`field-${field.name}`}
        value={normalizedValue}
        disabled={field.isDisabled}
        onChange={(e) => {
          void setFieldValue(field.name, e.target.value);
        }}
      />
    );
  },
}));

const createField = (overrides: Partial<Field>): Field => ({
  name: "",
  label: "",
  type: "text",
  sameDataFieldAs: "",
  pattern: "",
  maxLength: 0,
  minLength: 0,
  minValue: 0,
  maxValue: 0,
  position: 0,
  size: "3",
  infoText: "",
  patternText: "",
  extensions: [""],
  attributeMapping: "",
  dependFieldCondition: "AND",
  dependentFields: [],
  defaultValue: "",
  isDisabled: false,
  isHidden: false,
  isInfoIcon: false,
  isSubField: false,
  autoFillFields: [],
  ...overrides,
});

type Surface = "jobDiagnostics" | "claimSpareParts";

const NAME_STARTS_WITH: Record<Surface, string> = {
  jobDiagnostics: "diagnosticsSpareParts#0_",
  claimSpareParts: "claims_claimSpareParts#0_",
};

function buildFields(surface: Surface): Field[] {
  const nameStartsWith = NAME_STARTS_WITH[surface];
  const fieldMapping = (originalName: string) => ({
    originalName,
    map: originalName,
    parentMap: [],
    prefixes: [],
    nameStartsWith,
  });

  return [
    createField({
      name: `${nameStartsWith}position`,
      subtype: "diagnosticPosition",
      type: "dropdown",
      options: [
        { value: "LA", name: "LA" },
        { value: "SP", name: "SP" },
        { value: "FR", name: "FR" },
      ],
      fieldMapping: fieldMapping("position"),
    }),
    createField({
      name: `${nameStartsWith}partNumber`,
      subtype: "diagnosticPartNumber",
      type: "text",
      fieldMapping: fieldMapping("partNumber"),
    }),
    createField({
      name: `${nameStartsWith}description`,
      subtype: "diagnosticDescription",
      type: "text",
      fieldMapping: fieldMapping("description"),
    }),
    createField({
      name: `${nameStartsWith}type`,
      subtype: "diagnosticType",
      type: "dropdown",
      options: [
        { value: "WARRANTY", name: "WARRANTY" },
        { value: "SERVICE_OFFERING", name: "SERVICE_OFFERING" },
        { value: "CHARGEABLE", name: "CHARGEABLE" },
        { value: "COMMERCIAL_GOODWILL", name: "COMMERCIAL_GOODWILL" },
      ],
      fieldMapping: fieldMapping("type"),
    }),
    createField({
      name: `${nameStartsWith}quantity`,
      subtype: "diagnosticQuantity",
      type: "number",
      fieldMapping: fieldMapping("quantity"),
    }),
    createField({
      name: `${nameStartsWith}unitPrice`,
      subtype: "diagnosticUnitPrice",
      type: "price",
      fieldMapping: fieldMapping("unitPrice"),
    }),
    createField({
      name: `${nameStartsWith}status`,
      subtype: "diagnosticMaterialStatus",
      type: "dropdown",
      options: [
        { value: "PENDING", name: "PENDING" },
        { value: "APPROVED", name: "APPROVED" },
      ],
      fieldMapping: fieldMapping("status"),
    }),
    createField({
      name: `${nameStartsWith}materialId`,
      subtype: "diagnosticMaterialId",
      type: "text",
      fieldMapping: fieldMapping("materialId"),
    }),
    createField({
      name: `${nameStartsWith}discount`,
      subtype: "diagnosticDiscount",
      type: "number",
      dependentFields: [{ fieldName: "discountBase", fieldValue: "GROSS_PRICE" }],
      fieldMapping: fieldMapping("discount"),
    }),
    createField({
      name: `${nameStartsWith}discountHidden`,
      subtype: "diagnosticDiscountHidden",
      type: "number",
      fieldMapping: fieldMapping("discountHidden"),
    }),
  ];
}

type RenderOptions = {
  surface: Surface;
  initialValues: Record<string, unknown>;
  fields?: Field[];
  contextOverrides?: Partial<ItemsContextValue>;
  isDisabled?: boolean;
  onDeleteRow?: () => void;
  isResyncing?: boolean;
};

function renderItemRow({
  surface,
  initialValues,
  fields,
  contextOverrides = {},
  isDisabled = false,
  onDeleteRow = vi.fn(),
  isResyncing = false,
}: RenderOptions) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], { permissions: ["ALL"] });
  const rowFields = fields ?? buildFields(surface);
  const config = surface === "jobDiagnostics" ? jobItemRowSurfaceConfig : claimItemRowSurfaceConfig;

  const contextValue: ItemsContextValue = createDefaultItemsContextValue({
    arePricesValidated: true,
    markRowDirty: vi.fn(),
    setMaterials: vi.fn(),
    allowedPositions: [],
    positionDropdownOptions: [],
    isResyncingRef: { current: isResyncing },
    setRevisedRejectedRowPending: vi.fn(),
    canArchiveOnDelete: false,
    resyncMaterialsFromAPI: vi.fn(),
    jobStatus: "IN_DIAGNOSTICS",
    discountBase: "GROSS_PRICE",
    automaticRows: [],
    isValidating: false,
    canDeleteRows: true,
    materials: [{ isNew: true } as ItemsContextValue["materials"][number]],
    isClaimPending: false,
    ...contextOverrides,
  });

  const ContextProvider = surface === "jobDiagnostics" ? DiagnosticsContext.Provider : ClaimContext.Provider;

  return render(
    <QueryClientProvider client={queryClient}>
      <GenericFormContext.Provider
        value={{
          allFields: rowFields,
          setAllFields: vi.fn(),
          mandatoryFields: null,
          setMandatoryFields: vi.fn(),
          actionCallbacks: {},
          sparePartNotBelongsToTool: { current: {} },
          warrantyPanelInfo: { isIneligible: false, hasPurchaseDate: true, supportedWarrantyType: "" },
        }}
      >
        <ContextProvider value={contextValue}>
          <Formik initialValues={initialValues} onSubmit={vi.fn()}>
            <ItemRow fields={rowFields} onDeleteRow={onDeleteRow} isDisabled={isDisabled} config={config} />
          </Formik>
        </ContextProvider>
      </GenericFormContext.Provider>
    </QueryClientProvider>,
  );
}

function baseValues(surface: Surface, overrides: Record<string, unknown> = {}) {
  const p = NAME_STARTS_WITH[surface];
  return {
    [`${p}position`]: "SP",
    [`${p}partNumber`]: "PN-1",
    [`${p}description`]: "",
    [`${p}type`]: "WARRANTY",
    [`${p}quantity`]: 1,
    [`${p}unitPrice`]: 0,
    [`${p}status`]: "PENDING",
    [`${p}materialId`]: "",
    [`${p}discount`]: 0,
    [`${p}discountHidden`]: 0,
    ...overrides,
  };
}

describe.each<Surface>(["jobDiagnostics", "claimSpareParts"])(
  "ItemRow (%s) — renders and full-row disablement",
  (surface) => {
    const p = NAME_STARTS_WITH[surface];

    it("renders the row's fields", () => {
      renderItemRow({ surface, initialValues: baseValues(surface) });
      expect(screen.getByTestId(`field-${p}position`)).toBeInTheDocument();
      expect(screen.getByTestId(`field-${p}unitPrice`)).toBeInTheDocument();
    });

    it("disables every field when the isDisabled prop is true", () => {
      renderItemRow({ surface, initialValues: baseValues(surface), isDisabled: true });
      expect(screen.getByTestId(`field-${p}position`)).toBeDisabled();
      expect(screen.getByTestId(`field-${p}unitPrice`)).toBeDisabled();
      expect(screen.getByTestId(`field-${p}type`)).toBeDisabled();
    });
  },
);

describe("ItemRow (jobDiagnostics) — full-row disablement divergence", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;

  it("disables every field when material status is APPROVED", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", { [`${p}status`]: "APPROVED" }),
    });
    expect(screen.getByTestId(`field-${p}unitPrice`)).toBeDisabled();
  });

  it("disables every field when the job status disables the row", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics"),
      contextOverrides: { jobStatus: "RETURN_ASSEMBLY" },
    });
    expect(screen.getByTestId(`field-${p}unitPrice`)).toBeDisabled();
  });

  it("disables every field while validation is in flight", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics"),
      contextOverrides: { isValidating: true },
    });
    expect(screen.getByTestId(`field-${p}unitPrice`)).toBeDisabled();
  });

  it("leaves fields enabled when none of the disabling conditions apply", () => {
    renderItemRow({ surface: "jobDiagnostics", initialValues: baseValues("jobDiagnostics") });
    expect(screen.getByTestId(`field-${p}position`)).not.toBeDisabled();
  });
});

describe("ItemRow (claimSpareParts) — full-row disablement divergence", () => {
  const p = NAME_STARTS_WITH.claimSpareParts;

  it("disables every field when isClaimPending is true (job's isApproved/isStatusDisabled/isValidating have no claim equivalent)", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      contextOverrides: { isClaimPending: true },
    });
    expect(screen.getByTestId(`field-${p}unitPrice`)).toBeDisabled();
  });

  it("keeps the type field editable even when the row is not new and every other field is locked", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      contextOverrides: { materials: [{ isNew: false }] as ItemsContextValue["materials"] },
    });
    expect(screen.getByTestId(`field-${p}type`)).not.toBeDisabled();
    expect(screen.getByTestId(`field-${p}position`)).toBeDisabled();
  });

  it("on a new row: enables non-price fields but keeps price fields disabled", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      contextOverrides: { materials: [{ isNew: true }] as ItemsContextValue["materials"] },
    });
    expect(screen.getByTestId(`field-${p}position`)).not.toBeDisabled();
    expect(screen.getByTestId(`field-${p}unitPrice`)).toBeDisabled();
  });
});

describe("ItemRow (jobDiagnostics) — delete icon visibility", () => {
  it("shows the delete icon and invokes onDeleteRow when clicked", () => {
    const onDeleteRow = vi.fn();
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics"),
      onDeleteRow,
    });
    const icon = screen.getByTestId("icon-delete");
    fireEvent.click(icon);
    expect(onDeleteRow).toHaveBeenCalledTimes(1);
  });

  it("never shows a delete icon for the LA position", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", {
        [`${NAME_STARTS_WITH.jobDiagnostics}position`]: "LA",
      }),
    });
    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("hides the delete icon while the job is on hold", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: { ...baseValues("jobDiagnostics"), isOnHold: true },
    });
    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("hides the delete icon when the row is disabled and archiving on delete is not allowed", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics"),
      isDisabled: true,
      contextOverrides: { canArchiveOnDelete: false },
    });
    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("shows the delete icon when the row is disabled but archiving on delete is allowed", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics"),
      isDisabled: true,
      contextOverrides: { canArchiveOnDelete: true },
    });
    expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
  });

  it("hides row actions entirely for an automatic exchange row", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: { ...baseValues("jobDiagnostics"), actionType: "SPARE_PARTS_EXCHANGE" },
      contextOverrides: { automaticRows: ["SP"] },
    });
    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });
});

describe("ItemRow (claimSpareParts) — delete icon visibility divergence", () => {
  it("shows the delete icon and invokes onDeleteRow when canDeleteRows is true and the position isn't automatic", () => {
    const onDeleteRow = vi.fn();
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      onDeleteRow,
      contextOverrides: { canDeleteRows: true, automaticRows: [] },
    });
    const icon = screen.getByTestId("icon-delete");
    fireEvent.click(icon);
    expect(onDeleteRow).toHaveBeenCalledTimes(1);
  });

  it("hides the delete icon when canDeleteRows is false (job's LA/status/hold rules have no claim equivalent)", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      contextOverrides: { canDeleteRows: false },
    });
    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("hides the delete icon when the row's position is one of the diagnostic rule's automatic rows", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      contextOverrides: { canDeleteRows: true, automaticRows: ["SP"] },
    });
    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });
});

describe("ItemRow — position field options divergence", () => {
  it("job: disables a position option once its per-job maxCount is already used by a sibling row", () => {
    const p = NAME_STARTS_WITH.jobDiagnostics;
    const siblingField = createField({
      name: `${p.replace("#0_", "#1_")}position`,
      subtype: "diagnosticPosition",
      fieldMapping: {
        originalName: "position",
        map: "position",
        parentMap: [],
        prefixes: [],
        nameStartsWith: p.replace("#0_", "#1_"),
      },
    });
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: {
        ...baseValues("jobDiagnostics"),
        [siblingField.name]: "SP",
      },
      fields: [...buildFields("jobDiagnostics"), siblingField],
      contextOverrides: { allowedPositions: [{ position: "SP", maxCount: 1, editable: true }] },
    });
    const select = screen.getByTestId(`field-${p}position`) as HTMLSelectElement;
    const spOption = Array.from(select.options).find((o) => o.value === "SP");
    expect(spOption?.disabled).toBe(true);
  });

  it("claim: prepends a disabled Select placeholder option", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      contextOverrides: { materials: [{ isNew: true }] as ItemsContextValue["materials"] },
    });
    const select = screen.getByTestId(`field-${NAME_STARTS_WITH.claimSpareParts}position`) as HTMLSelectElement;
    expect(select.options[0].value).toBe("");
    expect(select.options[0].disabled).toBe(true);
  });
});

describe("ItemRow (jobDiagnostics) — extra effects gating", () => {
  it("syncs the active discount field from the hidden discount field during API resync (discountHiddenSync)", () => {
    const p = NAME_STARTS_WITH.jobDiagnostics;
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", { [`${p}discount`]: 0, [`${p}discountHidden`]: 15 }),
      isResyncing: true,
    });
    const discountInput = screen.getByTestId(`field-${p}discount`) as HTMLInputElement;
    expect(discountInput.value).toBe("15");
  });
});

describe("ItemRow (claimSpareParts) — extra effects gating divergence", () => {
  it("does not sync the active discount field from the hidden discount field (claim has discountHiddenSync=false)", () => {
    const p = NAME_STARTS_WITH.claimSpareParts;
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", { [`${p}discount`]: 0, [`${p}discountHidden`]: 15 }),
      isResyncing: true,
    });
    const discountInput = screen.getByTestId(`field-${p}discount`) as HTMLInputElement;
    expect(discountInput.value).toBe("0");
  });
});

describe("ItemRow (jobDiagnostics) — permission-gated approval flyout vs delete icon", () => {
  it("renders nothing for row actions (not even the delete icon) when the user can approve commercial goodwill and the material is not pending (hasApprovalFlyout gate takes priority)", () => {
    // useHasPermission is mocked to always return true (see top-level mock), so
    // hasApproveCommercialGoodwillPermission is true here — job's renderRowActions
    // then returns the flyout-or-null branch (isPending ? flyout : null) before it
    // ever reaches canShowDeleteIcon. Claim has hasApprovalFlyout: false, so it never
    // takes this branch at all — see claimItemRowSurfaceConfig.ts.
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", {
        [`${NAME_STARTS_WITH.jobDiagnostics}status`]: "APPROVED",
      }),
    });
    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });
});
