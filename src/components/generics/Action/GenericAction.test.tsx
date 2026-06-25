import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import GenericAction from "./GenericAction";
import { GenericActions } from "./GenericAction.types";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        submit: "Submit",
        cancel: "Cancel",
        save: "Save",
        next: "Next",
        back: "Back",
        addMoreTools: "Add More Tools",
        saveAsDraft: "Save as Draft",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock @bosch/react-frok Button component
vi.mock("@bosch/react-frok", () => ({
  Button: ({
    label,
    onClick,
    type,
    mode,
    className,
  }: {
    label?: string;
    onClick?: () => void;
    type?: "submit" | "reset" | "button";
    mode?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      type={type}
      data-mode={mode}
      data-testid={`button-${label?.toLowerCase().replace(/\s+/g, "-")}`}
      className={className}
    >
      {label}
    </button>
  ),
}));

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(component, { wrapper: Wrapper });
};

describe("GenericAction", () => {
  let mockOnActionClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnActionClick = vi.fn();
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders nothing when actions array is empty", () => {
      renderWithQueryClient(<GenericAction actions={[]} onActionClick={mockOnActionClick} />);

      // When no actions, no buttons should be rendered
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("renders nothing when actions is null", () => {
      renderWithQueryClient(
        <GenericAction
          actions={null as unknown as GenericActions[]}
          onActionClick={mockOnActionClick}
        />,
      );

      // When no actions, no buttons should be rendered
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("renders actions container when actions exist", () => {
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      // Verify button is rendered, which means actions container exists
      expect(screen.getByTestId("button-submit")).toBeInTheDocument();
    });
  });

  describe("Left Container", () => {
    it("renders button in left container", () => {
      const actions: GenericActions[] = [
        {
          name: "cancel",
          mode: "secondary",
          cssContainer: "left",
          onAction: "handleCancel",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-cancel");
      expect(button).toBeInTheDocument();
    });

    it("renders multiple buttons in left container", () => {
      const actions: GenericActions[] = [
        {
          name: "cancel",
          mode: "secondary",
          cssContainer: "left",
          onAction: "handleCancel",
        },
        {
          name: "back",
          mode: "secondary",
          cssContainer: "left",
          onAction: "handleBack",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      expect(screen.getByTestId("button-cancel")).toBeInTheDocument();
      expect(screen.getByTestId("button-back")).toBeInTheDocument();
    });
  });

  describe("Right Container", () => {
    it("renders button in right container", () => {
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-submit");
      expect(button).toBeInTheDocument();
    });

    it("renders multiple buttons in right container", () => {
      const actions: GenericActions[] = [
        {
          name: "save",
          mode: "secondary",
          cssContainer: "right",
          onAction: "handleSave",
        },
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      expect(screen.getByTestId("button-save")).toBeInTheDocument();
      expect(screen.getByTestId("button-submit")).toBeInTheDocument();
    });
  });

  describe("Full Container", () => {
    it("renders button in full container", () => {
      const actions: GenericActions[] = [
        {
          name: "addMoreTools",
          mode: "secondary",
          cssContainer: "full",
          onAction: "handleAddMoreTools",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-add-more-tools");
      expect(button).toBeInTheDocument();
    });

    it("does not render full container button when no full actions exist", () => {
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      // Only submit button should be rendered
      expect(screen.getByTestId("button-submit")).toBeInTheDocument();
      expect(screen.queryByTestId("button-add-more-tools")).not.toBeInTheDocument();
    });

    it("renders full container button along with left and right buttons", () => {
      const actions: GenericActions[] = [
        {
          name: "cancel",
          mode: "secondary",
          cssContainer: "left",
          onAction: "handleCancel",
        },
        {
          name: "addMoreTools",
          mode: "secondary",
          cssContainer: "full",
          onAction: "handleAddMoreTools",
        },
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      // All buttons should be rendered
      expect(screen.getByTestId("button-cancel")).toBeInTheDocument();
      expect(screen.getByTestId("button-add-more-tools")).toBeInTheDocument();
      expect(screen.getByTestId("button-submit")).toBeInTheDocument();
    });
  });

  describe("Button Modes", () => {
    it("renders button with primary mode", () => {
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-submit");
      expect(button).toHaveAttribute("data-mode", "primary");
    });

    it("renders button with secondary mode", () => {
      const actions: GenericActions[] = [
        {
          name: "cancel",
          mode: "secondary",
          cssContainer: "left",
          onAction: "handleCancel",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-cancel");
      expect(button).toHaveAttribute("data-mode", "secondary");
    });

    it("renders button with tertiary mode", () => {
      const actions: GenericActions[] = [
        {
          name: "save",
          mode: "tertiary",
          cssContainer: "right",
          onAction: "handleSave",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-save");
      expect(button).toHaveAttribute("data-mode", "tertiary");
    });

    it("renders button with integrated mode", () => {
      const actions: GenericActions[] = [
        {
          name: "next",
          mode: "integrated",
          cssContainer: "right",
          onAction: "handleNext",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-next");
      expect(button).toHaveAttribute("data-mode", "integrated");
    });
  });

  describe("Button CSS Classes", () => {
    it("applies default full-width class when cssButton is not provided", () => {
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-submit");
      expect(button).toHaveClass("full-width");
    });

    it("applies custom cssButton class", () => {
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          cssButton: "half-width",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-submit");
      expect(button).toHaveClass("half-width");
    });

    it("applies quarter-width class", () => {
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          cssButton: "quarter-width",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-submit");
      expect(button).toHaveClass("quarter-width");
    });
  });

  describe("Button Clicks", () => {
    it("calls onActionClick when button is clicked", async () => {
      const user = userEvent.setup();
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-submit");
      await user.click(button);

      expect(mockOnActionClick).toHaveBeenCalledTimes(1);
      expect(mockOnActionClick).toHaveBeenCalledWith("handleSubmit");
    });

    it("calls onActionClick with correct action name for multiple buttons", async () => {
      const user = userEvent.setup();
      const actions: GenericActions[] = [
        {
          name: "cancel",
          mode: "secondary",
          cssContainer: "left",
          onAction: "handleCancel",
        },
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const cancelButton = screen.getByTestId("button-cancel");
      const submitButton = screen.getByTestId("button-submit");

      await user.click(cancelButton);
      expect(mockOnActionClick).toHaveBeenCalledWith("handleCancel");

      await user.click(submitButton);
      expect(mockOnActionClick).toHaveBeenCalledWith("handleSubmit");

      expect(mockOnActionClick).toHaveBeenCalledTimes(2);
    });

    it("handles click when onAction is undefined", async () => {
      const user = userEvent.setup();
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const button = screen.getByTestId("button-submit");
      await user.click(button);

      expect(mockOnActionClick).toHaveBeenCalledTimes(1);
      expect(mockOnActionClick).toHaveBeenCalledWith(undefined);
    });
  });

  describe("Translations", () => {
    it("translates button labels", () => {
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      expect(screen.getByText("Submit")).toBeInTheDocument();
    });

    it("handles untranslated keys by returning the key", () => {
      const actions: GenericActions[] = [
        {
          name: "unknownKey",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleUnknown",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      expect(screen.getByText("unknownKey")).toBeInTheDocument();
    });

    it("handles empty name gracefully", () => {
      const actions: GenericActions[] = [
        {
          name: "",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleEmpty",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      expect(screen.getByTestId("button-")).toBeInTheDocument();
    });
  });

  describe("Mixed Containers", () => {
    it("renders buttons in all three containers", () => {
      const actions: GenericActions[] = [
        {
          name: "addMoreTools",
          mode: "secondary",
          cssContainer: "full",
          onAction: "handleAddMoreTools",
        },
        {
          name: "cancel",
          mode: "secondary",
          cssContainer: "left",
          onAction: "handleCancel",
        },
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      expect(screen.getByTestId("button-add-more-tools")).toBeInTheDocument();
      expect(screen.getByTestId("button-cancel")).toBeInTheDocument();
      expect(screen.getByTestId("button-submit")).toBeInTheDocument();
    });

    it("renders left and right containers even when no buttons in them", () => {
      const actions: GenericActions[] = [
        {
          name: "addMoreTools",
          mode: "secondary",
          cssContainer: "full",
          onAction: "handleAddMoreTools",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      // Only full container button should be visible
      expect(screen.getByTestId("button-add-more-tools")).toBeInTheDocument();
    });
  });

  describe("Button Types", () => {
    it("renders all buttons with type='button'", () => {
      const actions: GenericActions[] = [
        {
          name: "cancel",
          mode: "secondary",
          cssContainer: "left",
          onAction: "handleCancel",
        },
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      const cancelButton = screen.getByTestId("button-cancel");
      const submitButton = screen.getByTestId("button-submit");

      expect(cancelButton).toHaveAttribute("type", "button");
      expect(submitButton).toHaveAttribute("type", "button");
    });
  });

  describe("Edge Cases", () => {
    it("does not render actions with all optional properties when cssContainer is missing", () => {
      const actions: GenericActions[] = [
        {
          name: "submit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      // Button won't render without cssContainer
      expect(screen.queryByTestId("button-submit")).not.toBeInTheDocument();
    });

    it("filters actions correctly by cssContainer", () => {
      const actions: GenericActions[] = [
        {
          name: "action1",
          cssContainer: "left",
          onAction: "handle1",
        },
        {
          name: "action2",
          cssContainer: "right",
          onAction: "handle2",
        },
        {
          name: "action3",
          cssContainer: "full",
          onAction: "handle3",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      // Verify all three buttons are rendered in their respective containers
      expect(screen.getByTestId("button-action1")).toBeInTheDocument();
      expect(screen.getByTestId("button-action2")).toBeInTheDocument();
      expect(screen.getByTestId("button-action3")).toBeInTheDocument();
    });

    it("does not render button when cssContainer is undefined", () => {
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          onAction: "handleSubmit",
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      // Button should not be rendered since cssContainer is undefined
      expect(screen.queryByTestId("button-submit")).not.toBeInTheDocument();
    });
  });

  describe("Mandatory Fields", () => {
    it("accepts actions with mandatoryFields array", () => {
      const actions: GenericActions[] = [
        {
          name: "submit",
          mode: "primary",
          cssContainer: "right",
          onAction: "handleSubmit",
          mandatoryFields: ["firstName", "lastName", "email"],
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      expect(screen.getByTestId("button-submit")).toBeInTheDocument();
    });

    it("accepts actions with empty mandatoryFields array", () => {
      const actions: GenericActions[] = [
        {
          name: "cancel",
          mode: "secondary",
          cssContainer: "left",
          onAction: "handleCancel",
          mandatoryFields: [],
        },
      ];

      renderWithQueryClient(<GenericAction actions={actions} onActionClick={mockOnActionClick} />);

      expect(screen.getByTestId("button-cancel")).toBeInTheDocument();
    });
  });
});
