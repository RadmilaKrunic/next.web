import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import JobOverview from "./JobOverview";

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
    useLocation: () => ({ state: null }),
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
const repairApprovalMutateMock = vi.hoisted(() => vi.fn());
const internalApprovalMutateMock = vi.hoisted(() => vi.fn());
const startReviewMutateMock = vi.hoisted(() => vi.fn());
const startRepairMutateMock = vi.hoisted(() => vi.fn());
const finishRepairMutateMock = vi.hoisted(() => vi.fn());
const toolDeliveredMutateMock = vi.hoisted(() => vi.fn());
const createCostEstimateMutateMock = vi.hoisted(() => vi.fn());

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
    diagnosticData: undefined,
    diagnosticLoading: false,
    shouldFetchDiagnostic: false,
  }),
}));
vi.mock("hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    initialFormValues: {},
    setInitialFormValues: vi.fn(),
    allFields: [],
    setAllFields: vi.fn(),
    mandatoryFields: null,
    tabs: [],
    setTabs: vi.fn(),
  }),
}));
vi.mock("hooks/useActionWithValidation", () => ({
  useActionWithValidation: () =>
    vi.fn(async (_a: string, _b: unknown, _c: unknown, onValid: () => void) => onValid()),
}));
vi.mock("hooks/usePositionDropdownSync", () => ({ usePositionDropdownSync: vi.fn() }));
vi.mock("hooks/useSectionEditing", () => ({
  useSectionEditing: () => ({
    editingSections: new Set<string>(),
    enableSectionEditing: vi.fn(),
    disableSectionEditing: vi.fn(),
    setEditingSections: vi.fn(),
  }),
}));
vi.mock("hooks/useDiagnosticsManager", () => ({
  useDiagnosticsManager: () => ({
    materials: [],
    setMaterials: vi.fn(),
    positionDropdownOptions: [],
    allowedPositions: [],
    addSpecialMaterialsAllowed: false,
    markAllValidated: vi.fn(),
    markRowDirty: vi.fn(),
    discountBase: "NET_PRICE",
    onAddRow: onAddRowMock,
    onDeleteRow: vi.fn(),
    onRestoreRow: vi.fn(),
    onAddMaterials: vi.fn(),
    getExistingPartNumbers: () => new Set<string>(),
    enableValidate: () => false,
    setRevisedRowPending: vi.fn(),
    apiMaterialsLoaded: false,
    apiMaterialsEmpty: true,
    hasExistingDiagnostic: false,
    canArchiveOnDelete: false,
    automaticRows: [],
    resyncMaterialsFromAPI: vi.fn(),
  }),
  getBoschInternalPending: () => ({ pendingTypeFields: [], hasBoschInternalPending: false }),
  getChargeablePendingInfo: () => ({ pendingTypeFields: [], hasChargeablePending: false }),
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
  mapValuesToAPI: vi.fn(() => ({})),
}));

vi.mock("components/generics/Form/formValidation", () => ({
  getUploadFieldErrors: vi.fn(() => ({})),
}));

vi.mock("components/generics/Section/GenericSection", () => ({
  default: () => <div>generic-section</div>,
}));
vi.mock("components/generics/Action/GenericAction", () => ({
  default: ({
    actions,
    onActionClick,
  }: {
    actions: Array<{ name?: string; onAction?: string }>;
    onActionClick: (action: string | undefined) => void;
  }) => (
    <div>
      <div>generic-action</div>
      {actions.map((action) => (
        <button key={action.onAction} type="button" onClick={() => onActionClick(action.onAction)}>
          {action.name}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("./JobOverviewHeader/JobOverviewHeader", () => ({
  default: () => <div>job-overview-header</div>,
}));
vi.mock("./AddSpecialMaterialModal/AddSpecialMaterialModal", () => ({
  default: () => <div>add-special-material-modal</div>,
}));
vi.mock("./AnswerModal/AnswerModal", () => ({
  default: () => <div>answer-modal</div>,
}));
vi.mock("./ExplosionDiagram/ExplosionDrawingModal", () => ({
  default: () => <div>explosion-drawing-modal</div>,
}));
vi.mock(
  "../../ClaimManagement/ApprovalList/ApprovalListTable/ApprovalDecisionModal/ApprovalDecisionModal",
  () => ({
    default: () => <div>approval-decision-modal</div>,
  }),
);
vi.mock("../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div>loading-indicator</div>,
}));

vi.mock("api/services/approvals/hooks", () => ({
  useUpdateApprovalStatus: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

const useJobByIdMock = vi.hoisted(() => vi.fn());
vi.mock("api/services/jobs/hooks", () => ({
  useJobById: useJobByIdMock,
  usePatchJobById: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  usePostCustomerData: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
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
  usePostValidateAndSave: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
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
    fireEvent.click(screen.getByRole("button", { name: "Customer Answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve Repair" }));
    fireEvent.click(screen.getByRole("button", { name: "Request Internal" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Repair" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish Repair" }));
    fireEvent.click(screen.getByRole("button", { name: "Tool Delivered" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Cost" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Customer" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Save Customer" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Asset" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Asset" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Special" }));
    fireEvent.click(screen.getByRole("button", { name: "Product Details" }));
    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve Pre" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject Pre" }));
    fireEvent.click(screen.getByRole("button", { name: "Revise Pre" }));

    const mutationCalls =
      toggleHoldMutateMock.mock.calls.length +
      startDiagnosticMutateMock.mock.calls.length +
      customerAnswerMutateMock.mock.calls.length +
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
});
