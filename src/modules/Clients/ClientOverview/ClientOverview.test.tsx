import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useContext } from "react";
import ClientOverview from "./ClientOverview";
import { getCustomerById, createClient } from "../../../api/services/customers/customers";
import { GenericFormContext } from "../../../components/generics/Form/GenericForm.context";
import { MessagesContext } from "../../../contexts/messagescontext";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ clientId: "client-123" }),
}));

vi.mock("../../../api/services/customers/customers", () => ({
  getCustomerById: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("../../../utils/queryConstants", () => ({
  DEFAULT_STALE_TIME_MS: 60000,
}));

vi.mock("../../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div data-testid="loading" />,
}));

vi.mock("../../../components/ui/OverviewHeader/OverviewHeader", () => ({
  default: (props: any) => (
    <div data-testid="overview-header">
      <span data-testid="header-status">{props.status}</span>
      <span data-testid="header-id">{props.id}</span>
      {props.items.map((item: any, idx: number) => (
        <div key={idx} data-testid={`header-item-${idx}`}>
          {item.title} | {item.subtitle}
        </div>
      ))}
    </div>
  ),
}));

// Mocked once here; GenericOverviewFormSection also imports this module,
// but Vitest resolves module mocks by absolute path, so this single mock
// intercepts both import sites.
vi.mock("@bosch/react-frok", () => ({
  TabNavigation: (props: any) => (
    <div data-testid="tab-navigation">
      {React.Children.map(props.children, (child: any) =>
        React.cloneElement(child, {
          onClick: () => props.onTabSelect(null, { value: child.props.value }),
        }),
      )}
    </div>
  ),
  Tab: (props: any) => (
    <button data-testid={`tab-${props.value}`} onClick={props.onClick}>
      {props.children}
    </button>
  ),
}));

const baseFields = [
  { name: "firstName", isDisabled: true },
  { name: "lastName", isDisabled: true },
];

vi.mock("../../../hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    initialFormValues: {},
    setInitialFormValues: vi.fn(),
    allFields: baseFields,
    setAllFields: vi.fn(),
    mandatoryFields: {},
    tabs: [
      { name: "clientInfo", label: "clientInfo", position: 0 },
      { name: "otherTab", label: "otherTab", position: 1 },
    ],
    isInitialized: true,
  }),
}));

vi.mock("../../../components/generics/Form/useFormValidation", () => ({
  useFormValidation: () => ({
    validate: vi.fn(),
    validateByAction: vi.fn(),
    startValidation: vi.fn(),
    stopValidation: vi.fn(),
    setCurrentAction: vi.fn(),
  }),
}));

// Runs the success callback immediately, simulating a form that passes validation.
vi.mock("../../../hooks/useActionWithValidation", () => ({
  useActionWithValidation:
    () => (_action: string, _values: unknown, _helpers: unknown, onSuccess: () => void) =>
      onSuccess(),
}));

// GenericOverviewFormSection (used by ClientOverview) imports this module too;
// same reasoning as the @bosch/react-frok mock above.
vi.mock("../../../components/generics/Action/GenericAction", () => ({
  default: (props: any) => (
    <div data-testid="generic-action">
      {props.actions.map((action: any) => (
        <button key={action.name} onClick={() => props.onActionClick(action.name)}>
          {action.name}
        </button>
      ))}
    </div>
  ),
}));

const saveFormValues = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phoneNumber: "123456",
  communicationMedium: "email",
  streetName: "Main St",
  houseNumber: "1",
  addressLineTwo: "",
  neighborhood: "",
  postalCode: "12345",
  district: "",
  city: "Springfield",
  countryCode: "US",
};

// Mocked as a context consumer so tests can trigger onSaveClient / onCancelSaveClient,
// which are only exposed via GenericFormContext. Also imported transitively via
// GenericOverviewFormSection.
vi.mock("../../../components/generics/Section/GenericSection", () => ({
  default: (props: any) => {
    const ctx = useContext(GenericFormContext);
    return (
      <div data-testid={`section-${props.section.name}`}>
        <button data-testid={`edit-${props.section.name}`} onClick={props.onEdit}>
          edit
        </button>
        <button
          data-testid="trigger-save"
          onClick={() =>
            ctx.actionCallbacks.onSaveClient(saveFormValues, {
              setErrors: vi.fn(),
              setTouched: vi.fn(),
              setFieldValue: vi.fn(),
            })
          }
        >
          save
        </button>
      </div>
    );
  },
}));

vi.mock("../../../components/generics/utils", () => ({
  toggleSectionFieldsDisabled: (allFields: unknown[]) => allFields,
  convertAPIDataToFormValues: () => ({ firstName: "Jane", lastName: "Doe" }),
}));

const mockAxiosPut = vi.fn();
vi.mock("../../../api/axios-client/axiosClient", () => ({
  default: { put: (...args: unknown[]) => mockAxiosPut(...args) },
}));

const mockSetMessages = vi.fn();

const clientOverviewForm = {
  name: "ClientOverview",
  sections: [
    {
      name: "clientInfo",
      label: "clientInfo",
      position: 0,
      isDisabled: false,
      areas: [{ fields: baseFields }],
    },
    {
      name: "otherTab",
      label: "otherTab",
      position: 1,
      isDisabled: true,
      areas: [],
    },
  ],
  actions: [{ name: "onArchiveClient" }, { name: "onCreateJob" }],
};

const mockClient = {
  firstName: "Jane",
  lastName: "Doe",
  isActive: true,
  assetsCount: 3,
  createdOn: "2024-01-01",
  billingAddress: { street: "Main St", city: "Springfield", stateProvinceRegion: "IL" },
  phoneNumber: "555-0000",
  mobileNumber: "555-1111",
  primaryEmail: "jane@example.com",
};

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(["user"], {
    ascId: "asc-1",
    language: "en",
    locale: "en_US",
    countryCode: "US",
  });
  queryClient.setQueryData(["UIConfiguration", "US"], { forms: [clientOverviewForm] });
  return queryClient;
}

function renderWithProviders(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MessagesContext.Provider value={{ setMessages: mockSetMessages } as any}>
        <ClientOverview />
      </MessagesContext.Provider>
    </QueryClientProvider>,
  );
}

describe("ClientOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading indicator while fetching the client", () => {
    vi.mocked(getCustomerById).mockReturnValue(new Promise(() => {}));
    renderWithProviders(createQueryClient());

    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.queryByTestId("overview-header")).not.toBeInTheDocument();
  });

  it("renders the header with client details once loaded", async () => {
    vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
    renderWithProviders(createQueryClient());

    expect(await screen.findByTestId("overview-header")).toBeInTheDocument();
    expect(screen.getByTestId("header-status")).toHaveTextContent("ACTIVE");
    expect(screen.getByTestId("header-id")).toHaveTextContent("client-123");
    expect(screen.getByTestId("header-item-0")).toHaveTextContent(
      "Jane Doe | 555-1111 | jane@example.com",
    );
    expect(screen.getByTestId("header-item-2")).toHaveTextContent("3");
  });

  it("shows INACTIVE status when the client is not active", async () => {
    vi.mocked(getCustomerById).mockResolvedValue({ ...mockClient, isActive: false } as never);
    renderWithProviders(createQueryClient());

    expect(await screen.findByTestId("header-status")).toHaveTextContent("INACTIVE");
  });

  it("switches the visible section when a different tab is selected", async () => {
    vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
    renderWithProviders(createQueryClient());

    await screen.findByTestId("section-clientInfo");
    fireEvent.click(screen.getByTestId("tab-otherTab"));

    expect(screen.getByTestId("section-otherTab")).toBeInTheDocument();
    expect(screen.queryByTestId("section-clientInfo")).not.toBeInTheDocument();
  });

  describe("save flow", () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it("logs the form values to the console instead of saving", async () => {
      vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
      renderWithProviders(createQueryClient());

      await screen.findByTestId("trigger-save");
      fireEvent.click(screen.getByTestId("trigger-save"));

      expect(consoleLogSpy).toHaveBeenCalledWith("onSaveClient formValues:", saveFormValues);
      expect(createClient).not.toHaveBeenCalled();
      expect(mockSetMessages).not.toHaveBeenCalled();
    });
  });

  it("archives the client and invalidates related queries", async () => {
    vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
    mockAxiosPut.mockResolvedValue({});
    renderWithProviders(createQueryClient());

    await screen.findByText("onArchiveClient");
    fireEvent.click(screen.getByText("onArchiveClient"));

    await waitFor(() =>
      expect(mockAxiosPut).toHaveBeenCalledWith("/v1/clients/archive/client-123"),
    );
  });

  it("navigates to the create-job page", async () => {
    vi.mocked(getCustomerById).mockResolvedValue(mockClient as never);
    renderWithProviders(createQueryClient());

    await screen.findByText("onCreateJob");
    fireEvent.click(screen.getByText("onCreateJob"));

    expect(mockNavigate).toHaveBeenCalledWith("/create-job");
  });
});
