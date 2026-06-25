import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ExplosionDrawing from "./ExplosionDrawing";
import { SparePartIllustration } from "./ExplosionDrawing.types";
import { getExplosionDrawing } from "../../../../api/services/spareParts/spareParts";

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

  const Tab = ({ children, value }: { children: React.ReactNode; value: number }) => (
    <div data-testid={`tab-${value}`} data-value={value} role="tab">
      {children}
    </div>
  );

  const TabNavigation = ({
    children,
    onTabSelect,
    selectedValue,
    className,
  }: {
    children: React.ReactNode;
    onTabSelect: (e: unknown, data: { value: number }) => void;
    selectedValue: number;
    className?: string;
  }) => (
    <div className={className} data-testid="tab-navigation" data-selected={selectedValue}>
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
  );

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
    TabNavigation,
    Tab,
    Icon: (props: {
      onClick?: () => void;
      iconName: string;
      className?: string;
      onKeyDown?: (e: React.KeyboardEvent) => void;
      ariaLabel?: string;
      tabIndex?: number;
      role?: string;
    }) => (
      <span
        onClick={props.onClick}
        className={props.className}
        data-testid={`icon-${props.iconName}`}
        data-icon={props.iconName}
        aria-label={props.ariaLabel || props.iconName}
        onKeyDown={props.onKeyDown}
      />
    ),
    ActivityIndicator: () => <div data-testid="activity-indicator" />,
  };
});

const mockGetExplosionDrawing = vi.mocked(getExplosionDrawing);

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

describe("ExplosionDrawing", () => {
  let mockIllustration: SparePartIllustration;
  let mockSetIsOpen: ReturnType<typeof vi.fn>;
  let mockOnSubmitParts: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockIllustration = {
      currentIllustrationPath: "https://example.com/image1.gif",
      currentIllustrationPage: 1,
      illustrationList: [
        {
          page: 1,
          ImagePath: "https://example.com/image1.gif",
        },
        {
          page: 2,
          ImagePath: "https://example.com/image2.gif",
        },
      ],
      list: [
        {
          partNumber: "1600100033",
          partNumberFormatted: "1 600 100 033",
          partName: "Cover Disc",
          position: "37",
          quantity: 1,
          price: 35.33,
          posxmax: 835,
          posxmin: 816,
          posymax: 267,
          posymin: 254,
          illustrationNumber: "1",
        },
        {
          partNumber: "1600300001",
          partNumberFormatted: "1 600 300 001",
          partName: "Test Part",
          position: "50",
          quantity: 2,
          price: 25.0,
          posxmax: 500,
          posxmin: 480,
          posymax: 200,
          posymin: 180,
          illustrationNumber: "2",
        },
      ],
    };

    mockSetIsOpen = vi.fn();
    mockOnSubmitParts = vi.fn();

    mockGetExplosionDrawing.mockResolvedValue(mockIllustration);
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

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  const renderExplosionDrawing = (
    overrides?: Partial<React.ComponentProps<typeof ExplosionDrawing>>,
  ) => {
    return renderWithQueryClient(
      <ExplosionDrawing
        isOpen={true}
        formValues={{ baretoolNumber: "0601234567", brand: "BOSCH" }}
        existingMaterials={[]}
        onSubmitParts={mockOnSubmitParts}
        setIsOpen={mockSetIsOpen}
        {...overrides}
      />,
    );
  };

  it("renders loading indicator before data resolves", () => {
    mockGetExplosionDrawing.mockImplementation(() => new Promise<SparePartIllustration>(() => {}));

    renderExplosionDrawing();

    expect(screen.getByTestId("activity-indicator")).toBeInTheDocument();
  });

  it("renders action buttons and tabs after data loads", async () => {
    renderExplosionDrawing();

    expect(await screen.findByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
    expect(screen.getByTestId("tab-1")).toBeInTheDocument();
    expect(screen.getByTestId("tab-2")).toBeInTheDocument();
  });

  it("closes modal from close icon click", async () => {
    renderExplosionDrawing();

    fireEvent.click(await screen.findByTestId("icon-close"));

    expect(mockSetIsOpen).toHaveBeenCalledWith(false);
  });

  it("closes modal from close icon keyboard events", async () => {
    const user = userEvent.setup();
    renderExplosionDrawing();

    const closeButton = await screen.findByRole("button", { name: "Close" });
    closeButton.focus();
    await user.keyboard("{Enter}");

    closeButton.focus();
    await user.keyboard(" ");

    expect(mockSetIsOpen).toHaveBeenCalledTimes(2);
  });

  it("closes modal from cancel button", async () => {
    renderExplosionDrawing();

    fireEvent.click(await screen.findByRole("button", { name: /cancel/i }));

    expect(mockSetIsOpen).toHaveBeenCalledWith(false);
  });

  it("submits selected parts and closes modal", async () => {
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

    renderExplosionDrawing({ existingMaterials });

    fireEvent.click(await screen.findByRole("button", { name: /add/i }));

    await waitFor(() => {
      expect(mockOnSubmitParts).toHaveBeenCalledTimes(1);
      expect(mockSetIsOpen).toHaveBeenCalledWith(false);
      expect(mockOnSubmitParts.mock.calls[0][0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            partNumber: "1600100033",
            position: "37",
            positionType: "SP",
          }),
        ]),
      );
    });
  });

  it("requests a different page when tab changes", async () => {
    renderExplosionDrawing();

    await screen.findByRole("button", { name: /add/i });
    fireEvent.click(screen.getByTestId("tab-button-2"));

    await waitFor(() => {
      expect(mockGetExplosionDrawing).toHaveBeenCalledWith(
        "0601234567",
        expect.objectContaining({ illustrationPage: 2 }),
      );
    });
  });

  it("does not query when modal is closed", () => {
    renderExplosionDrawing({ isOpen: false });

    expect(mockGetExplosionDrawing).not.toHaveBeenCalled();
  });

  it("handles resize event without crashing", async () => {
    renderExplosionDrawing();

    await screen.findByRole("button", { name: /add/i });
    fireEvent(window, new Event("resize"));

    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  it("renders all tabs based on illustration list", async () => {
    renderExplosionDrawing();

    await screen.findByRole("button", { name: /add/i });

    expect(screen.getByTestId("tab-1")).toBeInTheDocument();
    expect(screen.getByTestId("tab-2")).toBeInTheDocument();
    expect(screen.getByTestId("tab-navigation")).toHaveAttribute("data-selected", "1");
  });

  it("renders images for each tab", async () => {
    renderExplosionDrawing();

    const images = await screen.findAllByRole("img");
    expect(images.length).toBeGreaterThanOrEqual(2);
    expect(images[0]).toHaveAttribute("src", "https://example.com/image1.gif");
  });
});
