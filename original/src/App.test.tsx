import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import App from "./App";

// Mock components

vi.mock("./components/layout/BassHeader/Header", () => ({
  default: ({ firstName }: { firstName: string }) => (
    <header data-testid="bass-header">Header - {firstName}</header>
  ),
}));

vi.mock("./components/layout/Main/Main", () => ({
  default: () => <main data-testid="main-content">Main Content</main>,
}));

vi.mock("./components/layout/SideNav/SideNav", () => ({
  default: () => <nav data-testid="side-nav">Side Navigation</nav>,
}));

vi.mock("./components/layout/Footer/Footer", () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock("./components/ui/ConsentModal/ConsentModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="consent-modal">{isOpen ? "Consent Open" : "Consent Closed"}</div>
  ),
}));

vi.mock("./api/services/header/action", () => ({
  fetchUserDataFromCookie: vi.fn(),
}));

vi.mock("./api/services/countryConfiguration/countryConfiguration", () => ({
  getCountryConfig: vi.fn(() =>
    Promise.resolve({
      links: {
        footer: [],
      },
    }),
  ),
}));

vi.mock("./api/services/uiConfiguration/action", () => ({
  getUIConfiguration: vi.fn(() => Promise.resolve({})),
}));

import { fetchUserDataFromCookie } from "./api/services/header/action";

const mockFetchUserData = vi.mocked(fetchUserDataFromCookie);

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

  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
};

describe("App Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFetchUserData.mockResolvedValue({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      countryCode: "DE",
      locale: "en-TR",
      consent: {
        isConsentUpdateRequired: false,
      },
    } as never);
  });

  it("renders App Component", async () => {
    renderWithQueryClient(<App />);

    await screen.findByTestId("bass-header");

    expect(screen.getByTestId("bass-header")).toBeInTheDocument();
    expect(screen.getByTestId("main-content")).toBeInTheDocument();
    expect(screen.getByTestId("side-nav")).toBeInTheDocument();
  });

  it("renders with correct structure", async () => {
    renderWithQueryClient(<App />);

    await screen.findByTestId("bass-header");

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders without crashing", async () => {
    const { container } = renderWithQueryClient(<App />);

    await screen.findByTestId("bass-header");

    expect(container).toBeInTheDocument();
  });

  it("opens consent modal when consent update is required", async () => {
    mockFetchUserData.mockResolvedValueOnce({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      countryCode: "DE",
      locale: "en-TR",
      consent: {
        isConsentUpdateRequired: true,
      },
    } as never);

    renderWithQueryClient(<App />);

    await screen.findByTestId("bass-header");

    expect(screen.getByTestId("consent-modal")).toHaveTextContent("Consent Open");
  });

  it("does not open consent modal when consent update is not required", async () => {
    renderWithQueryClient(<App />);

    await screen.findByTestId("bass-header");

    expect(screen.getByTestId("consent-modal")).toHaveTextContent("Consent Closed");
  });
});
