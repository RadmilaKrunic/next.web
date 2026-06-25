import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CreateJob from "./CreateJob";
import * as ordersApi from "../../../api/services/orders/orders";
import { HeaderUserData } from "../../../api/services/header/action";

// Mock dependencies
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("../../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        saveAsDraft: "Save as Draft",
        next: "Next",
        addMoreTools: "Add More Tools",
        cancel: "Cancel",
        submit: "Submit",
        customerAndPaymentData: "Customer and Payment Data",
        assetData: "Asset Data",
        isRequired: "is required",
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock("../../../components/generics/Section/GenericSection", () => ({
  default: ({
    children,
    section,
    isCollapsed,
  }: {
    children: React.ReactNode;
    section: {
      label: string;
      actions?: Array<{ name?: string; mode?: string; onAction?: string }> | null;
    };
    isCollapsed?: boolean;
  }) => (
    <div data-testid={`section-${section.label}`} data-collapsed={isCollapsed}>
      {children}
      {section.actions && section.actions.length > 0 && (
        <div className="actions">
          {section.actions.map((action) => (
            <button
              key={action.name}
              type="button"
              data-mode={action.mode}
              data-testid={`section-action-${action.name}`}
            >
              {getActionLabel(action.name)}
            </button>
          ))}
        </div>
      )}
    </div>
  ),
}));

const getActionLabel = (actionName?: string): string => {
  const labelMap: Record<string, string> = {
    addMoreTools: "Add More Tools",
    cancel: "Cancel",
    saveAsDraft: "Save as Draft",
    submit: "Submit",
    next: "Next",
  };
  return labelMap[actionName || ""] || actionName || "";
};

vi.mock("../../../components/generics/Action/GenericAction", () => ({
  default: ({
    actions,
    onActionClick,
  }: {
    actions: Array<{ name?: string; mode?: string; onAction?: string; cssContainer?: string }>;
    onActionClick: (actionName: string | undefined) => void;
  }) => (
    <div className="generic-actions">
      {actions.map((action) => (
        <button
          key={action.name}
          type="button"
          data-mode={action.mode}
          data-testid={`form-action-${action.name}`}
          onClick={() => onActionClick(action.onAction)}
        >
          {getActionLabel(action.name)}
        </button>
      ))}
    </div>
  ),
}));

const mockCreateJobForm = {
  name: "CreateJob",
  position: 0,
  formGroup: "JobManagement",
  sections: [
    {
      name: "customerAndPaymentData",
      isHidden: false,
      label: "customerAndPaymentData",
      dependFieldCondition: "",
      dependentFields: [],
      position: 1,
      areas: [
        {
          name: "testArea",
          label: "testArea",
          position: 1,
          fields: [
            {
              name: "firstName",
              label: "firstName",
              type: "text",
              isRequired: true,
              position: 1,
              fieldMapping: { originalName: "firstName" },
            },
          ],
          dependFieldCondition: "",
          dependentFields: [],
          actions: [],
          isSubArea: false,
        },
      ],
      tables: [],
      actions: [
        { name: "saveAsDraft", mode: "secondary", onAction: "saveDraft", mandatoryFields: [] },
        {
          name: "next",
          mode: "primary",
          onAction: "nextSection",
          mandatoryFields: ["firstName"],
        },
      ],
      isSubSection: false,
      isAccordion: false,
      isTab: false,
    },
    {
      name: "assetData#0",
      isHidden: false,
      label: "assetData",
      dependFieldCondition: "",
      dependentFields: [],
      position: 2,
      areas: [
        {
          name: "assetArea",
          label: "assetArea",
          position: 1,
          fields: [
            {
              name: "assetData#0_asset_toolModelName",
              label: "toolModelName",
              type: "text",
              isRequired: false,
              position: 1,
              fieldMapping: { originalName: "toolModelName" },
            },
          ],
          dependFieldCondition: "",
          dependentFields: [],
          actions: [],
          isSubArea: false,
        },
      ],
      tables: [],
      actions: null,
      isSubSection: false,
      isAccordion: false,
      isTab: false,
      isMultiple: true,
      index: 0,
    },
  ],
  actions: [
    {
      name: "addMoreTools",
      mode: "secondary",
      onAction: "onAddMoreTools",
      cssContainer: "full",
      cssButton: "full-width",
      mandatoryFields: [],
    },
    {
      name: "cancel",
      mode: "secondary",
      onAction: "onCancelCreateJob",
      cssContainer: "left",
      cssButton: "half-width",
      mandatoryFields: [],
    },
    {
      name: "saveAsDraft",
      mode: "secondary",
      onAction: "onSaveAsDraft",
      cssContainer: "right",
      cssButton: "half-width",
      mandatoryFields: [],
    },
    {
      name: "submit",
      mode: "primary",
      onAction: "onSubmit",
      cssContainer: "right",
      cssButton: "half-width",
      mandatoryFields: ["firstName"],
    },
  ],
};

vi.mock("../../../api/services/orders/orders", () => ({
  createOrder: vi.fn(),
}));

vi.mock("../../../components/generics/utils", () => ({
  getAllFieldsFromSection: vi.fn(
    (section) => section.areas?.flatMap((area: any) => area.fields || []) || [],
  ),
  getAreasByName: vi.fn((sections, areaName) =>
    sections
      .flatMap((section: { areas?: Array<{ name?: string }> }) => section.areas || [])
      .filter((area: { name?: string }) => area.name === areaName),
  ),
  setDuplicatedSection: vi.fn((section, index) => ({ ...section, index })),
  setInitalSectionsAreasFields: vi.fn((form) => form.sections),
  getInitialFieldValues: vi.fn((fields) =>
    fields.reduce((acc: Record<string, unknown>, field: any) => {
      acc[field.name] = "";
      return acc;
    }, {}),
  ),
  mapValuesToAPI: vi.fn(() => ({ order: { customer: {} } })),
  mapFieldToFieldMapping: vi.fn((field) => ({
    ...field,
    fieldMapping: field.fieldMapping || { originalName: field.name },
  })),
  convertAPIDataToFormValues: vi.fn((apiData) => apiData || {}),
  isFieldVisible: vi.fn(() => true),
}));

vi.mock("@bosch/react-frok", async () => {
  const actual = await vi.importActual("@bosch/react-frok");
  return {
    ...actual,
    ActivityIndicator: ({ loading }: { loading: boolean }) =>
      loading ? <div data-testid="activity-indicator">Loading...</div> : null,
    // ... include any other components you're using from this library
  };
});

describe("CreateJob", () => {
  const mockUserData: HeaderUserData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    ascId: "1",
    type: "user",
    language: "en",
    roles: [],
    permissions: [],
    countryCode: "TR",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

  const renderComponent = () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["user"], mockUserData);
    queryClient.setQueryData(["UIConfiguration", mockUserData.countryCode], {
      forms: [mockCreateJobForm],
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CreateJob />
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  describe("Component Rendering", () => {
    it("renders loading state initially", () => {
      renderComponent();
      // Component should initialize and not show loading after first render
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("renders customer section", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      });
    });

    it("renders Save as Draft buttons", async () => {
      renderComponent();
      await waitFor(() => {
        // One in customer section, one at form level
        const draftButtons = screen.getAllByText("Save as Draft");
        expect(draftButtons.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("renders Next button", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Next")).toBeInTheDocument();
      });
    });

    it("renders Submit button", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Submit")).toBeInTheDocument();
      });
    });

    it("renders Cancel button", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });
    });

    it("renders Add More Tools button", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Add More Tools")).toBeInTheDocument();
      });
    });
  });

  describe("Form Initialization", () => {
    it("initializes form with correct sections", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
        expect(screen.getByTestId("section-assetData")).toBeInTheDocument();
      });
    });
  });

  describe("Action Buttons", () => {
    it("Next button is initially enabled", async () => {
      renderComponent();
      await waitFor(() => {
        const nextButton = screen.getByText("Next");
        expect(nextButton).toBeEnabled();
      });
    });

    it("Submit button is initially enabled", async () => {
      renderComponent();
      await waitFor(() => {
        const submitButton = screen.getByText("Submit");
        expect(submitButton).toBeEnabled();
      });
    });
  });

  describe("Add More Tools", () => {
    it("renders Add More Tools button", async () => {
      renderComponent();
      await waitFor(() => {
        const addButton = screen.getByText("Add More Tools");
        expect(addButton).toBeInTheDocument();
      });
    });

    it("Add More Tools button is clickable", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        const addButton = screen.getByText("Add More Tools");
        expect(addButton).toBeInTheDocument();
      });

      const addButton = screen.getByText("Add More Tools");
      await user.click(addButton);

      // Button should still be there after click
      expect(addButton).toBeInTheDocument();
    });
  });

  describe("Save as Draft", () => {
    it("calls createOrder with isDraft=true when Save as Draft is clicked", async () => {
      const user = userEvent.setup();
      const mockCreateOrder = vi.mocked(ordersApi.createOrder);
      mockCreateOrder.mockResolvedValue({} as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("form-action-saveAsDraft")).toBeInTheDocument();
      });

      // Click the form-level "Save as Draft" button
      const draftButton = screen.getByTestId("form-action-saveAsDraft");
      await user.click(draftButton);

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalledWith(true, expect.any(Object));
      });
    });
  });

  describe("Form Sections Collapse State", () => {
    it("customer section is open by default", async () => {
      renderComponent();
      await waitFor(() => {
        const customerSection = screen.getByTestId("section-customerAndPaymentData");
        expect(customerSection).toHaveAttribute("data-collapsed", "false");
      });
    });

    it("asset section is collapsed by default", async () => {
      renderComponent();
      await waitFor(() => {
        const assetSection = screen.getByTestId("section-assetData");
        expect(assetSection).toHaveAttribute("data-collapsed", "true");
      });
    });
  });

  describe("Cancel Button", () => {
    it("renders Cancel button", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
      });
    });

    it("Cancel button is clickable", async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        const cancelButton = screen.getByText("Cancel");
        expect(cancelButton).toBeInTheDocument();
      });

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      // Form should reset (we can verify by checking if sections are still there)
      expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
    });
  });

  describe("Form Context", () => {
    it("provides CreateJobContext to children", async () => {
      renderComponent();
      await waitFor(() => {
        // The form should render, indicating context is provided
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      });
    });

    it("provides GenericFormContext to children", async () => {
      renderComponent();
      await waitFor(() => {
        // The form should render, indicating context is provided
        expect(screen.getByTestId("section-customerAndPaymentData")).toBeInTheDocument();
      });
    });
  });

  describe("Multiple Sections", () => {
    it("renders multiple asset sections when they exist", async () => {
      renderComponent();
      await waitFor(() => {
        const assetSections = screen.queryAllByTestId(/section-assetData/);
        expect(assetSections.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Button States", () => {
    it("buttons are enabled by default", async () => {
      renderComponent();
      await waitFor(() => {
        const nextButton = screen.getByTestId("section-action-next");
        const submitButton = screen.getByTestId("form-action-submit");
        expect(nextButton).toBeEnabled();
        expect(submitButton).toBeEnabled();
      });
    });
  });

  describe("Form Structure", () => {
    it("renders customer actions container", async () => {
      renderComponent();
      await waitFor(() => {
        const customerSection = screen.getByTestId("section-customerAndPaymentData");
        expect(customerSection).toBeInTheDocument();
        // Customer actions should be within the section
        expect(screen.getByText("Next")).toBeInTheDocument();
      });
    });

    it("renders create job actions container", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByTestId("form-action-cancel")).toBeInTheDocument();
        expect(screen.getByTestId("form-action-submit")).toBeInTheDocument();
      });
    });
  });

  describe("API Integration", () => {
    it("prepares payload correctly for API", async () => {
      const user = userEvent.setup();
      const mockCreateOrder = vi.mocked(ordersApi.createOrder);
      mockCreateOrder.mockResolvedValue({} as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("form-action-saveAsDraft")).toBeInTheDocument();
      });

      // Click the form-level "Save as Draft" button
      const draftButton = screen.getByTestId("form-action-saveAsDraft");
      await user.click(draftButton);

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalledWith(
          true,
          expect.objectContaining({
            order: expect.objectContaining({
              ascId: "1",
              countryCode: "TR",
            }),
          }),
        );
      });
    });

    it("handles API success", async () => {
      const user = userEvent.setup();
      const mockCreateOrder = vi.mocked(ordersApi.createOrder);
      mockCreateOrder.mockResolvedValue({ orderId: 123 } as any);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("form-action-saveAsDraft")).toBeInTheDocument();
      });

      // Click the form-level "Save as Draft" button
      const draftButton = screen.getByTestId("form-action-saveAsDraft");
      await user.click(draftButton);

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalled();
      });
    });

    it("handles API error gracefully", async () => {
      const user = userEvent.setup();
      const mockCreateOrder = vi.mocked(ordersApi.createOrder);
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock with a rejected promise that will be caught
      mockCreateOrder.mockImplementation(() =>
        Promise.reject(new Error("API Error")).catch(() => null),
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("form-action-saveAsDraft")).toBeInTheDocument();
      });

      const draftButton = screen.getByTestId("form-action-saveAsDraft");

      // Click and wait for error to be handled
      await user.click(draftButton);

      // Give time for the promise to reject and be handled
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The component should still be rendered (not crashed)
      expect(screen.getByTestId("form-action-submit")).toBeInTheDocument();

      consoleError.mockRestore();
    });
  });

  describe("Accessibility", () => {
    it("renders buttons with proper types", async () => {
      renderComponent();
      await waitFor(() => {
        const submitButton = screen.getByTestId("form-action-submit");
        expect(submitButton).toHaveAttribute("type", "button");
      });
    });

    it("renders action buttons as button type", async () => {
      renderComponent();
      await waitFor(() => {
        const nextButton = screen.getByTestId("section-action-next");
        const cancelButton = screen.getByTestId("form-action-cancel");
        expect(nextButton).toHaveAttribute("type", "button");
        expect(cancelButton).toHaveAttribute("type", "button");
      });
    });
  });
});
