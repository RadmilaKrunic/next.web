import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fetchUserDataFromCookie, HeaderUserData } from "../../../api/services/header/action";

// Mock AccountManagement component to avoid ReactDOM.findDOMNode issues
vi.mock("./AccountManagement/AccountManagement", () => ({
  default: () => <div data-testid="account-management">Account Management</div>,
}));

// Mock the header action
vi.mock("../../../api/services/header/action");

// Mock ReactDOM.findDOMNode to prevent errors
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    findDOMNode: vi.fn(() => null),
  };
});

describe("Header", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });
  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{component}</MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it("renders Header component", () => {
    vi.mocked(fetchUserDataFromCookie).mockResolvedValue({
      type: "ASC",
      ascId: "ASC-123",
      firstName: "John Doe",
      lastName: "Doe",
      email: "john.doe@example.com",
      countryCode: "TR",
      language: "en",
      roles: [],
      permissions: [],
    });

    renderWithQueryClient(<Header />);

    expect(screen.getByTestId("account-management")).toBeInTheDocument();
  });

  it("renders without crashing", () => {
    vi.mocked(fetchUserDataFromCookie).mockResolvedValue({
      type: "ASC",
      ascId: "ASC-123",
      firstName: "John Doe",
      lastName: "Doe",
      email: "john.doe@example.com",
      countryCode: "TR",
      language: "en",
      roles: [],
      permissions: [],
    });

    const { container } = renderWithQueryClient(<Header />);

    expect(container).toBeInTheDocument();
  });

  it("renders AccountManagement component", async () => {
    const mockUserData = {
      type: "ASC",
      ascId: "ASC-123",
      firstName: "John Doe",
      lastName: "Doe",
      email: "john.doe@example.com",
      countryCode: "TR",
      language: "en",
      roles: [],
      permissions: [],
    };

    vi.mocked(fetchUserDataFromCookie).mockResolvedValue(mockUserData);

    renderWithQueryClient(<Header />);

    await waitFor(() => {
      expect(screen.getByTestId("account-management")).toBeInTheDocument();
    });
  });
  it("handles cookie fetch failure gracefully", async () => {
    vi.mocked(fetchUserDataFromCookie).mockResolvedValue(null as unknown as HeaderUserData);

    renderWithQueryClient(<Header />);

    await waitFor(() => {
      expect(screen.getByTestId("account-management")).toBeInTheDocument();
    });
  });
});
