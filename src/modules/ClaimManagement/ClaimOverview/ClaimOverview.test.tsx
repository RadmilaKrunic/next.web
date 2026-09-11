import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ClaimOverview from "./ClaimOverview";

vi.mock("@bosch/react-frok", () => ({
  TabNavigation: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tab: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ claimId: "C-1" }),
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const onAddRowMock = vi.hoisted(() => vi.fn());
const updateClaimPricesMutateMock = vi.hoisted(() => vi.fn());
const claimRequestApprovalMutateMock = vi.hoisted(() => vi.fn());

const queryClientMock = {
  getQueryData: vi.fn((key: unknown) => {
    if (Array.isArray(key) && key[0] === "user") {
      return { countryCode: "ZA", permissions: [] };
    }
    if (Array.isArray(key) && key[0] === "UIConfiguration") {
      return {
        forms: [
          {
            name: "ClaimOverview",
            actions: [
              { name: "Add Row", onAction: "onAddRow" },
              { name: "Validate", onAction: "onValidate" },
              { name: "Request Approval", onAction: "onRequestApproval" },
              { name: "Edit Claim", onAction: "onEditClaim" },
              { name: "Revise", onAction: "onRevise" },
              { name: "Reject", onAction: "onReject" },
              { name: "Approve", onAction: "onApprove" },
              { name: "Special Materials", onAction: "onAddSpecialMaterials" },
              { name: "Product Details", onAction: "onProductDetails" },
            ],
            sections: [],
          },
        ],
      };
    }
    if (Array.isArray(key) && key[0] === "claim") {
      return { jobId: "J-1" };
    }
    return undefined;
  }),
  invalidateQueries: vi.fn(),
};

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => queryClientMock,
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("hooks/useBreadcrumbs", () => ({ useBreadcrumbs: vi.fn() }));
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
vi.mock("hooks/useSectionEditing", () => ({
  useSectionEditing: () => ({ editingSections: new Set<string>(), setEditingSections: vi.fn() }),
}));
vi.mock("hooks/useClaimDecisionPermissions", () => ({
  useClaimDecisionPermissions: () => ({
    canValidateClaim: true,
    canRequestApproval: true,
    canEditClaim: true,
    canAddSpecialMaterials: true,
    canProductDetails: true,
  }),
}));
vi.mock("hooks/useDiagnosticsManager", () => ({
  useDiagnosticsManager: vi.fn(),
}));

vi.mock("hooks/useClaimMaterialsManager", () => ({
  useClaimMaterialsManager: () => ({
    materials: [],
    setMaterials: vi.fn(),
    positionDropdownOptions: [],
    allowedPositions: [],
    addSpecialMaterialsAllowed: false,
    markAllValidated: vi.fn(),
    markRowDirty: vi.fn(),
    discountBase: "NET_PRICE",
    archivedMaterials: [],
    automaticRows: [],
    onAddRow: onAddRowMock,
    onDeleteRow: vi.fn(),
    onDeleteArchivedRow: vi.fn(),
    onRestoreRow: vi.fn(),
    onAddMaterials: vi.fn(),
    getExistingPartNumbers: () => new Set<string>(),
    forceRebuildRef: { current: false },
    hasSyncedRef: { current: false },
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
}));

vi.mock("components/generics/Action/actionDependency", () => ({
  areAllActionsDisabled: vi.fn(() => false),
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
vi.mock("./ClaimOverviewHeader/ClaimOverviewHeader", () => ({
  default: () => <div>claim-overview-header</div>,
}));
vi.mock("./ClaimNoteModal/ClaimNoteModal", () => ({ default: () => <div>claim-note-modal</div> }));
vi.mock(
  "modules/JobManagement/JobOverview/AddSpecialMaterialModal/AddSpecialMaterialModal",
  () => ({ default: () => <div>special-material-modal</div> }),
);
vi.mock("modules/JobManagement/JobOverview/ExplosionDiagram/ExplosionDrawingModal", () => ({
  default: () => <div>explosion-drawing-modal</div>,
}));
vi.mock("../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div>loading-indicator</div>,
}));

const useClaimByIdMock = vi.hoisted(() => vi.fn());
vi.mock("api/services/claims/hooks", () => ({
  useClaimById: useClaimByIdMock,
  useUpdateClaimPrices: () => ({
    mutate: updateClaimPricesMutateMock,
    mutateAsync: updateClaimPricesMutateMock,
    isPending: false,
  }),
  useClaimRequestApproval: () => ({
    mutate: claimRequestApprovalMutateMock,
    mutateAsync: claimRequestApprovalMutateMock,
    isPending: false,
  }),
}));

vi.mock("api/services/jobs/action", async () => {
  const actual = await vi.importActual<object>("api/services/jobs/action");
  return {
    ...actual,
    postMessage: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ClaimOverview", () => {
  it("renders loading state", () => {
    useClaimByIdMock.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<ClaimOverview />);

    expect(screen.getByText("loading-indicator")).toBeInTheDocument();
  });

  it("renders error state", () => {
    useClaimByIdMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("failed claim"),
    });

    render(<ClaimOverview />);

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(/failed claim/i)).toBeInTheDocument();
  });

  it("renders no claim found state", () => {
    useClaimByIdMock.mockReturnValue({ data: undefined, isLoading: false, error: null });

    render(<ClaimOverview />);

    expect(screen.getByText("noClaimFound")).toBeInTheDocument();
  });

  it("renders main layout when claim data exists", () => {
    useClaimByIdMock.mockReturnValue({
      data: {
        id: "C-1",
        jobId: "J-1",
        claimStatus: "OPEN",
        materials: [],
      },
      isLoading: false,
      error: null,
    });

    render(<ClaimOverview />);

    expect(screen.getByText("claim-overview-header")).toBeInTheDocument();
    expect(screen.getByText("generic-action")).toBeInTheDocument();
  });

  it("triggers onAddRow action callback", () => {
    useClaimByIdMock.mockReturnValue({
      data: {
        id: "C-1",
        jobId: "J-1",
        claimStatus: "OPEN",
        materials: [],
      },
      isLoading: false,
      error: null,
    });

    render(<ClaimOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Add Row" }));

    expect(onAddRowMock).toHaveBeenCalledTimes(1);
  });

  it("executes validate and request-approval actions", async () => {
    useClaimByIdMock.mockReturnValue({
      data: {
        id: "C-1",
        jobId: "J-1",
        claimStatus: "OPEN",
        materials: [],
      },
      isLoading: false,
      error: null,
    });

    render(<ClaimOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    fireEvent.click(screen.getByRole("button", { name: "Request Approval" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Claim" }));
    fireEvent.click(screen.getByRole("button", { name: "Revise" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Special Materials" }));
    fireEvent.click(screen.getByRole("button", { name: "Product Details" }));

    await waitFor(() => expect(updateClaimPricesMutateMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(claimRequestApprovalMutateMock).toHaveBeenCalledTimes(1));
  });
});
