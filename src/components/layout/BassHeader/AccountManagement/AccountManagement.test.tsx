import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AccountManagement from "./AccountManagement";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeaderUserData } from "../../../../api/services/header/action";
import { CountryConfig } from "../../../../api/services/countryConfiguration/countryConfiguration";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
};
globalThis.localStorage = localStorageMock as Storage;

// Mock ReactDOM.findDOMNode to prevent errors
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    findDOMNode: vi.fn(() => null),
  };
});

// Mock @bosch/react-frok
vi.mock("@bosch/react-frok", async () => {
  const actual = await vi.importActual("@bosch/react-frok");
  return {
    ...actual,
    Popover: ({
      children,
      trigger,
      position,
    }: {
      children: React.ReactNode;
      trigger: React.ReactNode;
      position?: string;
    }) => (
      <div data-testid="profile-popover" data-position={position}>
        <div data-testid="profile-trigger">{trigger}</div>
        <div data-testid="popup-content">{children}</div>
      </div>
    ),
    Icon: ({ iconName }: { iconName: string }) => <span data-testid={`icon-${iconName}`}></span>,
    Dropdown: ({ onChange, options }: { onChange?: (e: any) => void; options?: any[] }) => (
      <select data-testid="language-dropdown" onChange={onChange} aria-label="Language selector">
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    ),
  };
});

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        language: "English",
        logout: "Logout",
        myAccount: "My Account",
        user: "user",
        profileId: "Profile ID",
        tr: "Turkish",
        en: "English",
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
vi.mock("../../../../i18n", () => ({
  default: {
    changeLanguage: vi.fn(),
  },
}));

describe("AccountManagement", () => {
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
        locale: "tr-TR",
        language: "tr",
        primary: true,
      },
      {
        locale: "en-US",
        language: "en",
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
      discountBase: "GROSS_PRICE" as const,
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

  const renderWithProviders = (
    component: React.ReactElement,
    userData: HeaderUserData | null = null,
  ) => {
    if (userData) {
      queryClient.setQueryData(["user"], userData);
      queryClient.setQueryData(["countryConfiguration", userData.countryCode], mockCountryConfig);
    }
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };
  it("renders AccountManagement component with user data from cookie", () => {
    const mockUserData: HeaderUserData = {
      type: "ASC",
      ascId: "ASC-123",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      countryCode: "TR",
      language: "en",
      roles: [],
      permissions: [],
    };

    renderWithProviders(<AccountManagement />, mockUserData);

    expect(screen.getByText("John")).toBeInTheDocument();
  });

  it("displays fallback name when user data is not available", () => {
    renderWithProviders(<AccountManagement />, null);

    expect(screen.getByText("user")).toBeInTheDocument();
  });

  it("renders without crashing", () => {
    const mockUserData: HeaderUserData = {
      type: "ASC",
      ascId: "ASC-123",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      countryCode: "TR",
      language: "en",
      roles: [],
      permissions: [],
    };

    const { container } = renderWithProviders(<AccountManagement />, mockUserData);

    expect(container).toBeInTheDocument();
  });

  it("displays the user's name from query data in user info section", () => {
    const mockUserData: HeaderUserData = {
      type: "ASC",
      ascId: "ASC-123",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      countryCode: "TR",
      language: "en",
      roles: [],
      permissions: [],
    };

    renderWithProviders(<AccountManagement />, mockUserData);

    const trigger = screen.getByTestId("profile-trigger");
    expect(trigger).toHaveTextContent("Jane");
  });
});
