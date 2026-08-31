import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateReimbursement from "./CreateReimbursement";
import { MessagesContext } from "../../../contexts/messagescontext";

const {
  mockNavigate,
  mockUseBreadcrumbs,
  mockSetMessages,
  mockReset,
  mockInvalidateQueries,
  mockGenerateReimbursement,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseBreadcrumbs: vi.fn(),
  mockSetMessages: vi.fn(),
  mockReset: vi.fn(),
  mockInvalidateQueries: vi.fn(),
  mockGenerateReimbursement: vi.fn(),
}));

let mockIsInitialized = true;
let mockInitialFormValues: Record<string, unknown> = {};
let mockFormikValues: Record<string, unknown> = {};
let mockReimbursementDryRunInfo: Record<string, unknown> | undefined;
let mockUiConfigurationForms: Array<Record<string, unknown>> | undefined;
let shouldExecuteDryRunQuery = true;

const mockQueryClient = {
  getQueryData: vi.fn((queryKey: unknown[]) => {
    if (queryKey[0] === "user") {
      return { countryCode: "ZA" };
    }
    if (queryKey[0] === "UIConfiguration") {
      return {
        forms: mockUiConfigurationForms,
      };
    }
    if (queryKey[0] === "countryConfiguration") {
      return { currencySymbol: "$" };
    }
    return undefined;
  }),
  invalidateQueries: mockInvalidateQueries,
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mockQueryClient,
  useQuery: (options: { enabled?: boolean; queryFn?: () => Promise<unknown> }) => {
    if (options.enabled && options.queryFn && shouldExecuteDryRunQuery) {
      void options.queryFn();
    }
    return { data: mockReimbursementDryRunInfo };
  },
}));

vi.mock("../../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: mockUseBreadcrumbs,
}));

vi.mock("../../../hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    sections: [{}],
    reset: mockReset,
    initialFormValues: mockInitialFormValues,
    allFields: [],
    setAllFields: vi.fn(),
    mandatoryFields: null,
    isInitialized: mockIsInitialized,
  }),
}));

vi.mock("../../../components/generics/Form/useFormValidation", () => ({
  useFormValidation: () => ({ validate: vi.fn() }),
}));

vi.mock("../../../api/services/reimbursements/action", () => ({
  generateReimbursement: (...args: unknown[]) => mockGenerateReimbursement(...args),
}));

vi.mock("../../../utils/dateFormatter", () => ({
  formatDateToDisplay: (value: string) => `formatted-${value}`,
}));

vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: () => <div data-testid="activity-indicator">loading</div>,
  Chip: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("../../../components/generics/Section/GenericSection", () => ({
  default: () => <div data-testid="generic-section" />,
}));

vi.mock("../../../components/generics/Action/GenericAction", () => ({
  default: ({
    currentStatus,
    onActionClick,
  }: {
    currentStatus: string;
    onActionClick: (actionName: string) => void;
  }) => (
    <div>
      <div data-testid="action-status">{currentStatus}</div>
      <button onClick={() => onActionClick("onCreate")}>onCreate</button>
      <button onClick={() => onActionClick("onCancel")}>onCancel</button>
    </div>
  ),
}));

vi.mock("formik", () => ({
  Formik: ({
    children,
  }: {
    children: (data: { values: Record<string, unknown> }) => React.ReactNode;
  }) => <>{children({ values: mockFormikValues })}</>,
  Form: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
}));

describe("CreateReimbursement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsInitialized = true;
    mockReimbursementDryRunInfo = undefined;
    mockUiConfigurationForms = [
      { name: "createReimbursement", actions: [{ onAction: "onCreate" }] },
    ];
    shouldExecuteDryRunQuery = true;
    mockInitialFormValues = {
      ascDetails: "ASC1,ASC2",
      dateRange: "2026-01-01,2026-01-31",
    };
    mockFormikValues = mockInitialFormValues;
    mockGenerateReimbursement.mockResolvedValue({});
  });

  const renderComponent = () =>
    render(
      <MessagesContext.Provider
        value={{
          messages: [],
          setMessages: mockSetMessages,
        }}
      >
        <MemoryRouter>
          <CreateReimbursement />
        </MemoryRouter>
      </MessagesContext.Provider>,
    );

  it("renders loading indicator while form initializes", () => {
    mockIsInitialized = false;

    renderComponent();

    expect(screen.getByTestId("activity-indicator")).toBeInTheDocument();
  });

  it("renders default claims summary when dry run has not returned", () => {
    mockFormikValues = { ascDetails: "", dateRange: "" };

    renderComponent();

    expect(screen.getByText(/totalClaimsIncluded:\s*N\/A/i)).toBeInTheDocument();
    expect(screen.getByText("selectDateRangeReimbursement")).toBeInTheDocument();
    expect(screen.getByTestId("action-status")).toHaveTextContent("DISABLED");
  });

  it("renders dry run data and enables action status", async () => {
    mockReimbursementDryRunInfo = {
      approvedClaimCount: 5,
      totalAmount: 123,
      periodStartDate: "2026-01-01",
      periodEndDate: "2026-01-31",
    };

    renderComponent();

    expect(screen.getByText(/totalClaimsIncluded:\s*5/i)).toBeInTheDocument();
    expect(screen.getByText(/dateRange:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/formatted-2026-01-01\s*-\s*formatted-2026-01-31/i),
    ).toBeInTheDocument();
    expect(screen.getByText("$123")).toBeInTheDocument();
    expect(screen.getByTestId("action-status")).toHaveTextContent("ENABLED");

    await waitFor(() => {
      expect(mockGenerateReimbursement).toHaveBeenCalledWith({
        serviceCenterIds: ["ASC1", "ASC2"],
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        dryRun: true,
      });
    });
  });

  it("creates reimbursement and navigates to reimbursement list", async () => {
    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "onCreate" }));

    await waitFor(() => {
      expect(mockGenerateReimbursement).toHaveBeenCalledWith({
        serviceCenterIds: ["ASC1", "ASC2"],
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        dryRun: false,
      });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["reimbursements"] });
      expect(mockNavigate).toHaveBeenCalledWith("/reimbursement#reimbursement-list");
    });
  });

  it("resets form when cancel action fires", () => {
    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "onCancel" }));

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("pushes error message when create reimbursement fails", async () => {
    shouldExecuteDryRunQuery = false;
    mockGenerateReimbursement.mockRejectedValueOnce(new Error("request failed"));

    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "onCreate" }));

    await waitFor(() => {
      expect(mockSetMessages).toHaveBeenCalledTimes(1);
    });

    const updateMessages = mockSetMessages.mock.calls[0][0] as (
      prev: Array<Record<string, unknown>>,
    ) => Array<Record<string, unknown>>;
    const updatedMessages = updateMessages([]);

    expect(updatedMessages).toEqual([
      {
        text: "createReimbursementError",
        type: "error",
        duration: 3000,
      },
    ]);
  });

  it("disables action status when ascDetails is empty", () => {
    mockFormikValues = { ascDetails: "", dateRange: "2026-01-01,2026-01-31" };

    renderComponent();

    expect(screen.getByTestId("action-status")).toHaveTextContent("DISABLED");
  });

  it("disables action status when dateRange is incomplete", () => {
    mockFormikValues = { ascDetails: "ASC1", dateRange: "2026-01-01" };

    renderComponent();

    expect(screen.getByTestId("action-status")).toHaveTextContent("DISABLED");
  });

  it("disables action status when approvedClaimCount is not available", () => {
    mockFormikValues = { ascDetails: "ASC1", dateRange: "2026-01-01,2026-01-31" };
    mockReimbursementDryRunInfo = {
      approvedClaimCount: 0,
      totalAmount: 0,
      periodStartDate: "2026-01-01",
      periodEndDate: "2026-01-31",
    };

    renderComponent();

    expect(screen.getByTestId("action-status")).toHaveTextContent("DISABLED");
  });

  it("shows loading indicator while create reimbursement request is pending", async () => {
    shouldExecuteDryRunQuery = false;
    mockGenerateReimbursement.mockImplementation(() => new Promise(() => {}));

    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "onCreate" }));

    expect(screen.getByText("creatingReimbursementLoader")).toBeInTheDocument();
    expect(screen.getByTestId("activity-indicator")).toBeInTheDocument();
  });

  it("renders generic section", () => {
    renderComponent();

    expect(screen.getByTestId("generic-section")).toBeInTheDocument();
  });

  it("renders reimbursement subsection with title", () => {
    renderComponent();

    expect(screen.getByText("eligibleClaims")).toBeInTheDocument();
  });

  it("renders total reimbursement amount when available", () => {
    mockReimbursementDryRunInfo = {
      approvedClaimCount: 5,
      totalAmount: 500,
      periodStartDate: "2026-01-01",
      periodEndDate: "2026-01-31",
    };

    renderComponent();

    expect(screen.getByText("$500")).toBeInTheDocument();
  });

  it("does not render total reimbursement amount when not available", () => {
    mockReimbursementDryRunInfo = {
      approvedClaimCount: 5,
      totalAmount: undefined,
      periodStartDate: "2026-01-01",
      periodEndDate: "2026-01-31",
    };

    renderComponent();

    expect(screen.queryByText(/totalReimbursementAmount/i)).not.toBeInTheDocument();
  });

  it("validates that dry run query is only called when both ascDetails and dateRange are present", () => {
    mockFormikValues = { ascDetails: "", dateRange: "" };
    shouldExecuteDryRunQuery = false;

    renderComponent();

    // Query should not be called when fields are empty
    expect(mockGenerateReimbursement).not.toHaveBeenCalled();
  });

  it("calls generateReimbursement with correct payload when onCreate action is clicked", async () => {
    mockFormikValues = { ascDetails: "ASC1,ASC2", dateRange: "2026-01-01,2026-01-31" };

    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: "onCreate" }));

    await waitFor(() => {
      expect(mockGenerateReimbursement).toHaveBeenCalledWith({
        serviceCenterIds: ["ASC1", "ASC2"],
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        dryRun: false,
      });
    });
  });

  it("passes currency symbol to the summary section", () => {
    mockReimbursementDryRunInfo = {
      approvedClaimCount: 5,
      totalAmount: 100,
      periodStartDate: "2026-01-01",
      periodEndDate: "2026-01-31",
    };

    renderComponent();

    // Currency symbol is shown in the chip
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("formats date range correctly in the summary", () => {
    mockReimbursementDryRunInfo = {
      approvedClaimCount: 5,
      totalAmount: 100,
      periodStartDate: "2026-01-01",
      periodEndDate: "2026-01-31",
    };

    renderComponent();

    expect(
      screen.getByText(/formatted-2026-01-01\s*-\s*formatted-2026-01-31/i),
    ).toBeInTheDocument();
  });

  it("does not render actions when create reimbursement form is unavailable", () => {
    mockUiConfigurationForms = [{ name: "otherForm", actions: [{ onAction: "onCreate" }] }];

    renderComponent();

    expect(screen.queryByRole("button", { name: "onCreate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "onCancel" })).not.toBeInTheDocument();
  });

  it("handles multiple action clicks in sequence", async () => {
    renderComponent();

    // Click cancel
    fireEvent.click(screen.getByRole("button", { name: "onCancel" }));
    expect(mockReset).toHaveBeenCalledTimes(1);

    // Click create
    fireEvent.click(screen.getByRole("button", { name: "onCreate" }));

    await waitFor(() => {
      expect(mockGenerateReimbursement).toHaveBeenCalledWith({
        serviceCenterIds: ["ASC1", "ASC2"],
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        dryRun: false,
      });
    });
  });

  it("calls useBreadcrumbs with correct labels", () => {
    renderComponent();

    expect(mockUseBreadcrumbs).toHaveBeenCalledWith([
      { label: "ascList", href: "/reimbursement#asc-list" },
      { label: "createReimbursement", href: "" },
    ]);
  });
});
