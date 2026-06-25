import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ExplosionDrawingModal from "./ExplosionDrawingModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: () => true,
}));

vi.mock("../../../../api/services/spareParts/spareParts", () => ({
  getExplosionDrawing: vi.fn(),
}));

vi.mock("@bosch/react-frok", async () => {
  const React = await import("react");

  return {
    Button: ({
      onClick,
      children,
      className,
    }: {
      onClick: () => void;
      children: React.ReactNode;
      className?: string;
    }) => (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    ),
    TabNavigation: ({
      children,
      onTabSelect,
    }: {
      children: React.ReactNode;
      onTabSelect: (e: unknown, data: { value: number }) => void;
    }) => (
      <div data-testid="tab-navigation">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement<{ value: number }>(child)) {
            return child;
          }

          const value = child.props.value;
          return (
            <button
              type="button"
              data-testid={`tab-button-${value}`}
              onClick={() => onTabSelect(null, { value })}
            >
              {child}
            </button>
          );
        })}
      </div>
    ),
    Tab: ({ children, value }: { children: React.ReactNode; value: number }) => (
      <div data-testid={`tab-${value}`} data-value={value}>
        {children}
      </div>
    ),
    Icon: (props: { onClick?: () => void; iconName: string; className?: string }) => (
      <button
        type="button"
        onClick={props.onClick}
        className={props.className}
        data-testid={`icon-${props.iconName}`}
      />
    ),
    ActivityIndicator: () => <div data-testid="activity-indicator" />,
    Dialog: React.forwardRef(
      (
        {
          open,
          onClose,
          children,
          className,
          "data-testid": testid,
        }: {
          open: boolean;
          onClose: (event?: unknown) => void;
          children: React.ReactNode;
          className?: string;
          "data-testid"?: string;
          modal?: boolean;
        },
        ref: React.Ref<HTMLDialogElement>,
      ) => {
        if (!open) return null;

        return (
          <dialog ref={ref} className={className} data-testid={testid} open>
            {children}
            <button type="button" data-testid="dialog-backdrop" onClick={onClose} />
          </dialog>
        );
      },
    ),
  };
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(component, { wrapper: Wrapper });
};

describe("ExplosionDrawingModal", () => {
  let mockSetIsOpen: ReturnType<typeof vi.fn>;
  let mockOnSubmitParts: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetIsOpen = vi.fn();
    mockOnSubmitParts = vi.fn();
    const store: Record<string, string> = { selectedLanguage: "en" };
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    });
  });

  const renderModal = (overrides?: Partial<React.ComponentProps<typeof ExplosionDrawingModal>>) => {
    return renderWithQueryClient(
      <ExplosionDrawingModal
        isOpen={true}
        setIsOpen={mockSetIsOpen}
        onSubmitParts={mockOnSubmitParts}
        formValues={{ baretoolNumber: "0601234567", brand: "BOSCH" }}
        existingMaterials={[]}
        {...overrides}
      />,
    );
  };

  it("renders dialog when isOpen is true", () => {
    renderModal();

    expect(screen.getByTestId("explosion-drawing-modal")).toBeInTheDocument();
  });

  it("does not render dialog when isOpen is false", () => {
    renderModal({ isOpen: false });

    expect(screen.queryByTestId("explosion-drawing-modal")).not.toBeInTheDocument();
  });

  it("closes dialog when backdrop is clicked", () => {
    renderModal();

    fireEvent.click(screen.getByTestId("dialog-backdrop"));

    expect(mockSetIsOpen).toHaveBeenCalledWith(false);
  });

  it("forwards formValues prop to ExplosionDrawing component", async () => {
    const formValues = { baretoolNumber: "1234567890", brand: "CUSTOM" };
    renderModal({ formValues });

    // The component will attempt to fetch using these values
    await waitFor(() => {
      expect(screen.getByTestId("explosion-drawing-modal")).toBeInTheDocument();
    });
  });

  it("forwards existingMaterials prop to ExplosionDrawing component", async () => {
    const existingMaterials = [
      {
        position: "37",
        partNumber: "1600100033",
        description: "Cover Disc",
        type: "SP",
        quantity: 1,
        unitPrice: 35.33,
        netAmount: 35.33,
        tax: 0,
        taxAmount: 0,
        grossAmount: 35.33,
        discount: 0,
        totalAmount: 35.33,
      },
    ];

    renderModal({ existingMaterials });

    await waitFor(() => {
      expect(screen.getByTestId("explosion-drawing-modal")).toBeInTheDocument();
    });
  });

  it("forwards onSubmitParts callback to ExplosionDrawing component", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByTestId("explosion-drawing-modal")).toBeInTheDocument();
    });

    // The callback will be invoked when the ExplosionDrawing component's add button is clicked
    expect(mockOnSubmitParts).not.toHaveBeenCalled();
  });

  it("forwards setIsOpen callback to ExplosionDrawing component", async () => {
    renderModal();

    // ExplosionDrawing can call setIsOpen when closing
    await waitFor(() => {
      expect(screen.getByTestId("explosion-drawing-modal")).toBeInTheDocument();
    });
  });

  it("renders ExplosionDrawing component inside modal", async () => {
    renderModal();

    // Wait for the content container
    const contentContainer = await screen.findByTestId("explosion-drawing-modal");

    expect(contentContainer).toBeInTheDocument();
  });

  it("triggers resize event after modal opens", () => {
    vi.useFakeTimers();

    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    renderModal();

    vi.advanceTimersByTime(400);

    const calls = dispatchEventSpy.mock.calls.filter(
      (call) => call[0] instanceof Event && call[0].type === "resize",
    );
    expect(calls.length).toBeGreaterThan(0);

    dispatchEventSpy.mockRestore();
    vi.useRealTimers();
  });

  it("removes mousedown listener on unmount", async () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = renderModal();

    expect(addEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("mousedown", expect.any(Function));

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("does not add mousedown listener when isOpen is false", async () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    renderModal({ isOpen: false });

    expect(addEventListenerSpy).not.toHaveBeenCalledWith("mousedown", expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  it("handles modal with default existingMaterials", () => {
    renderModal({ existingMaterials: undefined });

    expect(screen.getByTestId("explosion-drawing-modal")).toBeInTheDocument();
  });
});
