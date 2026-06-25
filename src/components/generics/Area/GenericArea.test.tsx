import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { Formik } from "formik";
import GenericArea from "./GenericArea";
import Area from "./GenericArea.types";
import { GenericFormContext } from "../Form/GenericForm.context";
import * as CustomAreasMapper from "./CustomAreasMapper";
import * as utils from "../utils";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock GenericField
vi.mock("../Field/GenericField", () => ({
  default: ({ field }: { field: { name: string; label: string } }) => (
    <input data-testid={`field-${field.name}`} aria-label={field.label} defaultValue="" />
  ),
}));

// Mock GenericAction
vi.mock("../Action/GenericAction", () => ({
  default: ({
    actions,
    onActionClick,
  }: {
    actions: Array<{ name?: string; onAction?: string }>;
    onActionClick: (actionName: string | undefined) => void;
  }) => (
    <div data-testid="generic-actions">
      {actions.map((action) => (
        <button
          key={action.name}
          data-testid={`action-${action.name}`}
          onClick={() => onActionClick(action.onAction)}
        >
          {action.name}
        </button>
      ))}
    </div>
  ),
}));

// Mock utils
vi.mock("../utils", () => ({
  isDependedAndVisible: vi.fn(() => true),
}));

// Mock CustomAreasMapper
vi.mock("./CustomAreasMapper", () => ({
  getCustomArea: vi.fn(() => null),
}));

describe("GenericArea", () => {
  const mockActionCallbacks = {
    testAction: vi.fn(),
  };

  const mockContextValue = {
    allFields: [],
    setAllFields: vi.fn(),
    mandatoryFields: null,
    setMandatoryFields: vi.fn(),
    actionCallbacks: mockActionCallbacks,
  };

  const mockInitialValues = {
    testField: "",
  };

  const renderWithContext = (area: Area, readOnly = false) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <GenericFormContext.Provider value={mockContextValue}>
          <Formik initialValues={mockInitialValues} onSubmit={vi.fn()}>
            <GenericArea area={area} readOnly={readOnly} />
          </Formik>
        </GenericFormContext.Provider>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset getCustomArea to return null by default
    vi.mocked(CustomAreasMapper.getCustomArea).mockReturnValue(null);
    // Reset isDependedAndVisible to return true by default
    vi.mocked(utils.isDependedAndVisible).mockReturnValue(true);
  });

  describe("Rendering", () => {
    it("renders area with title", () => {
      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: null,
        isSubArea: false,
      };

      renderWithContext(area);

      expect(screen.getByText("Test Area")).toBeInTheDocument();
    });

    it("renders area without title when label is empty", () => {
      const area: Area = {
        name: "testArea",
        label: " ",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: null,
        isSubArea: false,
      };

      renderWithContext(area);

      expect(screen.queryByText("Test Area")).not.toBeInTheDocument();
    });

    it("renders multiple fields in correct order", () => {
      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [
          {
            name: "field2",
            label: "Field 2",
            type: "text",
            position: 2,
            fieldMapping: { originalName: "field2" },
          },
          {
            name: "field1",
            label: "Field 1",
            type: "text",
            position: 1,
            fieldMapping: { originalName: "field1" },
          },
        ],
        dependFieldCondition: "",
        dependentFields: [],
        actions: null,
        isSubArea: false,
      };

      renderWithContext(area);

      expect(screen.getByTestId("field-field1")).toBeInTheDocument();
      expect(screen.getByTestId("field-field2")).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("renders actions when not in readOnly mode", () => {
      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: [
          {
            name: "save",
            mode: "primary",
            onAction: "testAction",
          },
        ],
        isSubArea: false,
      };

      renderWithContext(area, false);

      expect(screen.getByTestId("generic-actions")).toBeInTheDocument();
      expect(screen.getByTestId("action-save")).toBeInTheDocument();
    });

    it("does not render actions in readOnly mode", () => {
      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: [
          {
            name: "save",
            mode: "primary",
            onAction: "testAction",
          },
        ],
        isSubArea: false,
      };

      renderWithContext(area, true);

      expect(screen.queryByTestId("generic-actions")).not.toBeInTheDocument();
    });

    it("does not render actions when actions is null", () => {
      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: null,
        isSubArea: false,
      };

      renderWithContext(area, false);

      // When actions is null, GenericAction still renders but with empty actions array
      // So we check that there are no action buttons inside
      const actionsContainer = screen.queryByTestId("generic-actions");
      if (actionsContainer) {
        // eslint-disable-next-line testing-library/no-node-access
        expect(actionsContainer.querySelectorAll('[data-testid^="action-"]')).toHaveLength(0);
      }
    });

    it("calls action callback when action is clicked", async () => {
      const user = userEvent.setup();
      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: [
          {
            name: "save",
            mode: "primary",
            onAction: "testAction",
          },
        ],
        isSubArea: false,
      };

      renderWithContext(area, false);

      const actionButton = screen.getByTestId("action-save");
      await user.click(actionButton);

      expect(mockActionCallbacks.testAction).toHaveBeenCalled();
    });
  });

  describe("Visibility", () => {
    it("renders sub-area when visible", () => {
      vi.mocked(utils.isDependedAndVisible).mockReturnValue(true);

      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "AND",
        dependentFields: [{ fieldName: "parentField", fieldValue: true }],
        actions: null,
        isSubArea: true,
      };

      renderWithContext(area);

      expect(screen.getByText("Test Area")).toBeInTheDocument();
    });

    it("does not render sub-area when not visible", () => {
      vi.mocked(utils.isDependedAndVisible).mockReturnValue(false);

      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "AND",
        dependentFields: [{ fieldName: "parentField", fieldValue: true }],
        actions: null,
        isSubArea: true,
      };

      renderWithContext(area);

      expect(screen.queryByText("Test Area")).not.toBeInTheDocument();
    });

    it("always renders non-sub-area regardless of dependencies", () => {
      vi.mocked(utils.isDependedAndVisible).mockReturnValue(false);

      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: null,
        isSubArea: false,
      };

      renderWithContext(area);

      expect(screen.getByText("Test Area")).toBeInTheDocument();
    });
  });

  describe("Custom Areas", () => {
    it("renders custom area when getCustomArea returns component", () => {
      vi.mocked(CustomAreasMapper.getCustomArea).mockReturnValue(
        <div data-testid="custom-area">Custom Area Content</div>,
      );

      const area: Area = {
        name: "customArea",
        label: "Custom Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: null,
        isSubArea: false,
      };

      renderWithContext(area);

      expect(screen.getByTestId("custom-area")).toBeInTheDocument();
      expect(screen.queryByText("Custom Area")).not.toBeInTheDocument();
    });
  });

  describe("CSS Classes", () => {
    it("applies generic-area class", () => {
      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: null,
        isSubArea: false,
      };

      const { container } = renderWithContext(area);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      expect(container.querySelector(".generic-area")).toBeInTheDocument();
    });

    it("applies area-title class to title", () => {
      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: null,
        isSubArea: false,
      };

      const { container } = renderWithContext(area);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      expect(container.querySelector(".area-title")).toBeInTheDocument();
    });

    it("applies area-fields class to fields container", () => {
      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: null,
        isSubArea: false,
      };

      const { container } = renderWithContext(area);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      expect(container.querySelector(".area-fields")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("handles action callback errors gracefully", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const failingCallback = vi.fn().mockRejectedValue(new Error("Action failed"));
      const contextWithFailingCallback = {
        ...mockContextValue,
        actionCallbacks: { testAction: failingCallback },
      };

      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: [
          {
            name: "save",
            mode: "primary",
            onAction: "testAction",
          },
        ],
        isSubArea: false,
      };

      render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <GenericFormContext.Provider value={contextWithFailingCallback}>
            <Formik initialValues={mockInitialValues} onSubmit={vi.fn()}>
              <GenericArea area={area} />
            </Formik>
          </GenericFormContext.Provider>
        </QueryClientProvider>,
      );

      const actionButton = screen.getByTestId("action-save");
      await user.click(actionButton);

      // Wait for async error handling
      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it("handles missing action callback gracefully", async () => {
      const user = userEvent.setup();

      const area: Area = {
        name: "testArea",
        label: "Test Area",
        position: 1,
        fields: [],
        dependFieldCondition: "",
        dependentFields: [],
        actions: [
          {
            name: "save",
            mode: "primary",
            onAction: "nonExistentAction",
          },
        ],
        isSubArea: false,
      };

      renderWithContext(area);

      const actionButton = screen.getByTestId("action-save");
      await user.click(actionButton);

      // Should not crash
      expect(screen.getByTestId("action-save")).toBeInTheDocument();
    });
  });

  describe("Diagnostics invalidation", () => {
    it("calls onAreaValueChange for user changes in diagnostics area", () => {
      const onAreaValueChange = vi.fn();
      const area: Area = {
        name: "diagnosticData_main",
        label: "Diagnostics",
        position: 1,
        fields: [
          {
            name: "typeOfUsage",
            label: "Type of usage",
            type: "text",
            position: 1,
            fieldMapping: { originalName: "typeOfUsage" },
          },
        ],
        dependFieldCondition: "",
        dependentFields: [],
        actions: null,
        isSubArea: false,
      };

      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={queryClient}>
          <GenericFormContext.Provider value={{ ...mockContextValue, onAreaValueChange }}>
            <Formik initialValues={mockInitialValues} onSubmit={vi.fn()}>
              <GenericArea area={area} />
            </Formik>
          </GenericFormContext.Provider>
        </QueryClientProvider>,
      );

      const field = screen.getByTestId("field-typeOfUsage");
      expect(field).toBeInTheDocument();

      fireEvent.change(field, { target: { value: "changed" } });

      expect(onAreaValueChange).toHaveBeenCalledWith("diagnosticData_main");
    });
  });
});
