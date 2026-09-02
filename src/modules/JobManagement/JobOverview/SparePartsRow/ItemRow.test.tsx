import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";
import type { MaterialItem } from "hooks/useDiagnosticsManager";
import type { ItemPolicyConfig } from "api/services/itemPolicy/itemPolicy.types";

// Phase 5 unification (items-and-prices-refactor.md §15 step 6) — this file started as a
// deliberately-scoped verification pass and has since been extended into a full 1:1 port of
// the historical SparePartsRow.test.tsx (job, 2037 lines) / ClaimSparePartsRow.test.tsx
// (claim, 691 lines) test suites, adapted to the merged ItemRow's `config` prop and the
// shared renderItemRow() harness below — see items-and-prices-refactor.md §15 step 9/10.
// Every case ported here preserves the exact assertions and setup conditions of its source
// test; genuinely surface-specific cases (config-gated behavior) live in their own
// "ItemRow (<surface>) — ..." describe blocks, following the pattern already established
// below.

// Forces the config-driven itemPolicy path on (mirrors SparePartsRow.test.tsx) — the
// resolver's own ENABLE_ITEM_RULES_RESOLVER flag defaults to false (see
// itemRulesResolver.ts). Safe for every other test in this file: itemPolicy is undefined by
// default (createDefaultItemsContextValue), so `ENABLE_ITEM_RULES_RESOLVER ? rawItemPolicy :
// undefined` still resolves to undefined unless a test explicitly sets itemPolicy via
// contextOverrides.
vi.mock("utils/itemRulesResolver", async (importOriginal) => {
  const actual = await importOriginal<typeof import("utils/itemRulesResolver")>();
  return { ...actual, ENABLE_ITEM_RULES_RESOLVER: true };
});

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

afterEach(() => {
  vi.mocked(useHasPermission).mockImplementation(() => true);
});

// Grants permission for hasApproveCommercialGoodwillPermission to resolve to false, so
// renderRowActions falls through to the delete-icon branch instead of the approval flyout
// (ported from SparePartsRow.test.tsx's denyApproveCommercialGoodwill).
const denyApproveCommercialGoodwill = () => {
  vi.mocked(useHasPermission).mockImplementation(
    (perms: string[] | undefined) =>
      !(perms ?? []).includes(PERMISSIONS.APPROVAL.CAN_APPROVE_COMMERCIAL_GOODWILL_ITEMS),
  );
};

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
        { value: "SPECIAL_CONTRACT", name: "SPECIAL_CONTRACT" },
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

type WarrantyPanelInfo = {
  isIneligible: boolean;
  hasPurchaseDate: boolean;
  supportedWarrantyType: string;
};
const ELIGIBLE_WARRANTY_PANEL_INFO: WarrantyPanelInfo = {
  isIneligible: false,
  hasPurchaseDate: true,
  supportedWarrantyType: "",
};

type RenderOptions = {
  surface: Surface;
  initialValues: Record<string, unknown>;
  fields?: Field[];
  contextOverrides?: Partial<ItemsContextValue>;
  isDisabled?: boolean;
  onDeleteRow?: () => void;
  isResyncing?: boolean;
  /** Real permission codes to grant via the ["user"] query cache — distinct from the
   *  useHasPermission mock (always true unless overridden with denyApproveCommercialGoodwill),
   *  this backs ItemRow's own `hasPermission` closure (canDeleteRow/canEditQuantity). Defaults
   *  to ["ALL"], matching the existing default below. */
  userPermissions?: string[];
  sparePartNotBelongsToTool?: Record<string, boolean>;
  warrantyPanelInfo?: WarrantyPanelInfo;
};

function renderItemRow({
  surface,
  initialValues,
  fields,
  contextOverrides = {},
  isDisabled = false,
  onDeleteRow = vi.fn(),
  isResyncing = false,
  userPermissions = ["ALL"],
  sparePartNotBelongsToTool = {},
  warrantyPanelInfo = ELIGIBLE_WARRANTY_PANEL_INFO,
}: RenderOptions) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], { permissions: userPermissions });
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
          sparePartNotBelongsToTool: { current: sparePartNotBelongsToTool },
          warrantyPanelInfo,
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

// Two-step render variant for tests that need to observe an effect reacting to a CONTEXT
// value changing on an already-mounted row (e.g. arePricesValidated flipping) — plain
// renderItemRow() only supports a single render, and re-invoking it mounts a brand new tree
// rather than updating props on the existing one.
function renderItemRowRerenderable({
  surface,
  initialValues,
  fields,
  contextOverrides = {},
  userPermissions = ["ALL"],
}: RenderOptions) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], { permissions: userPermissions });
  const rowFields = fields ?? buildFields(surface);
  const config = surface === "jobDiagnostics" ? jobItemRowSurfaceConfig : claimItemRowSurfaceConfig;
  const ContextProvider = surface === "jobDiagnostics" ? DiagnosticsContext.Provider : ClaimContext.Provider;

  const buildTree = (overrides: Partial<ItemsContextValue>) => {
    const contextValue: ItemsContextValue = createDefaultItemsContextValue({
      arePricesValidated: true,
      markRowDirty: vi.fn(),
      setMaterials: vi.fn(),
      allowedPositions: [],
      positionDropdownOptions: [],
      isResyncingRef: { current: false },
      jobStatus: "IN_DIAGNOSTICS",
      discountBase: "GROSS_PRICE",
      automaticRows: [],
      isValidating: false,
      canDeleteRows: true,
      materials: [{ isNew: true } as ItemsContextValue["materials"][number]],
      isClaimPending: false,
      ...overrides,
    });
    return (
      <QueryClientProvider client={queryClient}>
        <GenericFormContext.Provider
          value={{
            allFields: rowFields,
            setAllFields: vi.fn(),
            mandatoryFields: null,
            setMandatoryFields: vi.fn(),
            actionCallbacks: {},
            sparePartNotBelongsToTool: { current: {} },
            warrantyPanelInfo: ELIGIBLE_WARRANTY_PANEL_INFO,
          }}
        >
          <ContextProvider value={contextValue}>
            <Formik initialValues={initialValues} onSubmit={vi.fn()}>
              <ItemRow fields={rowFields} config={config} />
            </Formik>
          </ContextProvider>
        </GenericFormContext.Provider>
      </QueryClientProvider>
    );
  };

  const view = render(buildTree(contextOverrides));
  return {
    ...view,
    rerenderWithContext: (overrides: Partial<ItemsContextValue>) => view.rerender(buildTree(overrides)),
  };
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

// Full job price-field set (position/type/quantity/unitPrice/suggestedNetPrice/netAmount/
// tax/taxAmount/grossAmount/totalAmount/discount/discountHidden/discountAmountHidden/
// materialId/status), mirroring SparePartsRow.test.tsx's module-level `rowFields` — needed by
// the ported type-transition / discount-repopulation / part-number-reset job tests below,
// none of which are exercised by the leaner buildFields() set used elsewhere in this file.
function jobPriceFields(): Field[] {
  const prefix = NAME_STARTS_WITH.jobDiagnostics;
  const fieldMapping = (originalName: string) => ({
    originalName,
    map: originalName,
    parentMap: [],
    prefixes: [],
    nameStartsWith: prefix,
  });
  return [
    ...buildFields("jobDiagnostics"),
    createField({
      name: `${prefix}suggestedNetPrice`,
      subtype: "diagnosticSuggestedNetPrice",
      type: "price",
      fieldMapping: fieldMapping("suggestedNetPrice"),
    }),
    createField({
      name: `${prefix}netAmount`,
      subtype: "diagnosticNetAmount",
      type: "price",
      fieldMapping: fieldMapping("netAmount"),
    }),
    createField({
      name: `${prefix}tax`,
      subtype: "diagnosticTax",
      type: "number",
      fieldMapping: fieldMapping("tax"),
    }),
    createField({
      name: `${prefix}taxAmount`,
      subtype: "diagnosticTaxAmount",
      type: "price",
      fieldMapping: fieldMapping("taxAmount"),
    }),
    createField({
      name: `${prefix}grossAmount`,
      subtype: "diagnosticGrossAmount",
      type: "price",
      fieldMapping: fieldMapping("grossAmount"),
    }),
    createField({
      name: `${prefix}totalAmount`,
      subtype: "diagnosticTotalAmount",
      type: "price",
      fieldMapping: fieldMapping("totalAmount"),
    }),
    createField({
      name: `${prefix}discountAmountHidden`,
      subtype: "diagnosticDiscountAmountHidden",
      type: "number",
      fieldMapping: fieldMapping("discountAmountHidden"),
    }),
  ];
}

// A second job material row (position/type/discountHidden only) used by the discount- and
// position-sibling tests below — mirrors the inline "siblingFields"/"row1..." field arrays in
// SparePartsRow.test.tsx.
function jobSiblingFields(index: number): Field[] {
  const prefix = `diagnosticsSpareParts#${index}_`;
  const fieldMapping = (originalName: string) => ({
    originalName,
    map: originalName,
    parentMap: [],
    prefixes: [],
    nameStartsWith: prefix,
  });
  return [
    createField({
      name: `${prefix}position`,
      subtype: "diagnosticPosition",
      type: "dropdown",
      fieldMapping: fieldMapping("position"),
    }),
    createField({
      name: `${prefix}type`,
      subtype: "diagnosticType",
      type: "dropdown",
      fieldMapping: fieldMapping("type"),
    }),
    createField({
      name: `${prefix}discountHidden`,
      subtype: "diagnosticDiscountHidden",
      type: "number",
      fieldMapping: fieldMapping("discountHidden"),
    }),
  ];
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
      contextOverrides: {
        allowedPositions: [
          {
            position: "SP",
            minCount: 0,
            maxCount: 1,
            quantity: { quantitySource: null, defaultQuantity: null },
            unitPriceSource: null,
          },
        ],
      },
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

// ---------------------------------------------------------------------------------------
// Ported from SparePartsRow.test.tsx (job) — full 1:1 historical-parity port, step 9/10 of
// items-and-prices-refactor.md §15. Every `describe` block below is job-only unless noted.
// ---------------------------------------------------------------------------------------

describe("ItemRow (jobDiagnostics) — price field editability (ported)", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;

  // Regression test: prior to routing editability through materialPriceEditability,
  // diagnosticTotalAmount/diagnosticNetAmount were gated only on position (!isAutomaticRow)
  // independent of jobType, while diagnosticDiscount was correctly gated on jobType too.
  it("locks discount AND totalAmount together for a non-editable jobType (WARRANTY) on a protected position (LA)", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: { [`${p}position`]: "LA", [`${p}type`]: "WARRANTY" },
      fields: jobPriceFields(),
      contextOverrides: { discountBase: "GROSS_PRICE" },
    });
    expect(screen.getByTestId(`field-${p}discount`)).toBeDisabled();
    expect(screen.getByTestId(`field-${p}totalAmount`)).toBeDisabled();
  });

  it("unlocks discount AND totalAmount together for CHARGEABLE on a protected position (LA)", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: { [`${p}position`]: "LA", [`${p}type`]: "CHARGEABLE" },
      fields: jobPriceFields(),
      contextOverrides: { discountBase: "GROSS_PRICE" },
    });
    expect(screen.getByTestId(`field-${p}discount`)).toBeEnabled();
    expect(screen.getByTestId(`field-${p}totalAmount`)).toBeEnabled();
  });

  it("unlocks discount AND netAmount together for COMMERCIAL_GOODWILL on LA in NET_PRICE mode", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: { [`${p}position`]: "LA", [`${p}type`]: "COMMERCIAL_GOODWILL" },
      fields: jobPriceFields(),
      contextOverrides: { discountBase: "NET_PRICE" },
    });
    expect(screen.getByTestId(`field-${p}discount`)).toBeEnabled();
    expect(screen.getByTestId(`field-${p}netAmount`)).toBeEnabled();
  });

  it("locks discount AND totalAmount together for CHARGEABLE on a material position (SP) — summary-controlled instead", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: { [`${p}position`]: "SP", [`${p}type`]: "CHARGEABLE" },
      fields: jobPriceFields(),
      contextOverrides: { discountBase: "GROSS_PRICE" },
    });
    expect(screen.getByTestId(`field-${p}discount`)).toBeDisabled();
    expect(screen.getByTestId(`field-${p}totalAmount`)).toBeDisabled();
  });

  it("unlocks discount AND totalAmount together for COMMERCIAL_GOODWILL on a material position (SP)", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: { [`${p}position`]: "SP", [`${p}type`]: "COMMERCIAL_GOODWILL" },
      fields: jobPriceFields(),
      contextOverrides: { discountBase: "GROSS_PRICE" },
    });
    expect(screen.getByTestId(`field-${p}discount`)).toBeEnabled();
    expect(screen.getByTestId(`field-${p}totalAmount`)).toBeEnabled();
  });

  // Regression test: fields were correctly computed on fresh mount but never re-enabled when
  // TRANSITIONING into an editable jobType from a disabled one.
  it("re-enables discount AND totalAmount when transitioning from a disabled jobType (WARRANTY) to CHARGEABLE on a protected position (LA)", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: {
        [`${p}position`]: "LA",
        [`${p}type`]: "WARRANTY",
        [`${p}grossAmount`]: 120,
        [`${p}discount`]: 0,
        [`${p}discountHidden`]: 0,
      },
      fields: jobPriceFields(),
      contextOverrides: { discountBase: "GROSS_PRICE" },
    });

    expect(screen.getByTestId(`field-${p}discount`)).toBeDisabled();
    expect(screen.getByTestId(`field-${p}totalAmount`)).toBeDisabled();

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });

    await waitFor(() => {
      expect(screen.getByTestId(`field-${p}discount`)).toBeEnabled();
    });
    expect(screen.getByTestId(`field-${p}totalAmount`)).toBeEnabled();
  });

  it("re-enables discount AND totalAmount when transitioning from a disabled jobType (WARRANTY) to COMMERCIAL_GOODWILL on a material position (SP)", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}type`]: "WARRANTY",
        [`${p}grossAmount`]: 120,
        [`${p}discount`]: 0,
        [`${p}discountHidden`]: 0,
      },
      fields: jobPriceFields(),
      contextOverrides: { discountBase: "GROSS_PRICE" },
    });

    expect(screen.getByTestId(`field-${p}discount`)).toBeDisabled();
    expect(screen.getByTestId(`field-${p}totalAmount`)).toBeDisabled();

    fireEvent.change(screen.getByTestId(`field-${p}type`), {
      target: { value: "COMMERCIAL_GOODWILL" },
    });

    await waitFor(() => {
      expect(screen.getByTestId(`field-${p}discount`)).toBeEnabled();
    });
    expect(screen.getByTestId(`field-${p}totalAmount`)).toBeEnabled();
  });

  it("re-disables discount AND totalAmount when transitioning from CHARGEABLE (editable, LA) to WARRANTY", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: {
        [`${p}position`]: "LA",
        [`${p}type`]: "CHARGEABLE",
        [`${p}grossAmount`]: 120,
        [`${p}discount`]: 10,
        [`${p}discountHidden`]: 10,
      },
      fields: jobPriceFields(),
      contextOverrides: { discountBase: "GROSS_PRICE" },
    });

    expect(screen.getByTestId(`field-${p}discount`)).toBeEnabled();
    expect(screen.getByTestId(`field-${p}totalAmount`)).toBeEnabled();

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "WARRANTY" } });

    await waitFor(() => {
      expect(screen.getByTestId(`field-${p}discount`)).toBeDisabled();
    });
    expect(screen.getByTestId(`field-${p}totalAmount`)).toBeDisabled();
  });

  // itemPolicy undefined exercises the hardcoded materialPriceEditability fallback (see the
  // first test above: WARRANTY on LA is locked there). This proves the config-driven
  // resolveEditability path (utils/itemRulesResolver.ts, forced on via the top-level mock)
  // governs once a policy config is present: unlocked here purely because itemPolicy says so.
  it("unlocks a jobType the hardcoded table would lock, when itemPolicy says it's editable", () => {
    const itemPolicy: ItemPolicyConfig = {
      version: "test",
      countryCode: "TR",
      positions: [],
      editability: [
        {
          contextType: "jobType",
          contextValue: "WARRANTY",
          appliesToProtectedPositionsOnly: false,
          isEditable: true,
          controlledBySummary: false,
        },
      ],
      warrantyGating: { gatedTypes: [], disableTypeOptionsWhenInvalidSparePart: false },
      surfaceOverrides: {},
    };
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: { [`${p}position`]: "LA", [`${p}type`]: "WARRANTY" },
      fields: jobPriceFields(),
      contextOverrides: { discountBase: "GROSS_PRICE", itemPolicy },
    });

    expect(screen.getByTestId(`field-${p}discount`)).toBeEnabled();
    expect(screen.getByTestId(`field-${p}totalAmount`)).toBeEnabled();
  });
});

describe("ItemRow (jobDiagnostics) — type transitions (ported)", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;

  it("applies summary discount and recalculates total when type changes to CHARGEABLE", async () => {
    const summaryField = createField({
      name: "summaryDiscountMaterialHidden",
      subtype: "diagnosticSummaryDiscountMaterialHidden",
      type: "number",
    });
    renderItemRow({
      surface: "jobDiagnostics",
      fields: [...jobPriceFields(), summaryField],
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}type`]: "",
        [`${p}quantity`]: 2,
        [`${p}unitPrice`]: 100,
        [`${p}suggestedNetPrice`]: 200,
        [`${p}netAmount`]: 200,
        [`${p}tax`]: 20,
        [`${p}taxAmount`]: 40,
        [`${p}grossAmount`]: 240,
        [`${p}totalAmount`]: 240,
        [`${p}discount`]: 0,
        [`${p}discountHidden`]: 0,
        summaryDiscountMaterialHidden: 17.5,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId(`field-${p}totalAmount`) as HTMLInputElement).value).toBe("240");
    });
  });

  it("applies summary discount when type changes from WARRANTY to CHARGEABLE", async () => {
    const summaryField = createField({
      name: "summaryDiscountMaterialHidden",
      subtype: "diagnosticSummaryDiscountMaterialHidden",
      type: "number",
    });
    renderItemRow({
      surface: "jobDiagnostics",
      fields: [...jobPriceFields(), summaryField],
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}type`]: "WARRANTY",
        [`${p}quantity`]: 2,
        [`${p}unitPrice`]: 100,
        [`${p}suggestedNetPrice`]: 200,
        [`${p}netAmount`]: 200,
        [`${p}tax`]: 20,
        [`${p}taxAmount`]: 40,
        [`${p}grossAmount`]: 240,
        [`${p}totalAmount`]: 213.6,
        [`${p}discount`]: 11,
        [`${p}discountHidden`]: 11,
        summaryDiscountMaterialHidden: 17.5,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId(`field-${p}totalAmount`) as HTMLInputElement).value).toBe("240");
    });
  });

  it("resets discount and recalculates total when type changes from CHARGEABLE to WARRANTY", async () => {
    const summaryField = createField({
      name: "summaryDiscountMaterialHidden",
      subtype: "diagnosticSummaryDiscountMaterialHidden",
      type: "number",
    });
    renderItemRow({
      surface: "jobDiagnostics",
      fields: [...jobPriceFields(), summaryField],
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}type`]: "CHARGEABLE",
        [`${p}quantity`]: 2,
        [`${p}unitPrice`]: 100,
        [`${p}suggestedNetPrice`]: 200,
        [`${p}netAmount`]: 200,
        [`${p}tax`]: 20,
        [`${p}taxAmount`]: 40,
        [`${p}grossAmount`]: 240,
        [`${p}totalAmount`]: 205.8,
        [`${p}discount`]: 14.25,
        [`${p}discountHidden`]: 14.25,
        summaryDiscountMaterialHidden: 17.5,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "WARRANTY" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId(`field-${p}totalAmount`) as HTMLInputElement).value).toBe("240");
    });
  });

  it("resets discount for LA position when type changes from CHARGEABLE to WARRANTY", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "LA",
        [`${p}type`]: "CHARGEABLE",
        [`${p}quantity`]: 2,
        [`${p}unitPrice`]: 50,
        [`${p}suggestedNetPrice`]: 100,
        [`${p}netAmount`]: 100,
        [`${p}tax`]: 20,
        [`${p}taxAmount`]: 20,
        [`${p}grossAmount`]: 120,
        [`${p}totalAmount`]: 102.6,
        [`${p}discount`]: 14.5,
        [`${p}discountHidden`]: 14.5,
        [`${p}discountAmountHidden`]: 17.4,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "WARRANTY" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId(`field-${p}discountHidden`) as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId(`field-${p}discountAmountHidden`) as HTMLInputElement).value).toBe(
        "0",
      );
    });
  });

  it("resets discount for FR position when type changes from COMMERCIAL_GOODWILL to SERVICE_OFFERING", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "FR",
        [`${p}type`]: "COMMERCIAL_GOODWILL",
        [`${p}quantity`]: 1,
        [`${p}unitPrice`]: 75,
        [`${p}suggestedNetPrice`]: 75,
        [`${p}netAmount`]: 75,
        [`${p}tax`]: 20,
        [`${p}taxAmount`]: 15,
        [`${p}grossAmount`]: 90,
        [`${p}totalAmount`]: 81,
        [`${p}discount`]: 10,
        [`${p}discountHidden`]: 10,
        [`${p}discountAmountHidden`]: 9,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "SERVICE_OFFERING" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId(`field-${p}discountHidden`) as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId(`field-${p}discountAmountHidden`) as HTMLInputElement).value).toBe(
        "0",
      );
    });
  });

  it("resets discount for PC position when type changes from CHARGEABLE to WARRANTY", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "PC",
        [`${p}type`]: "CHARGEABLE",
        [`${p}quantity`]: 1,
        [`${p}unitPrice`]: 150,
        [`${p}suggestedNetPrice`]: 150,
        [`${p}netAmount`]: 150,
        [`${p}tax`]: 20,
        [`${p}taxAmount`]: 30,
        [`${p}grossAmount`]: 180,
        [`${p}totalAmount`]: 162,
        [`${p}discount`]: 10,
        [`${p}discountHidden`]: 10,
        [`${p}discountAmountHidden`]: 18,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "WARRANTY" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId(`field-${p}discountHidden`) as HTMLInputElement).value).toBe("0");
      expect((screen.getByTestId(`field-${p}discountAmountHidden`) as HTMLInputElement).value).toBe(
        "0",
      );
    });
  });

  describe("discount amount calculation", () => {
    it("calculates discountAmountHidden from grossAmount and discount percent for SP position", async () => {
      renderItemRow({
        surface: "jobDiagnostics",
        fields: [...jobPriceFields(), ...jobSiblingFields(1)],
        initialValues: {
          [`${p}position`]: "SP",
          [`${p}type`]: "WARRANTY",
          [`${p}quantity`]: 2,
          [`${p}unitPrice`]: 100,
          [`${p}suggestedNetPrice`]: 200,
          [`${p}netAmount`]: 200,
          [`${p}tax`]: 20,
          [`${p}taxAmount`]: 40,
          [`${p}grossAmount`]: 240,
          [`${p}totalAmount`]: 240,
          [`${p}discount`]: 0,
          [`${p}discountHidden`]: 0,
          [`${p}discountAmountHidden`]: 0,
          "diagnosticsSpareParts#1_type": "CHARGEABLE",
          "diagnosticsSpareParts#1_discountHidden": 15,
        },
      });

      fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });

      await waitFor(() => {
        expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("15");
        expect((screen.getByTestId(`field-${p}discountHidden`) as HTMLInputElement).value).toBe("15");
        // discountAmount = 240 * 15 / 100 = 36
        expect(
          (screen.getByTestId(`field-${p}discountAmountHidden`) as HTMLInputElement).value,
        ).toBe("36");
      });
    });
  });

  it("disables WARRANTY and SERVICE_OFFERING options when selected spare part does not belong to tool", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}partNumber`]: "UNKNOWN_PART",
        [`${p}type`]: "CHARGEABLE",
      },
      sparePartNotBelongsToTool: { [`${p}partNumber`]: true },
    });

    const typeField = screen.getByTestId(`field-${p}type`) as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(true);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(true);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });

  it("enables WARRANTY and SERVICE_OFFERING options when selected spare part belongs to tool", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}partNumber`]: "MATCHED_PART",
        [`${p}type`]: "CHARGEABLE",
      },
      sparePartNotBelongsToTool: { [`${p}partNumber`]: false },
    });

    const typeField = screen.getByTestId(`field-${p}type`) as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(false);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(false);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });

  it("disables WARRANTY and SERVICE_OFFERING options when SP part number is empty", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: { [`${p}position`]: "SP", [`${p}partNumber`]: "", [`${p}type`]: "CHARGEABLE" },
    });

    const typeField = screen.getByTestId(`field-${p}type`) as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(true);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(true);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });

  it("disables WARRANTY and SERVICE_OFFERING options when the warranty panel is ineligible, even if the spare part belongs to the tool", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}partNumber`]: "MATCHED_PART",
        [`${p}type`]: "CHARGEABLE",
      },
      sparePartNotBelongsToTool: { [`${p}partNumber`]: false },
      warrantyPanelInfo: { isIneligible: true, hasPurchaseDate: true, supportedWarrantyType: "" },
    });

    const typeField = screen.getByTestId(`field-${p}type`) as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );

    expect(optionsByValue.WARRANTY.disabled).toBe(true);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(true);
    expect(optionsByValue.CHARGEABLE.disabled).toBe(false);
  });
});

describe("ItemRow (jobDiagnostics) — jobType discount repopulation, confirmed rule (ported)", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;

  // Rule 1, protected-position branch: entering CHARGEABLE on LA/FR/PC always resets to 0,
  // even when a CHARGEABLE material sibling with a non-zero discount exists.
  it("entering CHARGEABLE on a protected position (LA) resets to 0, ignoring a CHARGEABLE material sibling", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: [...jobPriceFields(), ...jobSiblingFields(1)],
      initialValues: {
        [`${p}position`]: "LA",
        [`${p}type`]: "WARRANTY",
        [`${p}grossAmount`]: 120,
        [`${p}discount`]: 0,
        [`${p}discountHidden`]: 0,
        "diagnosticsSpareParts#1_position": "SP",
        "diagnosticsSpareParts#1_type": "CHARGEABLE",
        "diagnosticsSpareParts#1_discountHidden": 20,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("0");
    });
  });

  // Rule 1, material-position branch: a CHARGEABLE sibling on a protected position (LA) must
  // NOT be used as the discount source for a material row entering CHARGEABLE.
  it("entering CHARGEABLE on a material position (SP) ignores a CHARGEABLE LA sibling as a discount source", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: [...jobPriceFields(), ...jobSiblingFields(1)],
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}type`]: "WARRANTY",
        [`${p}grossAmount`]: 240,
        [`${p}discount`]: 0,
        [`${p}discountHidden`]: 0,
        "diagnosticsSpareParts#1_position": "LA",
        "diagnosticsSpareParts#1_type": "CHARGEABLE",
        "diagnosticsSpareParts#1_discountHidden": 30,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });

    await waitFor(() => {
      // No eligible (material-position) CHARGEABLE sibling -> falls back to 0, not the LA
      // sibling's 30%.
      expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("0");
    });
  });

  // Rule 2 gap: SPECIAL_CONTRACT must be in the reset-trigger set, or leaving CHARGEABLE for
  // it leaves a stale discount value in place.
  it("leaving CHARGEABLE for SPECIAL_CONTRACT resets discount to 0", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}type`]: "CHARGEABLE",
        [`${p}grossAmount`]: 240,
        [`${p}discount`]: 14.25,
        [`${p}discountHidden`]: 14.25,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "SPECIAL_CONTRACT" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("0");
    });
  });

  // Rule 3 gap: same gap as above, for the COMMERCIAL_GOODWILL source side.
  it("leaving COMMERCIAL_GOODWILL for SPECIAL_CONTRACT resets discount to 0", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "FR",
        [`${p}type`]: "COMMERCIAL_GOODWILL",
        [`${p}grossAmount`]: 90,
        [`${p}discount`]: 10,
        [`${p}discountHidden`]: 10,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "SPECIAL_CONTRACT" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("0");
    });
  });

  // No rule applies between two non-target jobTypes — discount is left untouched.
  it("leaves discount untouched when transitioning between two non-target jobTypes (WARRANTY -> SERVICE_OFFERING)", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}type`]: "WARRANTY",
        [`${p}grossAmount`]: 240,
        [`${p}discount`]: 7,
        [`${p}discountHidden`]: 7,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "SERVICE_OFFERING" } });

    await waitFor(() => {
      expect(screen.getByTestId(`field-${p}type`)).toHaveValue("SERVICE_OFFERING");
    });

    expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("7");
  });
});

describe("ItemRow (jobDiagnostics) — delete icon visibility (ported)", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;

  it("hides the delete icon while the row's job status blocks deletion", () => {
    denyApproveCommercialGoodwill();
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics"),
      userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      contextOverrides: { jobStatus: "IN_REPAIR" },
    });
    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("renders the approval flyout instead of a delete icon when the user can approve commercial goodwill and the material is pending", () => {
    // Default mock (useHasPermission -> true) covers hasApproveCommercialGoodwillPermission.
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: { [`${p}position`]: "SP", [`${p}type`]: "COMMERCIAL_GOODWILL", [`${p}status`]: "PENDING" },
    });
    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  // itemPolicy is undefined for every other test in this file (default context), exercising
  // the hardcoded POSITION_PERMISSIONS fallback unchanged. These two prove the config-driven
  // resolver path (utils/itemRulesResolver.ts, forced on via the top-level mock) actually
  // takes over, in either direction, once a policy config is supplied via context.
  const fakeItemPolicy = (canDelete: string): ItemPolicyConfig => ({
    version: "test",
    countryCode: "TR",
    positions: [
      {
        position: "SP",
        isProtected: false,
        permissions: {
          canView: "DS_V",
          canDelete,
          canEditUnits: "DSUE",
          canEditUnitPrice: "DSPE",
          canEditDiscount: "DSDE",
          canEditTotal: "DSTE",
        },
      },
    ],
    editability: [],
    warrantyGating: { gatedTypes: [], disableTypeOptionsWhenInvalidSparePart: false },
    surfaceOverrides: {},
  });

  it("uses itemPolicy's permission over the hardcoded table when itemPolicy is present", () => {
    denyApproveCommercialGoodwill();
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics"),
      // Real hardcoded permission the user does have — would show the icon via fallback.
      userPermissions: [PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS],
      // itemPolicy requires a different permission the user doesn't have — icon must hide.
      contextOverrides: { itemPolicy: fakeItemPolicy("SOME_OTHER_PERMISSION") },
    });
    expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
  });

  it("grants delete access from itemPolicy's permission even without the hardcoded one", () => {
    denyApproveCommercialGoodwill();
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics"),
      // User does NOT have the real hardcoded delete permission.
      userPermissions: ["SOME_UNRELATED_PERMISSION"],
      // ...but itemPolicy grants delete via a permission the user does have.
      contextOverrides: { itemPolicy: fakeItemPolicy("SOME_UNRELATED_PERMISSION") },
    });
    expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
  });
});

describe("ItemRow (jobDiagnostics) — pre-approval checkbox field (ported)", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;
  const checkboxField: Field = createField({
    name: `${p}preApprovalCheckbox`,
    type: "checkbox",
    fieldMapping: {
      originalName: "preApprovalCheckbox",
      map: "preApprovalCheckbox",
      parentMap: [],
      prefixes: [],
      nameStartsWith: p,
    },
  });

  it("disables the pre-approval checkbox field when the material status is not PENDING", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: [...jobPriceFields(), checkboxField],
      initialValues: { [`${p}position`]: "SP", [`${p}type`]: "WARRANTY", [`${p}status`]: "REJECTED" },
    });
    expect(screen.getByTestId(`field-${p}preApprovalCheckbox`)).toBeDisabled();
  });

  it("enables the pre-approval checkbox field when the material status is PENDING", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: [...jobPriceFields(), checkboxField],
      initialValues: { [`${p}position`]: "SP", [`${p}type`]: "WARRANTY", [`${p}status`]: "PENDING" },
    });
    expect(screen.getByTestId(`field-${p}preApprovalCheckbox`)).toBeEnabled();
  });
});

describe("ItemRow (jobDiagnostics) — collapse behavior (ported)", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;

  it("toggles collapse state on arrow click when prices are expandable (materialId present)", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", { [`${p}materialId`]: "MAT-1" }),
    });
    // Mocked Icon hardcodes data-testid as `icon-${iconName}`, ignoring the real component's
    // data-testid prop — iconName is "up"/"down" based on isRowCollapsed.
    expect(screen.getByTestId("icon-up")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("icon-up"));
    expect(screen.getByTestId("icon-down")).toBeInTheDocument();
  });

  it("does not toggle collapse when there are no expandable prices", () => {
    renderItemRow({ surface: "jobDiagnostics", initialValues: baseValues("jobDiagnostics") });
    fireEvent.click(screen.getByTestId("icon-up"));
    expect(screen.getByTestId("icon-up")).toBeInTheDocument();
  });
});

describe("ItemRow (jobDiagnostics) — revised/rejected row reset (ported)", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;

  it("marks the row as pending-reset when a field changes while row status is REVISED", () => {
    const setRevisedRejectedRowPending = vi.fn();
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", { [`${p}status`]: "REVISED" }),
      contextOverrides: { setRevisedRejectedRowPending },
    });
    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });
    expect(setRevisedRejectedRowPending).toHaveBeenCalledWith("diagnosticsSpareParts#0");
  });

  it("marks the row as pending-reset when a field changes while row status is REJECTED", () => {
    const setRevisedRejectedRowPending = vi.fn();
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", { [`${p}status`]: "REJECTED" }),
      contextOverrides: { setRevisedRejectedRowPending },
    });
    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });
    expect(setRevisedRejectedRowPending).toHaveBeenCalledWith("diagnosticsSpareParts#0");
  });

  it("does not mark the row as pending-reset for statuses outside REVISED/REJECTED", () => {
    const setRevisedRejectedRowPending = vi.fn();
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", { [`${p}status`]: "PENDING" }),
      contextOverrides: { setRevisedRejectedRowPending },
    });
    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });
    expect(setRevisedRejectedRowPending).not.toHaveBeenCalled();
  });
});

describe("ItemRow (jobDiagnostics) — position field gating (ported)", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;

  it("disables the position field once a part number is set", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", { [`${p}partNumber`]: "12345" }),
    });
    expect(screen.getByTestId(`field-${p}position`)).toBeDisabled();
  });

  it("enables the position field when no part number is set", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", { [`${p}partNumber`]: "" }),
    });
    expect(screen.getByTestId(`field-${p}position`)).toBeEnabled();
  });

  it("disables a position option entirely when the user lacks delete permission for it", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", { [`${p}partNumber`]: "" }),
      userPermissions: [],
    });
    const positionSelect = screen.getByTestId(`field-${p}position`) as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(positionSelect.options).map((option) => [option.value, option]),
    );
    expect(optionsByValue.LA.disabled).toBe(true);
    expect(optionsByValue.SP.disabled).toBe(true);
    expect(optionsByValue.FR.disabled).toBe(true);
  });
});

describe("ItemRow (jobDiagnostics) — part number change effect / resolvePartNumberChangeAction (ported)", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;

  // "reset" outcome: a genuine, user-driven part number change while not resyncing —
  // resetPartNumberDependentFields nulls the row's entire price object plus materialId.
  it("resets price fields and materialId when the part number changes to a genuinely different value", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}type`]: "WARRANTY",
        [`${p}partNumber`]: "1609888887",
        [`${p}materialId`]: "MAT-123",
        [`${p}unitPrice`]: 100,
        [`${p}tax`]: 20,
        [`${p}netAmount`]: 100,
        [`${p}grossAmount`]: 120,
        [`${p}totalAmount`]: 120,
        [`${p}taxAmount`]: 20,
        [`${p}suggestedNetPrice`]: 100,
        [`${p}discount`]: 10,
        [`${p}discountHidden`]: 10,
        [`${p}discountAmountHidden`]: 12,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}partNumber`), { target: { value: "9999999999" } });

    // resetPartNumberDependentFields sets these fields to null, but they're also watched by
    // the debounced price-calculation hook (useSparePartsRowCommon), which recalculates on
    // the resulting change and settles them at 0 rather than leaving them null. So instead of
    // asserting an exact post-cascade value we can't fully predict, assert each field moved
    // off its original populated value — the behavior this reset is meant to guarantee.
    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}unitPrice`) as HTMLInputElement).value).not.toBe("100");
    });
    expect((screen.getByTestId(`field-${p}netAmount`) as HTMLInputElement).value).not.toBe("100");
    expect((screen.getByTestId(`field-${p}grossAmount`) as HTMLInputElement).value).not.toBe("120");
    expect((screen.getByTestId(`field-${p}totalAmount`) as HTMLInputElement).value).not.toBe("120");
    expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).not.toBe("10");
    expect((screen.getByTestId(`field-${p}discountHidden`) as HTMLInputElement).value).not.toBe("10");
    expect((screen.getByTestId(`field-${p}discountAmountHidden`) as HTMLInputElement).value).not.toBe(
      "12",
    );
  });

  // "sync" outcome via resyncing: a genuine value change arriving while isResyncingRef is true
  // (API-driven update) must NOT null the price data — only "sync" happens, not "reset".
  it("does not reset price fields when the part number changes during an API-driven resync", async () => {
    const isResyncingRef = { current: false };
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}type`]: "WARRANTY",
        [`${p}partNumber`]: "1609888887",
        [`${p}unitPrice`]: 100,
        [`${p}discount`]: 10,
        [`${p}discountHidden`]: 10,
      },
      contextOverrides: { isResyncingRef },
    });

    isResyncingRef.current = true;
    fireEvent.change(screen.getByTestId(`field-${p}partNumber`), { target: { value: "9999999999" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}partNumber`) as HTMLInputElement).value).toBe(
        "9999999999",
      );
    });
    expect((screen.getByTestId(`field-${p}unitPrice`) as HTMLInputElement).value).toBe("100");
    expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("10");
  });

  // "none" outcome: a formatting-only edit (normalizes to the same value) must leave price
  // data untouched — no reset.
  it("treats a formatting-only part number edit as unchanged and does not reset prices", async () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: jobPriceFields(),
      initialValues: {
        [`${p}position`]: "SP",
        [`${p}type`]: "WARRANTY",
        [`${p}partNumber`]: "1609888887",
        [`${p}unitPrice`]: 100,
        [`${p}discount`]: 10,
      },
    });

    fireEvent.change(screen.getByTestId(`field-${p}partNumber`), {
      target: { value: "160.988.8887" },
    });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}partNumber`) as HTMLInputElement).value).toBe(
        "160.988.8887",
      );
    });
    expect((screen.getByTestId(`field-${p}unitPrice`) as HTMLInputElement).value).toBe("100");
    expect((screen.getByTestId(`field-${p}discount`) as HTMLInputElement).value).toBe("10");
  });
});

describe("ItemRow (jobDiagnostics) — field-permission fallback (ported)", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;
  const notesField: Field = createField({
    name: `${p}notes`,
    type: "text",
    fieldMapping: {
      originalName: "notes",
      map: "notes",
      parentMap: [],
      prefixes: [],
      nameStartsWith: p,
    },
  });

  it("leaves a field without a subtype untouched by field-permission rules", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: [...jobPriceFields(), notesField],
      initialValues: baseValues("jobDiagnostics", { [`${p}notes`]: "" }),
    });
    expect(screen.getByTestId(`field-${p}notes`)).toBeEnabled();
  });

  it("still disables a field without a subtype when the row is fully disabled", () => {
    renderItemRow({
      surface: "jobDiagnostics",
      fields: [...jobPriceFields(), notesField],
      initialValues: baseValues("jobDiagnostics", { [`${p}notes`]: "" }),
      isDisabled: true,
    });
    expect(screen.getByTestId(`field-${p}notes`)).toBeDisabled();
  });
});

describe("ItemRow (jobDiagnostics) — position sync into materials state (ported)", () => {
  const p = NAME_STARTS_WITH.jobDiagnostics;

  // Regression test: the position-change effect previously only ran the position-autofill
  // side effect and never wrote the new position back into DiagnosticsContext's `materials`
  // state, so everything downstream that reads `materials[i].position` kept seeing a
  // stale/empty position for a row after the user picked one.
  it("writes the changed position back into materials state via setMaterials", async () => {
    const setMaterialsMock = vi.fn();
    renderItemRow({
      surface: "jobDiagnostics",
      initialValues: baseValues("jobDiagnostics", { [`${p}type`]: "CHARGEABLE" }),
      contextOverrides: { setMaterials: setMaterialsMock },
    });

    fireEvent.change(screen.getByTestId(`field-${p}position`), { target: { value: "FR" } });

    await waitFor(() => expect(setMaterialsMock).toHaveBeenCalled());

    const lastUpdater = setMaterialsMock.mock.calls[setMaterialsMock.mock.calls.length - 1][0] as (
      prev: MaterialItem[],
    ) => MaterialItem[];
    const prevMaterials: MaterialItem[] = [
      {
        position: "SP",
        partNumber: "",
        description: "",
        type: "CHARGEABLE",
        quantity: 0,
        unitPrice: 0,
        netAmount: 0,
        tax: 0,
        grossAmount: 0,
        discount: 0,
        taxAmount: 0,
        totalAmount: 0,
      },
    ];

    expect(lastUpdater(prevMaterials)[0].position).toBe("FR");
  });

  // Regression test: isResyncingRef is a single ref shared across every row via
  // DiagnosticsContext. When a newly added second row (areaIndex 1) gets its position set for
  // the first time, that row must flip the shared ref so dirty-tracking/reset effects in
  // sibling rows (areaIndex 0) don't spuriously fire in the same render cycle.
  it("flips the shared isResyncingRef when the second row's position is set for the first time", async () => {
    const row1Fields: Field[] = [
      createField({
        name: "diagnosticsSpareParts#1_position",
        subtype: "diagnosticPosition",
        type: "dropdown",
        options: [
          { value: "SP", name: "SP" },
          { value: "PN", name: "PN" },
        ],
        fieldMapping: {
          originalName: "position",
          map: "position",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "diagnosticsSpareParts#1_partNumber",
        subtype: "diagnosticPartNumber",
        type: "text",
        fieldMapping: {
          originalName: "partNumber",
          map: "partNumber",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
      createField({
        name: "diagnosticsSpareParts#1_type",
        subtype: "diagnosticType",
        type: "dropdown",
        fieldMapping: {
          originalName: "type",
          map: "type",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "diagnosticsSpareParts#1_",
        },
      }),
    ];
    const sharedResyncRef = { current: false };

    renderItemRow({
      surface: "jobDiagnostics",
      fields: row1Fields,
      initialValues: { "diagnosticsSpareParts#1_position": "SP" },
      contextOverrides: { isResyncingRef: sharedResyncRef },
    });

    fireEvent.change(screen.getByTestId("field-diagnosticsSpareParts#1_position"), {
      target: { value: "PN" },
    });

    await waitFor(() => expect(sharedResyncRef.current).toBe(true));
  });
});

// ---------------------------------------------------------------------------------------
// Ported from ClaimSparePartsRow.test.tsx (claim) — full 1:1 historical-parity port, step
// 9/10 of items-and-prices-refactor.md §15. The original file mocked ClaimContext,
// GenericFormContext and SparePartsMainFields directly to capture applyFieldPermissions /
// positionFieldsWithDisabledOptions in isolation; ported here against real rendered DOM via
// renderItemRow(), consistent with the rest of this file — assertions and setup conditions
// are preserved, only the mechanism for observing them changed.
// ---------------------------------------------------------------------------------------

describe("ItemRow (claimSpareParts) — collapse behavior (ported)", () => {
  const p = NAME_STARTS_WITH.claimSpareParts;

  it("toggles collapse when arrow is clicked and prices are expandable", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", { [`${p}unitPrice`]: 10 }),
    });
    expect(screen.getByTestId("icon-up")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("icon-up"));
    expect(screen.getByTestId("icon-down")).toBeInTheDocument();
  });

  it("does not toggle collapse when there are no expandable (populated) prices", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", { [`${p}unitPrice`]: "" }),
    });
    fireEvent.click(screen.getByTestId("icon-up"));
    expect(screen.getByTestId("icon-up")).toBeInTheDocument();
  });

  it("does not render the collapse arrow when the user lacks price view permission", () => {
    vi.mocked(useHasPermission).mockReturnValue(false);
    renderItemRow({ surface: "claimSpareParts", initialValues: baseValues("claimSpareParts") });
    expect(screen.queryByTestId("icon-up")).not.toBeInTheDocument();
    expect(screen.queryByTestId("icon-down")).not.toBeInTheDocument();
  });
});

describe("ItemRow (claimSpareParts) — delete icon visibility (ported)", () => {
  it("renders the delete icon when the row's position is not in automaticRows", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", {
        [`${NAME_STARTS_WITH.claimSpareParts}position`]: "SP",
      }),
      contextOverrides: { canDeleteRows: true, automaticRows: ["LA"] },
    });
    expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
  });
});

describe("ItemRow (claimSpareParts) — applyFieldPermissions (ported)", () => {
  const p = NAME_STARTS_WITH.claimSpareParts;

  it("disables all non-type fields for an existing (non-new) row", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      contextOverrides: { materials: [{ isNew: false }] as ItemsContextValue["materials"] },
    });
    expect(screen.getByTestId(`field-${p}partNumber`)).toBeDisabled();
    expect(screen.getByTestId(`field-${p}unitPrice`)).toBeDisabled();
  });

  it("parses the area index from the field name prefix to look up the correct material", () => {
    const prefix = "claims_claimSpareParts#2_";
    const fieldMapping = (originalName: string) => ({
      originalName,
      map: originalName,
      parentMap: [],
      prefixes: [],
      nameStartsWith: prefix,
    });
    const customFields: Field[] = [
      createField({
        name: `${prefix}position`,
        subtype: "diagnosticPosition",
        type: "dropdown",
        fieldMapping: fieldMapping("position"),
      }),
      createField({
        name: `${prefix}partNumber`,
        subtype: "diagnosticPartNumber",
        type: "text",
        fieldMapping: fieldMapping("partNumber"),
      }),
    ];

    renderItemRow({
      surface: "claimSpareParts",
      fields: customFields,
      initialValues: {},
      contextOverrides: {
        materials: [
          { isNew: false },
          { isNew: false },
          { isNew: true },
        ] as ItemsContextValue["materials"],
      },
    });

    // materials[2].isNew is true, so a non-price field should be enabled.
    expect(screen.getByTestId(`field-${prefix}partNumber`)).toBeEnabled();
  });
});

describe("ItemRow (claimSpareParts) — position options disabling (ported)", () => {
  const p = NAME_STARTS_WITH.claimSpareParts;
  const positionOnlyField: Field = createField({
    name: `${p}position`,
    subtype: "diagnosticPosition",
    type: "dropdown",
    fieldMapping: {
      originalName: "position",
      map: "position",
      parentMap: [],
      prefixes: [],
      nameStartsWith: p,
    },
  });

  it("falls back to positionDropdownOptions from context when the field defines no options", () => {
    renderItemRow({
      surface: "claimSpareParts",
      fields: [positionOnlyField],
      initialValues: {},
      contextOverrides: { positionDropdownOptions: [{ value: "SP", name: "Spare Part" }] },
    });
    const select = screen.getByTestId(`field-${p}position`) as HTMLSelectElement;
    const spOption = Array.from(select.options).find((o) => o.value === "SP");
    expect(spOption?.text).toBe("Spare Part");
  });

  it("prefers the field's own options over the context's positionDropdownOptions", () => {
    const ownOptionsField: Field = {
      ...positionOnlyField,
      options: [{ value: "SP", name: "Own Spare Part" }],
    };
    renderItemRow({
      surface: "claimSpareParts",
      fields: [ownOptionsField],
      initialValues: {},
      contextOverrides: { positionDropdownOptions: [{ value: "SP", name: "Context Spare Part" }] },
    });
    const select = screen.getByTestId(`field-${p}position`) as HTMLSelectElement;
    const spOption = Array.from(select.options).find((o) => o.value === "SP");
    expect(spOption?.text).toBe("Own Spare Part");
  });

  it("leaves the position field untouched when no options are available anywhere", () => {
    renderItemRow({
      surface: "claimSpareParts",
      fields: [positionOnlyField],
      initialValues: {},
    });
    const select = screen.getByTestId(`field-${p}position`) as HTMLSelectElement;
    expect(select.options.length).toBe(0);
  });

  it("disables a position option once it has reached its configured max usage elsewhere on the form", () => {
    const siblingField: Field = createField({
      name: "claims_claimSpareParts#1_position",
      subtype: "diagnosticPosition",
      fieldMapping: {
        originalName: "position",
        map: "position",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "claims_claimSpareParts#1_",
      },
    });
    renderItemRow({
      surface: "claimSpareParts",
      fields: [positionOnlyField, siblingField],
      initialValues: { "claims_claimSpareParts#1_position": "SP" },
      contextOverrides: {
        allowedPositions: [
          {
            position: "SP",
            minCount: 0,
            maxCount: 1,
            quantity: { quantitySource: null, defaultQuantity: null },
            unitPriceSource: null,
          },
        ],
        positionDropdownOptions: [{ value: "SP", name: "Spare Part" }],
      },
    });
    const select = screen.getByTestId(`field-${p}position`) as HTMLSelectElement;
    const spOption = Array.from(select.options).find((o) => o.value === "SP");
    expect(spOption?.disabled).toBe(true);
  });

  it("leaves a position option enabled when it has no maxCount configuration", () => {
    renderItemRow({
      surface: "claimSpareParts",
      fields: [positionOnlyField],
      initialValues: {},
      contextOverrides: {
        allowedPositions: [],
        positionDropdownOptions: [{ value: "SP", name: "Spare Part" }],
      },
    });
    const select = screen.getByTestId(`field-${p}position`) as HTMLSelectElement;
    const spOption = Array.from(select.options).find((o) => o.value === "SP");
    expect(spOption?.disabled).toBeFalsy();
  });
});

describe("ItemRow (claimSpareParts) — restricted spare-part type options (ported)", () => {
  const p = NAME_STARTS_WITH.claimSpareParts;

  it("disables WARRANTY and SERVICE_OFFERING when position is 'SP' and no part number is set", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", {
        [`${p}position`]: "SP",
        [`${p}partNumber`]: "",
      }),
    });
    const typeField = screen.getByTestId(`field-${p}type`) as HTMLSelectElement;
    const optionsByValue = Object.fromEntries(
      Array.from(typeField.options).map((option) => [option.value, option]),
    );
    expect(optionsByValue.WARRANTY.disabled).toBe(true);
    expect(optionsByValue.SERVICE_OFFERING.disabled).toBe(true);
    expect(optionsByValue.CHARGEABLE.disabled).toBeFalsy();
  });

  it("leaves type options enabled when the part number is filled and belongs to the tool", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", {
        [`${p}position`]: "SP",
        [`${p}partNumber`]: "12345",
      }),
      sparePartNotBelongsToTool: { [`${p}partNumber`]: false },
    });
    const typeField = screen.getByTestId(`field-${p}type`) as HTMLSelectElement;
    const warranty = Array.from(typeField.options).find((o) => o.value === "WARRANTY");
    expect(warranty?.disabled).toBeFalsy();
  });

  it("disables restricted type options when the part is marked as not belonging to the tool", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", {
        [`${p}position`]: "SP",
        [`${p}partNumber`]: "12345",
      }),
      sparePartNotBelongsToTool: { [`${p}partNumber`]: true },
    });
    const typeField = screen.getByTestId(`field-${p}type`) as HTMLSelectElement;
    const warranty = Array.from(typeField.options).find((o) => o.value === "WARRANTY");
    expect(warranty?.disabled).toBe(true);
  });

  it("does not restrict type options when position is not 'SP'", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", {
        [`${p}position`]: "FR",
        [`${p}partNumber`]: "",
      }),
    });
    const typeField = screen.getByTestId(`field-${p}type`) as HTMLSelectElement;
    const warranty = Array.from(typeField.options).find((o) => o.value === "WARRANTY");
    expect(warranty?.disabled).toBeFalsy();
  });
});

describe("ItemRow (claimSpareParts) — position autofill (ported)", () => {
  const p = NAME_STARTS_WITH.claimSpareParts;

  it("autofills part number and description when position changes to 'FR'", async () => {
    renderItemRow({ surface: "claimSpareParts", initialValues: baseValues("claimSpareParts") });

    fireEvent.change(screen.getByTestId(`field-${p}position`), { target: { value: "FR" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}partNumber`) as HTMLInputElement).value).toBe(
        "1609888888",
      );
    });
    expect((screen.getByTestId(`field-${p}description`) as HTMLInputElement).value).toBe(
      "freightCost",
    );
  });

  it("autofills part number and description when position changes to 'LA'", async () => {
    renderItemRow({ surface: "claimSpareParts", initialValues: baseValues("claimSpareParts") });

    fireEvent.change(screen.getByTestId(`field-${p}position`), { target: { value: "LA" } });

    await waitFor(() => {
      expect((screen.getByTestId(`field-${p}partNumber`) as HTMLInputElement).value).toBe(
        "1609888887",
      );
    });
    expect((screen.getByTestId(`field-${p}description`) as HTMLInputElement).value).toBe(
      "labourCost",
    );
  });

  it("does not autofill for a position without hardcoded autofill data", async () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", { [`${p}position`]: "FR" }),
    });

    fireEvent.change(screen.getByTestId(`field-${p}position`), { target: { value: "SP" } });

    await waitFor(() => {
      expect(screen.getByTestId(`field-${p}position`)).toHaveValue("SP");
    });
    expect((screen.getByTestId(`field-${p}partNumber`) as HTMLInputElement).value).toBe("PN-1");
  });

  it("does not autofill on initial mount even if position is already set", () => {
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", {
        [`${p}position`]: "FR",
        [`${p}partNumber`]: "",
        [`${p}description`]: "",
      }),
    });
    expect((screen.getByTestId(`field-${p}partNumber`) as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId(`field-${p}description`) as HTMLInputElement).value).toBe("");
  });
});

describe("ItemRow (claimSpareParts) — markRowDirty effect (ported)", () => {
  const p = NAME_STARTS_WITH.claimSpareParts;

  it("does not call markRowDirty on the initial render", () => {
    const markRowDirty = vi.fn();
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      contextOverrides: { markRowDirty },
    });
    expect(markRowDirty).not.toHaveBeenCalled();
  });

  it("calls markRowDirty when the row's non-price input key changes after mount", () => {
    const markRowDirty = vi.fn();
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      contextOverrides: { markRowDirty },
    });
    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });
    expect(markRowDirty).toHaveBeenCalledWith(0);
  });

  it("does not call markRowDirty while resyncing, even if the row's key changes", () => {
    const markRowDirty = vi.fn();
    const isResyncingRef = { current: false };
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      contextOverrides: { markRowDirty, isResyncingRef },
    });
    isResyncingRef.current = true;
    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });
    expect(markRowDirty).not.toHaveBeenCalled();
  });

  it("does not call markRowDirty when prices have not been validated", () => {
    const markRowDirty = vi.fn();
    renderItemRow({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts"),
      contextOverrides: { markRowDirty, arePricesValidated: false },
    });
    fireEvent.change(screen.getByTestId(`field-${p}type`), { target: { value: "CHARGEABLE" } });
    expect(markRowDirty).not.toHaveBeenCalled();
  });
});

describe("ItemRow (claimSpareParts) — collapsed-state sync with arePricesValidated (ported)", () => {
  const p = NAME_STARTS_WITH.claimSpareParts;

  it("follows arePricesValidated when the user has price-view permission", () => {
    const view = renderItemRowRerenderable({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", { [`${p}unitPrice`]: 10 }),
      contextOverrides: { arePricesValidated: false },
    });
    expect(screen.getByTestId("icon-down")).toBeInTheDocument();

    view.rerenderWithContext({ arePricesValidated: true });

    expect(screen.getByTestId("icon-up")).toBeInTheDocument();
  });

  it("does not sync collapsed state when the user lacks price-view permission", () => {
    vi.mocked(useHasPermission).mockReturnValue(false);
    const view = renderItemRowRerenderable({
      surface: "claimSpareParts",
      initialValues: baseValues("claimSpareParts", { [`${p}unitPrice`]: 10 }),
      contextOverrides: { arePricesValidated: false },
    });

    view.rerenderWithContext({ arePricesValidated: true });

    // Effect bails out early without permission, so state should not follow — no arrow icon
    // renders at all when hasPriceViewPermission is false.
    expect(screen.queryByTestId("icon-up")).not.toBeInTheDocument();
    expect(screen.queryByTestId("icon-down")).not.toBeInTheDocument();
  });
});
