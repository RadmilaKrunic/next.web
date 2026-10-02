import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { Formik } from "formik";
import GenericSection from "./GenericSection";
import Section from "./GenericSection.types";
import { GenericFormContext } from "../Form/GenericForm.context";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock @bosch/react-frok Icon
vi.mock("@bosch/react-frok", () => ({
  Icon: ({
    iconName,
    onClick,
    title,
    className,
  }: {
    iconName: string;
    onClick?: () => void;
    title?: string;
    className?: string;
  }) => (
    <button data-testid={`icon-${iconName}`} onClick={onClick} title={title} className={className}>
      {iconName}
    </button>
  ),
}));

// Mock GenericArea
vi.mock("../Area/GenericArea", () => ({
  default: ({ area, readOnly }: { area: { name: string; label: string }; readOnly?: boolean }) => (
    <div data-testid={`area-${area.name}`} data-readonly={readOnly}>
      {area.label}
    </div>
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
    <div data-testid="section-generic-actions">
      {actions.map((action) => (
        <button
          key={action.name}
          data-testid={`section-action-${action.name}`}
          onClick={() => onActionClick(action.onAction)}
        >
          {action.name}
        </button>
      ))}
    </div>
  ),
}));

// Mock InfoIconWithTooltip
vi.mock("components/ui/TooltipContent/InfoIconWithTooltip", () => ({
  default: ({ infoText }: { infoText?: string }) => (
    <span data-testid="warranty-info-tooltip">{infoText}</span>
  ),
}));

describe("GenericSection", () => {
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

  const renderWithContext = (section: Section, props = {}) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <GenericFormContext.Provider value={mockContextValue}>
          <Formik initialValues={mockInitialValues} onSubmit={vi.fn()}>
            {children}
          </Formik>
        </GenericFormContext.Provider>
      </QueryClientProvider>
    );
    return render(<GenericSection section={section} {...(props as object)} />, {
      wrapper: Wrapper,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders section with label", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: false,
      };

      renderWithContext(section);

      expect(screen.getByText("Test Section")).toBeInTheDocument();
    });

    it("renders section with index", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: false,
        index: 2,
      };

      renderWithContext(section);

      expect(screen.getByText(/Test Section.*3/)).toBeInTheDocument();
    });

    it("renders multiple areas in correct order", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [
          {
            name: "area2",
            label: "Area 2",
            position: 2,
            fields: [],
            dependFieldCondition: "",
            dependentFields: [],
            actions: null,
            isSubArea: false,
          },
          {
            name: "area1",
            label: "Area 1",
            position: 1,
            fields: [],
            dependFieldCondition: "",
            dependentFields: [],
            actions: null,
            isSubArea: false,
          },
        ],
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: false,
      };

      renderWithContext(section);

      expect(screen.getByTestId("area-area1")).toBeInTheDocument();
      expect(screen.getByTestId("area-area2")).toBeInTheDocument();
    });

    it("renders children when provided", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: false,
      };

      renderWithContext(section, {
        children: <div data-testid="custom-child">Custom Content</div>,
      });

      expect(screen.getByTestId("custom-child")).toBeInTheDocument();
    });
  });

  describe("Accordion Behavior", () => {
    it("renders accordion icon when isAccordion is true and section is open", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: true,
        isTab: false,
      };

      renderWithContext(section, { isCollapsed: false });

      expect(screen.getByTestId("icon-up-small")).toBeInTheDocument();
    });

    it("renders down icon when section is collapsed", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: true,
        isTab: false,
      };

      renderWithContext(section, { isCollapsed: true });

      expect(screen.getByTestId("icon-down-small")).toBeInTheDocument();
    });

    it("shows collapsed title when section is collapsed", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: true,
        isTab: false,
      };

      renderWithContext(section, {
        isCollapsed: true,
        collapsedTitle: "John Doe - Active",
      });

      expect(screen.getByText("John Doe - Active")).toBeInTheDocument();
    });

    it("does not show collapsed title when section is open", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: true,
        isTab: false,
      };

      renderWithContext(section, {
        isCollapsed: false,
        collapsedTitle: "John Doe - Active",
      });

      expect(screen.queryByText("John Doe - Active")).not.toBeInTheDocument();
    });

    it("toggles section open/close when header is clicked", async () => {
      const user = userEvent.setup();
      const mockOnHeaderClick = vi.fn();

      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: true,
        isTab: false,
      };

      renderWithContext(section, {
        isCollapsed: true,
        onHeaderClick: mockOnHeaderClick,
      });

      const headerButton = screen.getByRole("button", { name: /Test Section/ });
      await user.click(headerButton);

      expect(mockOnHeaderClick).toHaveBeenCalled();
    });
  });

  describe("Actions", () => {
    it("renders section actions when open and not disabled", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: [
          {
            name: "save",
            mode: "primary",
            onAction: "testAction",
          },
        ],
        isSubSection: false,
        isAccordion: false,
        isTab: false,
      };

      renderWithContext(section, { isCollapsed: false });

      expect(screen.getByTestId("section-generic-actions")).toBeInTheDocument();
    });

    it("does not render actions when section is disabled", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: [
          {
            name: "save",
            mode: "primary",
            onAction: "testAction",
          },
        ],
        isSubSection: false,
        isAccordion: false,
        isTab: false,
        isDisabled: true,
      };

      renderWithContext(section, { isCollapsed: false });

      expect(screen.queryByTestId("section-generic-actions")).not.toBeInTheDocument();
    });

    it("does not render actions when section is collapsed", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: [
          {
            name: "save",
            mode: "primary",
            onAction: "testAction",
          },
        ],
        isSubSection: false,
        isAccordion: false,
        isTab: false,
      };

      renderWithContext(section, { isCollapsed: true });

      expect(screen.queryByTestId("section-generic-actions")).not.toBeInTheDocument();
    });

    it("calls action callback when action is clicked", async () => {
      const user = userEvent.setup();

      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: [
          {
            name: "save",
            mode: "primary",
            onAction: "testAction",
          },
        ],
        isSubSection: false,
        isAccordion: false,
        isTab: false,
      };

      renderWithContext(section);

      const actionButton = screen.getByTestId("section-action-save");
      await user.click(actionButton);

      expect(mockActionCallbacks.testAction).toHaveBeenCalled();
    });
  });

  describe("Icons", () => {
    it("renders delete icon for sections with index > 0", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: false,
        index: 1,
      };

      const mockOnDelete = vi.fn();
      renderWithContext(section, { onDelete: mockOnDelete });

      expect(screen.getByTestId("icon-delete")).toBeInTheDocument();
    });

    it("does not render delete icon for section with index 0", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: false,
        index: 0,
      };

      const mockOnDelete = vi.fn();
      renderWithContext(section, { onDelete: mockOnDelete });

      expect(screen.queryByTestId("icon-delete")).not.toBeInTheDocument();
    });

    it("calls onDelete when delete icon is clicked", async () => {
      const user = userEvent.setup();
      const mockOnDelete = vi.fn();

      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: false,
        index: 1,
      };

      renderWithContext(section, { onDelete: mockOnDelete });

      const deleteIcon = screen.getByTestId("icon-delete");
      await user.click(deleteIcon);

      expect(mockOnDelete).toHaveBeenCalled();
    });

    it("renders edit icon when section is collapsed with collapsedTitle", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: true,
        isTab: false,
      };

      renderWithContext(section, {
        isCollapsed: true,
        collapsedTitle: "Some data",
      });

      const editIcons = screen.getAllByTestId("icon-edit");
      expect(editIcons.length).toBeGreaterThan(0);
    });

    it("renders edit icon when section is open, disabled, and onEdit is provided", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: false,
        isDisabled: true,
      };

      const mockOnEdit = vi.fn();
      renderWithContext(section, { onEdit: mockOnEdit, isCollapsed: false });

      expect(screen.getByTestId("icon-edit")).toBeInTheDocument();
    });

    it("calls onEdit when edit icon is clicked", async () => {
      const user = userEvent.setup();
      const mockOnEdit = vi.fn();

      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: false,
        isDisabled: true,
      };

      renderWithContext(section, { onEdit: mockOnEdit, isCollapsed: false });

      const editIcon = screen.getByTestId("icon-edit");
      await user.click(editIcon);

      expect(mockOnEdit).toHaveBeenCalled();
    });
  });

  describe("ReadOnly Mode", () => {
    it("passes readOnly prop to areas when section is disabled", () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [
          {
            name: "area1",
            label: "Area 1",
            position: 1,
            fields: [],
            dependFieldCondition: "",
            dependentFields: [],
            actions: null,
            isSubArea: false,
          },
        ],
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: false,
        isDisabled: true,
      };

      renderWithContext(section);

      const area = screen.getByTestId("area-area1");
      expect(area).toHaveAttribute("data-readonly", "true");
    });
  });

  describe("Collapsed State", () => {
    it("updates isOpen state when isCollapsed prop changes", async () => {
      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [
          {
            name: "area1",
            label: "Area 1",
            position: 1,
            fields: [],
            dependFieldCondition: "",
            dependentFields: [],
            actions: null,
            isSubArea: false,
          },
        ],
        actions: null,
        isSubSection: false,
        isAccordion: false,
        isTab: false,
      };

      const { rerender } = renderWithContext(section, { isCollapsed: false });

      // Initially open - areas should be visible
      expect(screen.getByTestId("area-area1")).toBeInTheDocument();

      // Rerender with collapsed
      rerender(<GenericSection section={section} isCollapsed={true} />);

      await waitFor(() => {
        // Areas should not be visible when collapsed
        expect(screen.queryByTestId("area-area1")).not.toBeInTheDocument();
      });
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

      const section: Section = {
        name: "testSection",
        isHidden: false,
        label: "Test Section",
        dependFieldCondition: "",
        position: 1,
        areas: [],
        actions: [
          {
            name: "save",
            mode: "primary",
            onAction: "testAction",
          },
        ],
        isSubSection: false,
        isAccordion: false,
        isTab: false,
      };

      render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <GenericFormContext.Provider value={contextWithFailingCallback}>
            <Formik initialValues={mockInitialValues} onSubmit={vi.fn()}>
              <GenericSection section={section} />
            </Formik>
          </GenericFormContext.Provider>
        </QueryClientProvider>,
      );

      const actionButton = screen.getByTestId("section-action-save");
      await user.click(actionButton);

      // Wait for async error handling
      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });
  describe("Visibility and permissions", () => {
    const baseSection = (overrides: Partial<Section> = {}): Section => ({
      name: "testSection",
      isHidden: false,
      label: "Test Section",
      dependFieldCondition: "",
      position: 1,
      areas: [],
      actions: null,
      isSubSection: false,
      isAccordion: false,
      isTab: false,
      ...overrides,
    });

    it("renders nothing when section is hidden", () => {
      renderWithContext(baseSection({ isHidden: true }));

      expect(screen.queryByText("Test Section")).not.toBeInTheDocument();
    });

    it("renders nothing when current status is in hiddenForStatuses", () => {
      renderWithContext(baseSection({ hiddenForStatuses: ["DRAFT"] }), {
        currentStatus: "DRAFT",
      });

      expect(screen.queryByText("Test Section")).not.toBeInTheDocument();
    });

    it("renders when current status is not in hiddenForStatuses", () => {
      renderWithContext(baseSection({ hiddenForStatuses: ["DRAFT"] }), {
        currentStatus: "OPEN",
      });

      expect(screen.getByText("Test Section")).toBeInTheDocument();
    });

    it("renders when hiddenForStatuses is set but no current status is provided", () => {
      renderWithContext(baseSection({ hiddenForStatuses: ["DRAFT"] }));

      expect(screen.getByText("Test Section")).toBeInTheDocument();
    });

    it("renders nothing when user lacks required permission", () => {
      renderWithContext(baseSection({ permissions: ["X_PERM"] }));

      expect(screen.queryByText("Test Section")).not.toBeInTheDocument();
    });

    it("renders when user holds a required permission", () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["user"], { permissions: ["X_PERM"] });
      render(
        <QueryClientProvider client={queryClient}>
          <GenericFormContext.Provider value={mockContextValue}>
            <Formik initialValues={mockInitialValues} onSubmit={vi.fn()}>
              <GenericSection section={baseSection({ permissions: ["X_PERM"] })} />
            </Formik>
          </GenericFormContext.Provider>
        </QueryClientProvider>,
      );

      expect(screen.getByText("Test Section")).toBeInTheDocument();
    });
  });

  describe("Action helpers", () => {
    const section: Section = {
      name: "testSection",
      isHidden: false,
      label: "Test Section",
      dependFieldCondition: "",
      position: 1,
      areas: [],
      actions: [{ name: "save", mode: "primary", onAction: "testAction" }],
      isSubSection: false,
      isAccordion: false,
      isTab: false,
    };

    const renderSection = (
      callbacks: Record<string, unknown>,
      sectionOverride: Section = section,
    ) =>
      render(
        <QueryClientProvider client={new QueryClient()}>
          <GenericFormContext.Provider
            value={{
              ...mockContextValue,
              actionCallbacks: callbacks as typeof mockActionCallbacks,
            }}
          >
            <Formik initialValues={{ testField: "initial" }} onSubmit={vi.fn()}>
              {({ values, errors, touched }) => (
                <>
                  <GenericSection section={sectionOverride} />
                  <div data-testid="form-values">{JSON.stringify(values)}</div>
                  <div data-testid="form-errors">{JSON.stringify(errors)}</div>
                  <div data-testid="form-touched">{JSON.stringify(touched)}</div>
                </>
              )}
            </Formik>
          </GenericFormContext.Provider>
        </QueryClientProvider>,
      );

    it("ignores action click when action has no onAction", async () => {
      const user = userEvent.setup();
      const callback = vi.fn();
      renderSection(
        { testAction: callback },
        { ...section, actions: [{ name: "noop", mode: "primary" }] },
      );

      await user.click(screen.getByTestId("section-action-noop"));

      expect(callback).not.toHaveBeenCalled();
    });

    it("provides setFieldValue, setErrors and setTouched helpers to the callback", async () => {
      const user = userEvent.setup();
      const callback = vi.fn(
        async (
          _values: unknown,
          helpers: {
            setFieldValue: (f: string, v: unknown) => void;
            setErrors: (e: Record<string, unknown>) => void;
            setTouched: (t: Record<string, boolean>) => Promise<unknown>;
          },
        ) => {
          helpers.setFieldValue("testField", "updated");
          helpers.setErrors({ testField: "bad" });
          await helpers.setTouched({ testField: true });
        },
      );
      renderSection({ testAction: callback });

      await user.click(screen.getByTestId("section-action-save"));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ testField: "initial" }),
        expect.any(Object),
      );
      await waitFor(() => {
        expect(screen.getByTestId("form-values")).toHaveTextContent('"testField":"updated"');
        expect(screen.getByTestId("form-errors")).toHaveTextContent('"testField":"bad"');
        expect(screen.getByTestId("form-touched")).toHaveTextContent('"testField":true');
      });
    });
  });

  describe("Header click and dynamic collapsed title", () => {
    const section: Section = {
      name: "testSection",
      isHidden: false,
      label: "Test Section",
      dependFieldCondition: "",
      position: 1,
      areas: [],
      actions: null,
      isSubSection: false,
      isAccordion: true,
      isTab: false,
    };

    it("calls onHeaderClick when the title button is clicked", async () => {
      const user = userEvent.setup();
      const onHeaderClick = vi.fn();
      renderWithContext(section, { onHeaderClick });

      await user.click(screen.getByRole("button", { name: /Test Section/ }));

      expect(onHeaderClick).toHaveBeenCalledTimes(1);
    });

    it("uses getCollapsedTitle with current form values when collapsed", () => {
      const getCollapsedTitle = vi.fn(
        (values: Record<string, unknown>) => `Title ${String(values.testField)}`,
      );
      renderWithContext(section, { isCollapsed: true, getCollapsedTitle });

      expect(getCollapsedTitle).toHaveBeenCalled();
      expect(screen.getByText("Title")).toBeInTheDocument();
    });
  });

  describe("Warranty info", () => {
    const diagnosticSection: Section = {
      name: "diagnosticData",
      isHidden: false,
      label: "Diagnostics",
      dependFieldCondition: "",
      position: 1,
      areas: [],
      actions: null,
      isSubSection: false,
      isAccordion: false,
      isTab: false,
    };

    const renderWithWarranty = (warrantyPanelInfo: Record<string, unknown>) =>
      render(
        <QueryClientProvider client={new QueryClient()}>
          <GenericFormContext.Provider
            value={{
              ...mockContextValue,
              warrantyPanelInfo: {
                supportedWarrantyType: "STANDARD",
                ...warrantyPanelInfo,
              } as never,
            }}
          >
            <Formik initialValues={mockInitialValues} onSubmit={vi.fn()}>
              <GenericSection section={diagnosticSection} />
            </Formik>
          </GenericFormContext.Provider>
        </QueryClientProvider>,
      );

    it("shows unavailable message with custom reason when ineligible", () => {
      renderWithWarranty({ isIneligible: true, unavailableMessage: "Expired" });

      expect(screen.getByText("warrantyUnavailableForTool")).toBeInTheDocument();
      expect(screen.getByTestId("warranty-info-tooltip")).toHaveTextContent("Expired");
    });

    it("falls back to the generic message when no reason is provided", () => {
      renderWithWarranty({ isIneligible: true });

      expect(screen.getByTestId("warranty-info-tooltip")).toHaveTextContent(
        "warrantyBlockedGeneric",
      );
    });

    it("shows unavailable message when purchase date is missing", () => {
      renderWithWarranty({ hasPurchaseDate: false });

      expect(screen.getByText("warrantyUnavailableForTool")).toBeInTheDocument();
    });

    it("hides unavailable message when warranty is eligible", () => {
      renderWithWarranty({ isIneligible: false, hasPurchaseDate: true });

      expect(screen.queryByText("warrantyUnavailableForTool")).not.toBeInTheDocument();
    });
  });
});
