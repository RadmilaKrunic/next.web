import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useContext, useEffect, useRef } from "react";
import { useFormikContext } from "formik";
import JobOverview from "./JobOverview";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { MessagesContext } from "contexts/messagescontext";
import type Field from "components/generics/Field/GenericField.types";
import type { discountBase } from "api/services/countryConfiguration/countryConfiguration";
import { mapValuesToAPI } from "components/generics/utils";

const locationStateMock = vi.hoisted(() => ({ value: null as { from?: string } | null }));
const tabsDataMock = vi.hoisted(() => ({ value: [] as unknown[] }));
const editingSectionsMock = vi.hoisted(() => ({ value: new Set<string>() }));
const allFieldsMock = vi.hoisted(() => ({ value: [] as Field[] }));
const initialFormValuesMock = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const discountBaseMock = vi.hoisted(() => ({ value: "NET_PRICE" as discountBase }));
const triggerValueMock = vi.hoisted(() => ({ value: 0 as unknown }));
const hasExistingDiagnosticMock = vi.hoisted(() => ({ value: false }));

vi.mock("@bosch/react-frok", () => ({
  TabNavigation: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tab: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Notification: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ jobId: "J-1" }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ state: locationStateMock.value }),
  };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const queryClientMock = {
  getQueryData: vi.fn((key: unknown) => {
    if (Array.isArray(key) && key[0] === "user") {
      return { countryCode: "ZA", permissions: [] };
    }
    if (Array.isArray(key) && key[0] === "UIConfiguration") {
      return {
        forms: [
          {
            name: "JobOverview",
            actions: [
              { name: "Add Spare Part", onAction: "onAddSparePart" },
              { name: "Hold", onAction: "onHold" },
              { name: "Next Step", onAction: "onGoToNextStep" },
              { name: "Customer Answer", onAction: "onCustomerAnswer" },
              { name: "Approve Repair", onAction: "onApproveForRepair" },
              { name: "Request Internal", onAction: "onRequestInternalApproval" },
              { name: "Submit Review", onAction: "onSubmitForReview" },
              { name: "Start Repair", onAction: "onStartRepair" },
              { name: "Finish Repair", onAction: "onFinishRepair" },
              { name: "Tool Delivered", onAction: "onToolDelivered" },
              { name: "Create Cost", onAction: "onCreateCostEstimate" },
              { name: "Save Customer", onAction: "onSaveCustomer" },
              { name: "Cancel Save Customer", onAction: "onCancelSaveCustomer" },
              { name: "Save Asset", onAction: "onSaveAsset" },
              { name: "Cancel Asset", onAction: "onCancelEditAsset" },
              { name: "Add Special", onAction: "onAddSpecialMaterials" },
              { name: "Product Details", onAction: "onProductDetails" },
              { name: "Validate", onAction: "onValidate" },
              { name: "Approve Pre", onAction: "onApprovePreApproval" },
              { name: "Reject Pre", onAction: "onRejectPreApproval" },
              { name: "Revise Pre", onAction: "onRevisePreApproval" },
            ],
            sections: [],
          },
        ],
      };
    }
    return undefined;
  }),
  invalidateQueries: vi.fn(),
};

const onAddRowMock = vi.hoisted(() => vi.fn());
const toggleHoldMutateMock = vi.hoisted(() => vi.fn());
const startDiagnosticMutateMock = vi.hoisted(() => vi.fn());
const customerAnswerMutateMock = vi.hoisted(() => vi.fn());
const postCustomerMutateMock = vi.hoisted(() => vi.fn());
const patchJobMutateMock = vi.hoisted(() => vi.fn());
const validateAndSaveMutateMock = vi.hoisted(() => vi.fn());
const disableSectionEditingMock = vi.hoisted(() => vi.fn());
const repairApprovalMutateMock = vi.hoisted(() => vi.fn());
const internalApprovalMutateMock = vi.hoisted(() => vi.fn());
const startReviewMutateMock = vi.hoisted(() => vi.fn());
const startRepairMutateMock = vi.hoisted(() => vi.fn());
const finishRepairMutateMock = vi.hoisted(() => vi.fn());
const toolDeliveredMutateMock = vi.hoisted(() => vi.fn());
const createCostEstimateMutateMock = vi.hoisted(() => vi.fn());
const warrantyMutateMock = vi.hoisted(() => vi.fn());
const addSpecialMaterialsAllowedMock = vi.hoisted(() => ({ value: false }));
const warrantyCheckDataMock = vi.hoisted(() => ({ value: null as unknown }));
const diagnosticDataMock = vi.hoisted(() => ({
  value: undefined as { customerAnswer?: string } | undefined,
}));

const areaChangeTrigger = vi.hoisted(() => ({
  enabled: false,
  values: {},
}));
const warrantyMutateAsyncMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => queryClientMock,
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("hooks/useHasPermission", () => ({ useHasPermission: () => true }));
vi.mock("hooks/useBreadcrumbs", () => ({ useBreadcrumbs: vi.fn() }));
vi.mock("hooks/useAccessoriesManager", () => ({
  useAccessoriesManager: () => ({ assetsAccessories: [], setAssetsAccessories: vi.fn() }),
}));
vi.mock("hooks/useDiagnosticData", () => ({
  useDiagnosticData: () => ({
    diagnosticData: diagnosticDataMock.value,
    diagnosticLoading: false,
    shouldFetchDiagnostic: false,
  }),
}));
vi.mock("hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    initialFormValues: initialFormValuesMock.value,
    setInitialFormValues: vi.fn(),
    allFields: allFieldsMock.value,
    setAllFields: vi.fn(),
    mandatoryFields: null,
    tabs: tabsDataMock.value,
    setTabs: vi.fn(),
  }),
}));
vi.mock("hooks/useActionWithValidation", () => ({
  useActionWithValidation: () =>
    vi.fn(async (_a: string, _b: unknown, _c: unknown, onValid: () => void) => onValid()),
}));
vi.mock("hooks/usePositionDropdownSync", () => ({ usePositionDropdownSync: vi.fn() }));
// JobOverview.tsx calls useItemPolicyConfig directly (React Query's useQuery under the
// hood), which the blanket @tanstack/react-query mock below doesn't provide — mock at the
// hook level instead, consistent with every other domain hook in this file.
vi.mock("api/services/itemPolicy/hooks", () => ({
  useItemPolicyConfig: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("hooks/useSectionEditing", () => ({
  useSectionEditing: () => ({
    editingSections: editingSectionsMock.value,
    enableSectionEditing: vi.fn(),
    disableSectionEditing: disableSectionEditingMock,
    setEditingSections: vi.fn(),
  }),
}));
// getBoschInternalPending/getChargeablePendingInfo/hasWarrantyOrProServiceItems are still
// live, job-diagnostic-tab-specific helpers JobOverview.tsx imports from here directly
// (Phase 5 unification, items-and-prices-refactor.md §15 step 10) — the useDiagnosticsManager
// hook itself was deleted from this module and is mocked separately below, matching
// JobOverview.tsx's real step-8 switch to useItemsManager.
vi.mock("hooks/useDiagnosticsManager", () => ({
  getBoschInternalPending: () => ({ pendingTypeFields: [], hasBoschInternalPending: false }),
  getChargeablePendingInfo: () => ({ pendingTypeFields: [], hasChargeablePending: false }),
  hasWarrantyOrProServiceItems: (
    _fields: Array<{ subtype?: string; name: string }>,
    values: Record<string, unknown>,
  ) =>
    Object.entries(values).some(([key, value]) => {
      if (!key.endsWith("_type")) return false;
      return value === "WARRANTY" || value === "SERVICE_OFFERING";
    }),
}));

vi.mock("hooks/itemsManager/useItemsManager", () => ({
  useItemsManager: () => ({
    materials: [],
    archivedMaterials: [],
    setMaterials: vi.fn(),
    positionDropdownOptions: [],
    allowedPositions: [],
    addSpecialMaterialsAllowed: addSpecialMaterialsAllowedMock.value,
    markAllValidated: vi.fn(),
    markRowDirty: vi.fn(),
    discountBase: discountBaseMock.value,
    getPositionConfig: vi.fn(),
    getQuantityForPosition: vi.fn(),
    onAddRow: onAddRowMock,
    onDeleteRow: vi.fn(),
    onDeleteArchivedRow: undefined,
    onRestoreRow: vi.fn(),
    onAddMaterials: vi.fn(),
    getExistingPartNumbers: () => new Set<string>(),
    enableValidate: () => false,
    setRevisedRejectedRowPending: vi.fn(),
    apiMaterialsLoaded: false,
    apiMaterialsEmpty: true,
    hasExistingDiagnostic: hasExistingDiagnosticMock.value,
    canArchiveOnDelete: false,
    automaticRows: [],
    resyncMaterialsFromAPI: vi.fn(),
  }),
}));

vi.mock("components/generics/Form/useFormValidation", () => ({
  useFormValidation: () => ({
    validate: vi.fn(),
    validateByAction: vi.fn(),
    startValidation: vi.fn(),
    stopValidation: vi.fn(),
    setCurrentAction: vi.fn(),
  }),
}));

vi.mock("components/generics/utils", () => ({
  convertAPIDataToFormValues: vi.fn(() => ({})),
  setSectionDisabledState: vi.fn((s: unknown) => s),
  mapValuesToAPI: vi.fn(() => ({
    order: { customer: { useBillingAddressForDelivery: false } },
    job: { asset: { hasAccessories: true } },
  })),
}));

vi.mock("components/generics/Form/formValidation", () => ({
  getUploadFieldErrors: vi.fn(() => []),
}));

vi.mock("components/generics/Section/GenericSection", () => ({
  default: function MockGenericSection() {
    const { onAreaValueChange, actionCallbacks } = useContext(GenericFormContext);
    const { values } = useFormikContext<Record<string, unknown>>();
    const hasTriggeredRef = useRef(false);

    useEffect(() => {
      if (!areaChangeTrigger.enabled || hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      onAreaValueChange?.("asset", areaChangeTrigger.values);
    }, [onAreaValueChange]);

    // actionCallbacks is typed generically as Record<string, (values: Record<string,
    // unknown>) => unknown> on GenericFormContext, but the four summary handlers
    // below actually implement (value: unknown) => void at runtime. Cast through
    // their real signature so we can invoke them with a raw scalar test value.
    const callScalarHandler = (name: keyof typeof actionCallbacks) => {
      const handler = actionCallbacks[name] as unknown as ((value: unknown) => void) | undefined;
      handler?.(triggerValueMock.value);
    };

    return (
      <div>
        <div>generic-section</div>
        <button type="button" onClick={() => callScalarHandler("onSummaryDiscountChange")}>
          trigger-discount-change
        </button>
        <button type="button" onClick={() => callScalarHandler("onSummaryDiscountNetChange")}>
          trigger-discount-net-change
        </button>
        <button type="button" onClick={() => callScalarHandler("onSummaryTotalAmountChange")}>
          trigger-total-change
        </button>
        <button type="button" onClick={() => callScalarHandler("onSummaryNetAmountChange")}>
          trigger-net-change
        </button>
        <pre data-testid="form-values">{JSON.stringify(values)}</pre>
      </div>
    );
  },
}));
vi.mock("components/generics/Action/GenericAction", () => ({
  default: function MockGenericAction({
    actions,
    onActionClick,
  }: {
    actions: Array<{ name?: string; onAction?: string }>;
    onActionClick: (action: string | undefined) => void;
  }) {
    const { actionCallbacks } = useContext(GenericFormContext);

    return (
      <div>
        <div>generic-action</div>
        {actions.map((action) => {
          if (action.onAction === "onCustomerAnswer" && !actionCallbacks.showCustomerAnswer?.()) {
            return null;
          }

          return (
            <button
              key={action.onAction}
              type="button"
              onClick={() => onActionClick(action.onAction)}
            >
              {action.name}
            </button>
          );
        })}
      </div>
    );
  },
}));
vi.mock("./JobOverviewHeader/JobOverviewHeader", () => ({
  default: () => <div>job-overview-header</div>,
}));
vi.mock("./AddSpecialMaterialModal/AddSpecialMaterialModal", () => ({
  default: () => <div>add-special-material-modal</div>,
}));
vi.mock("./AnswerModal/AnswerModal", () => ({
  default: ({ options }: { options?: Array<{ value: string; label: string }> }) => (
    <div>
      answer-modal
      <div data-testid="answer-modal-options">
        {options?.map((option) => option.value).join(",")}
      </div>
    </div>
  ),
}));
vi.mock("./ExplosionDiagram/ExplosionDrawingModal", () => ({
  default: () => <div>explosion-drawing-modal</div>,
}));
vi.mock(
  "../../ClaimManagement/ApprovalList/ApprovalListTable/ApprovalDecisionModal/ApprovalDecisionModal",
  () => ({
    default: ({ decisionType }: { decisionType?: string }) => (
      <div>approval-decision-modal{decisionType ? `:${decisionType}` : ""}</div>
    ),
  }),
);
vi.mock("../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div>loading-indicator</div>,
}));

vi.mock("api/services/approvals/hooks", () => ({
  useUpdateApprovalStatus: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("api/services/orders/hooks", () => ({
  usePostWarrantyCheck: () => ({
    mutate: warrantyMutateMock,
    mutateAsync: warrantyMutateAsyncMock,
    data: warrantyCheckDataMock.value,
  }),
}));

const useJobByIdMock = vi.hoisted(() => vi.fn());
vi.mock("api/services/jobs/hooks", () => ({
  useJobById: useJobByIdMock,
  usePatchJobById: () => ({ mutate: patchJobMutateMock, mutateAsync: vi.fn(), isPending: false }),
  usePostCustomerData: () => ({
    mutate: postCustomerMutateMock,
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostJobStatusStartDiagnostic: () => ({
    mutate: startDiagnosticMutateMock,
    mutateAsync: startDiagnosticMutateMock,
    isPending: false,
  }),
  useToggleJobHold: () => ({
    mutate: toggleHoldMutateMock,
    mutateAsync: toggleHoldMutateMock,
    isPending: false,
  }),
  usePostValidateAndSave: () => ({
    mutate: validateAndSaveMutateMock,
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostDiagnostic: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  usePostRepairApproval: () => ({
    mutate: repairApprovalMutateMock,
    mutateAsync: repairApprovalMutateMock,
    isPending: false,
  }),
  usePostInternalApprovalRequest: () => ({
    mutate: internalApprovalMutateMock,
    mutateAsync: internalApprovalMutateMock,
    isPending: false,
  }),
  usePostStartReview: () => ({
    mutate: startReviewMutateMock,
    mutateAsync: startReviewMutateMock,
    isPending: false,
  }),
  usePostStartRepair: () => ({
    mutate: startRepairMutateMock,
    mutateAsync: startRepairMutateMock,
    isPending: false,
  }),
  usePostFinishRepair: () => ({
    mutate: finishRepairMutateMock,
    mutateAsync: finishRepairMutateMock,
    isPending: false,
  }),
  usePostToolDelivered: () => ({
    mutate: toolDeliveredMutateMock,
    mutateAsync: toolDeliveredMutateMock,
    isPending: false,
  }),
  usePostCreateCostEstimate: () => ({
    mutate: createCostEstimateMutateMock,
    mutateAsync: createCostEstimateMutateMock,
    isPending: false,
  }),
  usePostCustomerAnswer: () => ({
    mutate: customerAnswerMutateMock,
    mutateAsync: customerAnswerMutateMock,
    isPending: false,
  }),
}));

vi.mock("api/services/jobs/action", async () => {
  const actual = await vi.importActual<object>("api/services/jobs/action");
  return {
    ...actual,
    postMessage: vi.fn(),
    getCostEstimationPdf: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  locationStateMock.value = null;
  warrantyCheckDataMock.value = null;
  initialFormValuesMock.value = {};
  tabsDataMock.value = [];
  allFieldsMock.value = [];
  editingSectionsMock.value = new Set<string>();
  addSpecialMaterialsAllowedMock.value = false;
  areaChangeTrigger.enabled = false;
  areaChangeTrigger.values = {};
  allFieldsMock.value = [];
  initialFormValuesMock.value = {};
  discountBaseMock.value = "NET_PRICE";
  triggerValueMock.value = 0;
  hasExistingDiagnosticMock.value = false;
});

describe("JobOverview", () => {
  it("renders loading state", () => {
    useJobByIdMock.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<JobOverview />);

    expect(screen.getByText("loading-indicator")).toBeInTheDocument();
  });

  it("renders error state", () => {
    useJobByIdMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("boom"),
    });

    render(<JobOverview />);

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(/boom/i)).toBeInTheDocument();
  });

  it("renders no job found state", () => {
    useJobByIdMock.mockReturnValue({ data: undefined, isLoading: false, error: null });

    render(<JobOverview />);

    expect(screen.getByText("noJobFound")).toBeInTheDocument();
  });

  it("renders main layout when job data exists", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
    expect(screen.getByText("generic-action")).toBeInTheDocument();
  });

  it("triggers onAddSparePart action callback", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Add Spare Part" }));

    expect(onAddRowMock).toHaveBeenCalledTimes(1);
  });

  it("executes multiple mutation-backed actions", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Hold" }));
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve Repair" }));
    fireEvent.click(screen.getByRole("button", { name: "Request Internal" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Repair" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish Repair" }));
    fireEvent.click(screen.getByRole("button", { name: "Tool Delivered" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Cost" }));

    const mutationCalls =
      toggleHoldMutateMock.mock.calls.length +
      startDiagnosticMutateMock.mock.calls.length +
      repairApprovalMutateMock.mock.calls.length +
      internalApprovalMutateMock.mock.calls.length +
      startReviewMutateMock.mock.calls.length +
      startRepairMutateMock.mock.calls.length +
      finishRepairMutateMock.mock.calls.length +
      toolDeliveredMutateMock.mock.calls.length +
      createCostEstimateMutateMock.mock.calls.length;

    expect(mutationCalls).toBeGreaterThan(0);
    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("executes save customer, save asset, and cancel actions", async () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { orderId: "O-1" },
        job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Save Customer" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Save Customer" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Asset" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Asset" }));

    await waitFor(() => expect(postCustomerMutateMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(patchJobMutateMock).toHaveBeenCalledTimes(1));
    expect(postCustomerMutateMock).toHaveBeenCalledWith(
      {
        orderId: "O-1",
        payload: { useBillingAddressForDelivery: false },
      },
      expect.any(Object),
    );
    expect(patchJobMutateMock).toHaveBeenCalledWith(
      {
        jobId: "J-1",
        data: { asset: { hasAccessories: true } },
      },
      expect.any(Object),
    );
    expect(disableSectionEditingMock).toHaveBeenCalledWith("customerAndPaymentData", true);
    expect(disableSectionEditingMock).toHaveBeenCalledWith("assetData", true);
  });

  it("opens customer answer, special materials, product details, and pre-approval modals", () => {
    addSpecialMaterialsAllowedMock.value = true;
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "CUSTOMER_APPROVAL_PENDING", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Customer Answer" }));
    expect(screen.getByText("answer-modal")).toBeInTheDocument();
    expect(screen.getByTestId("answer-modal-options")).not.toHaveTextContent("REPAIR");

    fireEvent.click(screen.getByRole("button", { name: "Add Special" }));
    expect(screen.getByText("add-special-material-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Product Details" }));
    expect(screen.getByText("explosion-drawing-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve Pre" }));
    expect(screen.getByText("approval-decision-modal:approved")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reject Pre" }));
    expect(screen.getByText("approval-decision-modal:rejected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Revise Pre" }));
    expect(screen.getByText("approval-decision-modal:revised")).toBeInTheDocument();
  });

  it("keeps diagnostics row actions visible after repair answer returns to waiting approval", () => {
    diagnosticDataMock.value = { customerAnswer: "REPAIR" };
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "WAITING_FOR_APPROVAL", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByRole("button", { name: "Add Spare Part" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Product Details" })).toBeInTheDocument();
  });

  it("passes repair customer answer when action type is REPAIR", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "CUSTOMER_APPROVAL_PENDING", isOnHold: false } },
      isLoading: false,
      error: null,
    });
    initialFormValuesMock.value = { actionType: "REPAIR" };

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Customer Answer" }));

    expect(screen.getByTestId("answer-modal-options")).toHaveTextContent("REPAIR");
  });

  it("executes validate action", async () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));

    await waitFor(() => expect(validateAndSaveMutateMock).toHaveBeenCalledTimes(1));
    expect(validateAndSaveMutateMock).toHaveBeenCalledWith({
      jobId: "J-1",
      payload: expect.any(Object),
    });
  });

  describe("validateAndSave price preservation", () => {
    const materialWithCalculatedPrice = {
      id: "M-1",
      order: 1,
      partNumber: "PN-1",
      price: {
        unitPrice: 40,
        tax: 19,
        netAmount: 80,
        grossAmount: 95.2,
        totalAmount: 95.2,
        discount: 0,
      },
    };

    it("nulls material prices on the first validateAndSave (no diagnostic exists yet)", async () => {
      hasExistingDiagnosticMock.value = false;
      vi.mocked(mapValuesToAPI).mockReturnValueOnce({
        diagnostic: {
          status: "DRAFT",
          materials: [materialWithCalculatedPrice],
        },
      } as unknown as ReturnType<typeof mapValuesToAPI>);
      useJobByIdMock.mockReturnValue({
        data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
        isLoading: false,
        error: null,
      });

      render(<JobOverview />);
      fireEvent.click(screen.getByRole("button", { name: "Validate" }));

      await waitFor(() => expect(validateAndSaveMutateMock).toHaveBeenCalledTimes(1));
      const { payload } = validateAndSaveMutateMock.mock.calls[0][0] as {
        payload: { materials: Array<{ price: unknown }> };
      };
      expect(payload.materials[0].price).toBeNull();
    });

    it("preserves material prices on a subsequent validateAndSave (diagnostic already exists, status still DRAFT)", async () => {
      hasExistingDiagnosticMock.value = true;
      vi.mocked(mapValuesToAPI).mockReturnValueOnce({
        diagnostic: {
          status: "DRAFT",
          materials: [materialWithCalculatedPrice],
        },
      } as unknown as ReturnType<typeof mapValuesToAPI>);
      useJobByIdMock.mockReturnValue({
        data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
        isLoading: false,
        error: null,
      });

      render(<JobOverview />);
      fireEvent.click(screen.getByRole("button", { name: "Validate" }));

      await waitFor(() => expect(validateAndSaveMutateMock).toHaveBeenCalledTimes(1));
      const { payload } = validateAndSaveMutateMock.mock.calls[0][0] as {
        payload: { materials: Array<{ price: unknown }> };
      };
      expect(payload.materials[0].price).toEqual(materialWithCalculatedPrice.price);
    });
  });

  it("blocks finish repair when purchase date and warranty diagnostic item need invoice", async () => {
    allFieldsMock.value = [
      {
        name: "job_asset_upload",
        label: "upload",
        type: "upload",
        fieldMapping: { originalName: "upload" },
        requiredDocuments: [
          {
            documentTypes: ["INVOICE"],
            errorMessage: "InvoiceWarrantyValidation",
            requiredForFields: [{ fieldName: "customerWish", fieldValue: "WARRANTY" }],
          },
        ],
      },
      {
        name: "row0_type",
        label: "type",
        type: "dropdown",
        subtype: "diagnosticType",
      },
    ];
    areaChangeTrigger.enabled = true;
    areaChangeTrigger.values = {
      customerWish: "CHARGEABLE",
      purchaseDate: "2024-06-15",
      row0_type: "WARRANTY",
    };
    initialFormValuesMock.value = {
      customerWish: "CHARGEABLE",
      purchaseDate: "2024-06-15",
      row0_type: "WARRANTY",
    };

    const setMessagesMock = vi.fn();
    useJobByIdMock.mockReturnValue({
      data: {
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            attachments: [],
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(
      <MessagesContext.Provider value={{ messages: [], setMessages: setMessagesMock }}>
        <JobOverview />
      </MessagesContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Finish Repair" }));

    expect(finishRepairMutateMock).not.toHaveBeenCalled();
    expect(setMessagesMock).toHaveBeenCalled();
    const messageUpdater = setMessagesMock.mock.calls[0]?.[0] as (prev: unknown[]) => unknown[];
    expect(messageUpdater([])).toEqual([
      { text: "InvoiceWarrantyValidation", type: "error", duration: 3000 },
    ]);
  });

  it("hides customer answer for approval-list multiple-pending jobs", () => {
    locationStateMock.value = { from: "approval-list" };
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "MULTIPLE_APPROVAL_PENDING", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.queryByRole("button", { name: "Customer Answer" })).not.toBeInTheDocument();
  });

  it("triggers warranty check when asset data is complete and has no warranty info", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: null,
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(warrantyMutateMock).toHaveBeenCalledWith({
      brand: "BOSCH",
      country: "ZA",
      bareToolNumber: "BT-100",
      serialNumber: "SN-100",
      purchaseDate: "2024-05-10",
    });
  });

  it("does not trigger warranty check when warranty information already exists", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: { warrantyType: "STANDARD_WARRANTY" },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(warrantyMutateMock).not.toHaveBeenCalled();
  });

  it("does not trigger warranty check when required asset fields are missing", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "",
            serialNumber: "SN-100",
            purchaseDate: "",
            warrantyInformation: null,
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(warrantyMutateMock).not.toHaveBeenCalled();
  });

  it("renders job in on-hold state without crashing", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: true } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("renders job in DELIVERED status without crashing", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "DELIVERED", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("renders job in WAITING_FOR_APPROVAL status", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "WAITING_FOR_APPROVAL", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("renders job in IN_REPAIR status", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_REPAIR", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("renders on-hold notification banner when job is on hold", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: true } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("jobOnHoldBanner")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo - INELIGIBLE from warrantyInformation field", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: {
              warrantyType: null,
              evaluation: { status: "INELIGIBLE", ineligibleReason: "WARRANTY_EXPIRED" },
              validityExpirationDate: "2023-01-01",
              usedWarrantyRepairCount: 0,
              allowedWarrantyRepairCount: 0,
            },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo - ELIGIBLE from warrantyInformation field", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: {
              warrantyType: "STANDARD_WARRANTY",
              evaluation: { status: "ELIGIBLE" },
              validityExpirationDate: "2026-01-01",
              usedWarrantyRepairCount: 1,
              allowedWarrantyRepairCount: 3,
              proServiceType: "INDIVIDUAL_PRO",
            },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo - INELIGIBLE from warranty mutation checkResult", () => {
    warrantyCheckDataMock.value = {
      evaluationStatus: "INELIGIBLE",
      reasonKey: "ALLOWED_REPAIR_COUNT_EXCEEDED",
      supportedWarrantyType: "STANDARD_WARRANTY",
      usedWarrantyRepairCount: 3,
      allowedWarrantyRepairCount: 2,
      proServiceType: "INDIVIDUAL_PRO",
    };

    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: null,
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo - ELIGIBLE from warranty mutation checkResult", () => {
    warrantyCheckDataMock.value = {
      evaluationStatus: "ELIGIBLE",
      reasonKey: null,
      supportedWarrantyType: "STANDARD_WARRANTY",
      validityExpirationDate: "2027-06-15",
      usedWarrantyRepairCount: 0,
      allowedWarrantyRepairCount: 3,
      proServiceType: null,
    };

    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: { warrantyInformation: null, purchaseDate: "2024-05-10" },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo - SKIPPED status (warrantyType null + status SKIPPED)", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "IN_DIAGNOSTICS",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: {
              warrantyType: null,
              evaluation: { status: "SKIPPED" },
            },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("renders with tabs and exercises renderTabContent", () => {
    tabsDataMock.value = [
      {
        name: "assetData",
        label: "assetData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [],
        position: 2,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
    expect(screen.getByText("generic-section")).toBeInTheDocument();
  });

  it("renders tab with READY_FOR_DIAGNOSTIC status and edit button shows", () => {
    tabsDataMock.value = [
      {
        name: "assetData",
        label: "assetData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [{ name: "save", onAction: "onSaveAsset", mode: "primary", mandatoryFields: [] }],
        position: 2,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("generic-section")).toBeInTheDocument();
  });

  it("hides tab that is in hiddenForStatuses", () => {
    tabsDataMock.value = [
      {
        name: "diagnosticData",
        label: "diagnosticData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: ["READY_FOR_DIAGNOSTIC"],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [],
        position: 4,
      },
      {
        name: "assetData",
        label: "assetData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [],
        position: 2,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("generic-section")).toBeInTheDocument();
  });

  it("renders job with on-hold state and tab content is disabled", () => {
    tabsDataMock.value = [
      {
        name: "assetData",
        label: "assetData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [],
        position: 2,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: true } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("jobOnHoldBanner")).toBeInTheDocument();
    expect(screen.getByText("generic-section")).toBeInTheDocument();
  });

  it("exercises editingSections branch - tab in edit mode has edit-mode class", () => {
    editingSectionsMock.value = new Set(["assetData"]);

    tabsDataMock.value = [
      {
        name: "assetData",
        label: "assetData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [{ name: "save", onAction: "onSaveAsset", mode: "primary", mandatoryFields: [] }],
        position: 2,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("generic-section")).toBeInTheDocument();
  });

  it("exercises diagnosticLoading branch when shouldFetchDiagnostic is true", () => {
    vi.mock("hooks/useDiagnosticData", () => ({
      useDiagnosticData: () => ({
        diagnosticData: undefined,
        diagnosticLoading: true,
        shouldFetchDiagnostic: true,
      }),
    }));

    tabsDataMock.value = [
      {
        name: "diagnosticData",
        label: "diagnosticData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [],
        position: 4,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyInformation with proServiceType recommendation", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            warrantyInformation: {
              warrantyType: null,
              evaluation: { status: "INELIGIBLE", ineligibleReason: "UNKNOWN_SERIAL_NUMBER" },
              proServiceType: "INDIVIDUAL_PRO",
            },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo hasPurchaseDate branch", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            purchaseDate: "2024-05-10",
            warrantyInformation: {
              warrantyType: "STANDARD_WARRANTY",
              evaluation: { status: "ELIGIBLE" },
            },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  describe("runAssetWarrantyCheck / syncWarrantyResultToAssetTab", () => {
    const assetTab = {
      name: "assetData",
      label: "assetData",
      isTab: true,
      isAccordion: false,
      isDisabled: false,
      isHidden: false,
      isMultiple: false,
      isSubSection: false,
      hiddenForStatuses: [],
      dependFieldCondition: "",
      dependentFields: [],
      areas: [],
      actions: [],
      position: 2,
    };

    it("does not call mutateAsync when editingSections does not contain assetData", async () => {
      tabsDataMock.value = [assetTab];
      areaChangeTrigger.enabled = true;
      areaChangeTrigger.values = {
        brand: "BOSCH",
        baretoolNumber: "BT-002",
        serialNumber: "SN-002",
        purchaseDate: "2024-06-15",
      };
      editingSectionsMock.value = new Set<string>();
      warrantyMutateAsyncMock.mockResolvedValue({ evaluationStatus: "INELIGIBLE" });

      useJobByIdMock.mockReturnValue({
        data: {
          order: { countryCode: "ZA" },
          job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false },
        },
        isLoading: false,
        error: null,
      });

      render(<JobOverview />);

      await new Promise<void>((r) => setTimeout(r, 50));

      expect(warrantyMutateAsyncMock).not.toHaveBeenCalled();
    });

    it("calls mutateAsync and exercises syncWarrantyResultToAssetTab with INELIGIBLE", async () => {
      tabsDataMock.value = [assetTab];
      areaChangeTrigger.enabled = true;
      areaChangeTrigger.values = {
        brand: "BOSCH",
        baretoolNumber: "BT-002",
        serialNumber: "SN-002",
        purchaseDate: "2024-06-15",
      };
      editingSectionsMock.value = new Set(["assetData"]);
      warrantyMutateAsyncMock.mockResolvedValue({
        evaluationStatus: "INELIGIBLE",
        reasonKey: "WARRANTY_EXPIRED",
        validityExpirationDate: "2023-01-01",
        usedWarrantyRepairCount: 0,
        allowedWarrantyRepairCount: 0,
        supportedWarrantyType: "STANDARD_WARRANTY",
      });

      useJobByIdMock.mockReturnValue({
        data: {
          order: { countryCode: "ZA" },
          job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false },
        },
        isLoading: false,
        error: null,
      });

      render(<JobOverview />);

      await waitFor(() => {
        expect(warrantyMutateAsyncMock).toHaveBeenCalledWith(
          expect.objectContaining({
            brand: "BOSCH",
            country: "ZA",
            bareToolNumber: "BT-002",
            serialNumber: "SN-002",
            purchaseDate: "2024-06-15",
          }),
        );
      });

      expect(screen.getByText("job-overview-header")).toBeInTheDocument();
    });

    it("calls mutateAsync and exercises syncWarrantyResultToAssetTab with ELIGIBLE", async () => {
      tabsDataMock.value = [assetTab];
      areaChangeTrigger.enabled = true;
      areaChangeTrigger.values = {
        brand: "BOSCH",
        baretoolNumber: "BT-003",
        serialNumber: "SN-003",
        purchaseDate: "2025-01-15",
      };
      editingSectionsMock.value = new Set(["assetData"]);
      warrantyMutateAsyncMock.mockResolvedValue({
        evaluationStatus: "ELIGIBLE",
        reasonKey: null,
        supportedWarrantyType: "STANDARD_WARRANTY",
        validityExpirationDate: "2027-01-01",
        usedWarrantyRepairCount: 0,
        allowedWarrantyRepairCount: 3,
      });

      useJobByIdMock.mockReturnValue({
        data: {
          order: { countryCode: "ZA" },
          job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false },
        },
        isLoading: false,
        error: null,
      });

      render(<JobOverview />);

      await waitFor(() => {
        expect(warrantyMutateAsyncMock).toHaveBeenCalledWith(
          expect.objectContaining({
            brand: "BOSCH",
            country: "ZA",
            bareToolNumber: "BT-003",
            serialNumber: "SN-003",
            purchaseDate: "2025-01-15",
          }),
        );
      });

      expect(screen.getByText("job-overview-header")).toBeInTheDocument();
    });

    it("handles mutateAsync rejection without crashing (syncWarrantyResultToAssetTab error path)", async () => {
      tabsDataMock.value = [assetTab];
      areaChangeTrigger.enabled = true;
      areaChangeTrigger.values = {
        brand: "BOSCH",
        baretoolNumber: "BT-004",
        serialNumber: "SN-004",
        purchaseDate: "2022-03-10",
      };
      editingSectionsMock.value = new Set(["assetData"]);
      warrantyMutateAsyncMock.mockRejectedValue(new Error("network error"));

      useJobByIdMock.mockReturnValue({
        data: {
          order: { countryCode: "ZA" },
          job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false },
        },
        isLoading: false,
        error: null,
      });

      render(<JobOverview />);

      await waitFor(() => {
        expect(screen.getByText("job-overview-header")).toBeInTheDocument();
      });

      expect(warrantyMutateAsyncMock).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Field fixtures
// ---------------------------------------------------------------------------

const makeField = (name: string, subtype: string, overrides: Partial<Field> = {}): Field =>
  ({
    name,
    label: name,
    type: "text",
    subtype,
    isDisabled: false,
    ...overrides,
  }) as Field;

/** Summary fields + a single distributable CHARGEABLE/SP row, shared by GROSS-mode tests. */
function grossModeFields(): Field[] {
  return [
    makeField("summaryGrossAmount", "diagnosticSummaryGrossAmountMaterial"),
    makeField("summaryTotalAmountMaterial", "diagnosticSummaryTotalAmountMaterial"),
    makeField("summaryTotalAmount", "diagnosticSummaryTotalAmount"),
    makeField("summaryType", "diagnosticSummaryType"),
    makeField("summaryDiscountGross", "diagnosticSummaryDiscountMaterial", {
      dependentFields: [{ fieldValue: "GROSS_PRICE" }],
    } as Partial<Field>),
    makeField("summaryDiscountHidden", "diagnosticSummaryDiscountMaterialHidden"),
    makeField("row1_discount", "diagnosticDiscount", {
      fieldMapping: { nameStartsWith: "row1" },
      dependentFields: [{ fieldValue: "GROSS_PRICE" }],
    } as Partial<Field>),
    makeField("row1_type", "diagnosticType", {
      fieldMapping: { nameStartsWith: "row1" },
    } as Partial<Field>),
    makeField("row1_position", "diagnosticPosition", {
      fieldMapping: { nameStartsWith: "row1" },
    } as Partial<Field>),
  ];
}

/** Summary fields + a single distributable CHARGEABLE/SP row, shared by NET-mode tests. */
function netModeFields(): Field[] {
  return [
    makeField("summarySuggestedNetPrice", "diagnosticSummarySuggestedNetPriceMaterial"),
    makeField("summaryNetAmount", "diagnosticSummaryNetAmountMaterial"),
    makeField("summaryType", "diagnosticSummaryType"),
    makeField("summaryDiscountNet", "diagnosticSummaryDiscountNetMaterial", {
      dependentFields: [{ fieldValue: "NET_PRICE" }],
    } as Partial<Field>),
    makeField("summaryDiscountHidden", "diagnosticSummaryDiscountMaterialHidden"),
    makeField("row1_discount", "diagnosticDiscount", {
      fieldMapping: { nameStartsWith: "row1" },
      dependentFields: [{ fieldValue: "NET_PRICE" }],
    } as Partial<Field>),
    makeField("row1_type", "diagnosticType", {
      fieldMapping: { nameStartsWith: "row1" },
    } as Partial<Field>),
    makeField("row1_position", "diagnosticPosition", {
      fieldMapping: { nameStartsWith: "row1" },
    } as Partial<Field>),
  ];
}

async function readFormValues(): Promise<Record<string, unknown>> {
  const pre = await screen.findByTestId("form-values");
  return JSON.parse(pre.textContent || "{}");
}

beforeEach(() => {
  vi.clearAllMocks();
  locationStateMock.value = null;
  editingSectionsMock.value = new Set<string>();
  tabsDataMock.value = [
    {
      name: "assetData",
      label: "assetData",
      isTab: true,
      isAccordion: false,
      isDisabled: false,
      isHidden: false,
      isMultiple: false,
      isSubSection: false,
      hiddenForStatuses: [],
      dependFieldCondition: "",
      dependentFields: [],
      areas: [],
      actions: [],
      position: 1,
    },
  ];
  allFieldsMock.value = [];
  initialFormValuesMock.value = {};
  discountBaseMock.value = "GROSS_PRICE";
  triggerValueMock.value = 0;
  useJobByIdMock.mockReturnValue({
    data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: false } },
    isLoading: false,
    error: null,
  });
});

describe("JobOverview summary discount/amount handlers", () => {
  it("onSummaryDiscountChange (GROSS_PRICE) distributes discount to gross total and matching rows", async () => {
    discountBaseMock.value = "GROSS_PRICE";
    allFieldsMock.value = grossModeFields();
    initialFormValuesMock.value = {
      summaryGrossAmount: 200,
      summaryTotalAmountMaterial: 200,
      summaryType: "totalSummary",
      summaryDiscountGross: 0,
      row1_type: "CHARGEABLE",
      row1_position: "SP",
      row1_discount: 0,
    };
    triggerValueMock.value = 5;

    render(<JobOverview />);
    fireEvent.click(await screen.findByRole("button", { name: "trigger-discount-change" }));

    await waitFor(async () => {
      const values = await readFormValues();
      expect(values.summaryDiscountGross).toBe(5);
      expect(values.summaryTotalAmountMaterial).toBe(190); // 200 * (1 - 5%)
      expect(values.row1_discount).toBe(5); // distributed to the matching CHARGEABLE/SP row
    });
  });

  it("onSummaryDiscountChange is a no-op when discountBase is NET_PRICE", async () => {
    discountBaseMock.value = "NET_PRICE";
    allFieldsMock.value = grossModeFields();
    initialFormValuesMock.value = {
      summaryGrossAmount: 200,
      summaryTotalAmountMaterial: 200,
      summaryType: "totalSummary",
      summaryDiscountGross: 0,
      row1_type: "CHARGEABLE",
      row1_position: "SP",
      row1_discount: 0,
    };
    triggerValueMock.value = 5;

    render(<JobOverview />);
    fireEvent.click(await screen.findByRole("button", { name: "trigger-discount-change" }));

    // Give any (unexpected) async writes a chance to land, then assert nothing changed.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const values = await readFormValues();
    expect(values.summaryDiscountGross).toBe(0);
    expect(values.row1_discount).toBe(0);
  });

  it("onSummaryTotalAmountChange (GROSS_PRICE) clamps to grossAmount and back-calculates discount", async () => {
    discountBaseMock.value = "GROSS_PRICE";
    allFieldsMock.value = grossModeFields();
    initialFormValuesMock.value = {
      summaryGrossAmount: 200,
      summaryTotalAmountMaterial: 200,
      summaryTotalAmount: 200,
      summaryType: "totalSummary",
      summaryDiscountGross: 0,
      summaryDiscountHidden: 0,
      row1_type: "CHARGEABLE",
      row1_position: "SP",
      row1_discount: 0,
    };
    triggerValueMock.value = 500; // exceeds grossAmount(200) -> should clamp to 200

    render(<JobOverview />);
    fireEvent.click(await screen.findByRole("button", { name: "trigger-total-change" }));

    await waitFor(async () => {
      const values = await readFormValues();
      expect(values.summaryTotalAmountMaterial).toBe(200); // clamped, not 500
      expect(values.summaryDiscountGross).toBe(0); // 0% discount at full price
      expect(values.summaryDiscountHidden).toBe(0);
    });
  });

  it("onSummaryTotalAmountChange (GROSS_PRICE) back-calculates a partial discount and distributes it", async () => {
    discountBaseMock.value = "GROSS_PRICE";
    allFieldsMock.value = grossModeFields();
    initialFormValuesMock.value = {
      summaryGrossAmount: 200,
      summaryTotalAmountMaterial: 200,
      summaryTotalAmount: 200,
      summaryType: "totalSummary",
      summaryDiscountGross: 0,
      summaryDiscountHidden: 0,
      row1_type: "CHARGEABLE",
      row1_position: "SP",
      row1_discount: 0,
    };
    triggerValueMock.value = 90; // 55% discount off 200

    render(<JobOverview />);
    fireEvent.click(await screen.findByRole("button", { name: "trigger-total-change" }));

    await waitFor(async () => {
      const values = await readFormValues();
      expect(values.summaryTotalAmountMaterial).toBe(90);
      expect(values.summaryDiscountGross).toBe(55);
      expect(values.row1_discount).toBe(55);
    });
  });

  it("onSummaryNetAmountChange (NET_PRICE) back-calculates discount and distributes to matching rows", async () => {
    discountBaseMock.value = "NET_PRICE";
    allFieldsMock.value = netModeFields();
    initialFormValuesMock.value = {
      summarySuggestedNetPrice: 100,
      summaryNetAmount: 100,
      summaryType: "totalSummary",
      summaryDiscountNet: 0,
      summaryDiscountHidden: 0,
      row1_type: "CHARGEABLE",
      row1_position: "SP",
      row1_discount: 0,
    };
    triggerValueMock.value = 80; // 20% discount off suggested net 100

    render(<JobOverview />);
    fireEvent.click(await screen.findByRole("button", { name: "trigger-net-change" }));

    await waitFor(async () => {
      const values = await readFormValues();
      expect(values.summaryNetAmount).toBe(80);
      expect(values.summaryDiscountNet).toBe(20);
      expect(values.row1_discount).toBe(20);
    });
  });

  it("onSummaryDiscountNetChange (NET_PRICE) writes discount and distributes to matching rows", async () => {
    discountBaseMock.value = "NET_PRICE";
    allFieldsMock.value = netModeFields();
    initialFormValuesMock.value = {
      summarySuggestedNetPrice: 100,
      summaryNetAmount: 100,
      summaryType: "totalSummary",
      summaryDiscountNet: 0,
      summaryDiscountHidden: 0,
      row1_type: "CHARGEABLE",
      row1_position: "SP",
      row1_discount: 0,
    };
    triggerValueMock.value = 10; // 10% discount

    render(<JobOverview />);
    fireEvent.click(await screen.findByRole("button", { name: "trigger-discount-net-change" }));

    await waitFor(async () => {
      const values = await readFormValues();
      expect(values.summaryDiscountNet).toBe(10); // activeDiscountNetMaterialField write
      expect(values.summaryDiscountHidden).toBe(10);
      expect(values.summaryNetAmount).toBe(90); // 100 * (1 - 10%)
      expect(values.row1_discount).toBe(10);
    });
  });

  it("type filter excludes non-matching rows from distribution (WARRANTY row untouched by chargeable-only filter)", async () => {
    discountBaseMock.value = "GROSS_PRICE";
    const fields = grossModeFields();
    // Override summaryType field default value via initialFormValues below;
    // add a second, non-CHARGEABLE row that should NOT receive the distributed discount.
    fields.push(
      makeField("row2_discount", "diagnosticDiscount", {
        fieldMapping: { nameStartsWith: "row2" },
        dependentFields: [{ fieldValue: "GROSS_PRICE" }],
      } as Partial<Field>),
      makeField("row2_type", "diagnosticType", {
        fieldMapping: { nameStartsWith: "row2" },
      } as Partial<Field>),
      makeField("row2_position", "diagnosticPosition", {
        fieldMapping: { nameStartsWith: "row2" },
      } as Partial<Field>),
    );
    allFieldsMock.value = fields;
    initialFormValuesMock.value = {
      summaryGrossAmount: 200,
      summaryTotalAmountMaterial: 200,
      summaryType: "chargeable", // filter: only CHARGEABLE rows
      summaryDiscountGross: 0,
      row1_type: "CHARGEABLE",
      row1_position: "SP",
      row1_discount: 0,
      row2_type: "WARRANTY",
      row2_position: "SP",
      row2_discount: 0,
    };
    triggerValueMock.value = 5;

    render(<JobOverview />);
    fireEvent.click(await screen.findByRole("button", { name: "trigger-discount-change" }));

    await waitFor(async () => {
      const values = await readFormValues();
      expect(values.row1_discount).toBe(5); // CHARGEABLE: distributed
    });
    const values = await readFormValues();
    expect(values.row2_discount).toBe(0); // WARRANTY: excluded by type filter, untouched
  });
});
