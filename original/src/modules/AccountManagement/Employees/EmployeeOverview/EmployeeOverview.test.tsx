import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  useQueryMock,
  useMutationMock,
  useQueryClientMock,
  setInitialFormValuesMock,
  invalidateQueriesMock,
  axiosPutMock,
} = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  setInitialFormValuesMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  axiosPutMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ employeeId: "u1" }),
  };
});

vi.mock("../../../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
    useMutation: (...args: unknown[]) => useMutationMock(...args),
    useQueryClient: () => useQueryClientMock(),
  };
});

vi.mock("../../../../api/axios-client/axiosClient", () => ({
  default: {
    put: (...args: unknown[]) => axiosPutMock(...args),
  },
}));

vi.mock("../../../../hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    initialFormValues: {},
    setInitialFormValues: setInitialFormValuesMock,
    allFields: [],
    setAllFields: vi.fn(),
    mandatoryFields: {},
    tabs: [{ name: "employeeInfo", position: 1, label: "employeeInfo" }],
    isInitialized: true,
  }),
}));

vi.mock("../../../../components/generics/Form/useFormValidation", () => ({
  useFormValidation: () => ({
    validate: vi.fn(() => ({})),
    validateByAction: vi.fn(() => ({})),
    startValidation: vi.fn(),
    stopValidation: vi.fn(),
    setCurrentAction: vi.fn(),
  }),
}));

vi.mock("../../../../hooks/useActionWithValidation", () => ({
  useActionWithValidation: () => vi.fn(),
}));

vi.mock("./EmployeeOverview.utils", () => ({
  mapAccountRolesToAPIFormat: vi.fn((roles: string[]) => roles),
}));

vi.mock("../../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div data-testid="loading-indicator" />,
}));

vi.mock("../../../../components/ui/OverviewHeader", () => ({
  default: ({ items, status }: { items: Array<{ title: string }>; status: string }) => (
    <div data-testid="overview-header">
      <span data-testid="header-status">{status}</span>
      <span data-testid="header-name">{items[0]?.title}</span>
    </div>
  ),
}));

vi.mock("@bosch/react-frok", () => ({
  TabNavigation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tab-navigation">{children}</div>
  ),
  Tab: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../../components/generics/Section/GenericSection", () => ({
  default: () => <div data-testid="generic-section" />,
}));

vi.mock("../../../../components/generics/Action/GenericAction", () => ({
  default: ({ onActionClick }: { onActionClick: (actionName?: string) => void }) => (
    <div>
      <button
        type="button"
        data-testid="action-delete"
        onClick={() => onActionClick("onDeleteUser")}
      >
        delete
      </button>
      <button
        type="button"
        data-testid="action-deactivate"
        onClick={() => onActionClick("onDeactivateUser")}
      >
        deactivate
      </button>
    </div>
  ),
}));

vi.mock("../DeleteEmployeeDialog/DeleteEmployeeDialog", () => ({
  default: ({
    showDeleteDialog,
    employeeId,
  }: {
    showDeleteDialog: boolean;
    employeeId: string;
  }) => <div data-testid="delete-dialog">{showDeleteDialog ? `open:${employeeId}` : "closed"}</div>,
}));

vi.mock("../../../../contexts/messagescontext", () => ({
  MessagesContext: React.createContext({
    setMessages: vi.fn(),
  }),
}));

import EmployeeOverview from "./EmployeeOverview";

const employeeData = {
  userId: "u1",
  firstName: "John",
  lastName: "Doe",
  email: "john@doe.com",
  phoneNumber: "123456",
  employeeCode: "EMP-1",
  isActive: true,
  createdOn: "2026-01-01T00:00:00Z",
  accountRoles: [{ id: "ASC_TECHNICIAN", name: "ASC Technician" }],
};

describe("EmployeeOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useQueryClientMock.mockReturnValue({
      getQueryData: (key: unknown[]) => {
        if (key[0] === "user") return { ascId: "ASC8", countryCode: "TR", language: "en" };
        if (key[0] === "UIConfiguration") {
          return {
            forms: [
              {
                name: "EmployeeOverview",
                sections: [{ name: "employeeInfo", position: 1, label: "employeeInfo", areas: [] }],
                actions: [],
              },
            ],
          };
        }
        return undefined;
      },
      invalidateQueries: invalidateQueriesMock,
    });

    useMutationMock.mockReturnValue({ mutate: vi.fn() });
    axiosPutMock.mockResolvedValue({});
  });

  it("renders loading state while query is loading", () => {
    useQueryMock.mockReturnValue({ data: undefined, isLoading: true });

    render(<EmployeeOverview />);

    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
  });

  it("maps employee values into initial form state after load", async () => {
    useQueryMock.mockReturnValue({ data: employeeData, isLoading: false });

    render(<EmployeeOverview />);

    await waitFor(() => {
      expect(setInitialFormValuesMock).toHaveBeenCalled();
    });

    const updater = setInitialFormValuesMock.mock.calls[0][0] as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;
    const mapped = updater({});

    expect(mapped.firstName).toBe("John");
    expect(mapped.lastName).toBe("Doe");
    expect(mapped.email).toBe("john@doe.com");
    expect(mapped.accountRoles).toEqual(["ASC_TECHNICIAN"]);
  });

  it("renders overview header and section content", () => {
    useQueryMock.mockReturnValue({ data: employeeData, isLoading: false });

    render(<EmployeeOverview />);

    expect(screen.getByTestId("overview-header")).toBeInTheDocument();
    expect(screen.getByTestId("header-status")).toHaveTextContent("ACTIVE");
    expect(screen.getByTestId("header-name")).toHaveTextContent("John Doe");
    expect(screen.getByTestId("tab-navigation")).toBeInTheDocument();
    expect(screen.getByTestId("generic-section")).toBeInTheDocument();
  });

  it("opens delete dialog when delete action is clicked", async () => {
    useQueryMock.mockReturnValue({ data: employeeData, isLoading: false });

    render(<EmployeeOverview />);

    expect(screen.getByTestId("delete-dialog")).toHaveTextContent("closed");

    fireEvent.click(screen.getByTestId("action-delete"));

    await waitFor(() => {
      expect(screen.getByTestId("delete-dialog")).toHaveTextContent("open:u1");
    });
  });

  it("deactivates employee and invalidates employee query", async () => {
    useQueryMock.mockReturnValue({ data: employeeData, isLoading: false });

    render(<EmployeeOverview />);

    fireEvent.click(screen.getByTestId("action-deactivate"));

    await waitFor(() => {
      expect(axiosPutMock).toHaveBeenCalledWith("/v1/users/suspend/u1");
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["employee", "u1"] });
    });
  });
});
