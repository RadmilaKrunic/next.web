import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PopoverContent from "./PopoverContent";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeaderUserData } from "../../../../../api/services/header/action";
import { CountryConfig } from "../../../../../api/services/countryConfiguration/countryConfiguration";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
globalThis.localStorage = localStorageMock as Storage;

// Mock @bosch/react-frok
vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName, className }: { iconName: string; className?: string }) => (
    <i data-testid={`icon-${iconName}`} className={className} />
  ),
  Dropdown: ({
    buttonlabel,
    options,
    onChange,
    className,
  }: {
    buttonlabel: string;
    options: Array<{ value: string; label: string }>;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    className?: string;
  }) => (
    <select
      data-testid="language-dropdown"
      className={className}
      aria-label={buttonlabel}
      onChange={onChange}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        language: "English",
        logout: "Logout",
        profileId: "Profile ID",
        en: "English",
        de: "German",
        tr: "Turkish",
      };
      return translations[key] || key;
    },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

// Mock i18n
vi.mock("../../../../../i18n", () => ({
  default: {
    changeLanguage: vi.fn(),
  },
}));

describe("PopoverContent", () => {
  let queryClient: QueryClient;

  const mockCountryConfig: CountryConfig = {
    id: "TR",
    countryName: "Turkey",
    active: true,
    description: "Turkey country configuration",
    dateFormat: "DD.MM.YYYY",
    currency: "TRY",
    currencySymbol: "₺",
    currencyDecimalSeparator: ".",
    currencyThousandSeparator: ",",
    taxRates: [
      {
        type: "VAT",
        rate: 18,
      },
    ],
    localizationConfiguration: [
      {
        locale: "en-US",
        language: "en",
        primary: true,
      },
      {
        locale: "de-DE",
        language: "de",
        primary: false,
      },
      {
        locale: "tr-TR",
        language: "tr",
        primary: false,
      },
    ],
    links: {
      footer: [],
      header: [],
    },
    diagnosticsConfiguration: {
      addSpecialMaterialsAllowed: true,
      rules: [],
      discountBase: "NET_PRICE" as const,
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  const renderWithProviders = (userData: HeaderUserData | null = null) => {
    if (userData) {
      queryClient.setQueryData(["user"], userData);
      queryClient.setQueryData(["countryConfiguration", userData.countryCode], mockCountryConfig);
    }
    return render(
      <QueryClientProvider client={queryClient}>
        <PopoverContent />
      </QueryClientProvider>,
    );
  };

  const mockUser: HeaderUserData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    countryCode: "TR",
    language: "en",
    type: "ASC",
    ascId: "ASC-123",
    roles: ["admin"],
    permissions: ["read"],
  };

  it("renders user information correctly", () => {
    renderWithProviders(mockUser);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
    const dropdown = screen.getByRole("combobox");
    expect(dropdown).toBeInTheDocument();

    // Check if English option exists within the select
    const englishOption = screen.getByRole("option", { name: "English" });
    expect(englishOption).toBeInTheDocument();
    expect(englishOption).toHaveValue("en");
  });

  it("displays first letter of name when no profile image", () => {
    renderWithProviders(mockUser);

    expect(screen.getByText("J")).toBeInTheDocument();
    expect(screen.queryByAltText("Profile")).not.toBeInTheDocument();
  });

  it("handles empty user data gracefully", () => {
    renderWithProviders(null);

    // The component should still render without crashing
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
  });

  it("handles button clicks correctly", () => {
    const mockReplace = vi.fn();
    Object.defineProperty(window, "location", {
      value: { replace: mockReplace },
      writable: true,
    });
    vi.useFakeTimers();

    renderWithProviders(mockUser);

    fireEvent.click(screen.getByRole("button", { name: /Logout/i }));
    vi.runAllTimers();

    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining("/v1/auth/logout"));

    vi.useRealTimers();
  });

  it("renders language dropdown with correct options", () => {
    renderWithProviders(mockUser);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "German" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Turkish" })).toBeInTheDocument();
  });

  it("handles language dropdown change", () => {
    renderWithProviders(mockUser);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "de" } });

    expect(select).toHaveValue("de");
  });

  it("renders Profile ID link", () => {
    renderWithProviders(mockUser);

    const profileLink = screen.getByRole("link", { name: /Profile ID/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute("target", "_blank");
    expect(profileLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
