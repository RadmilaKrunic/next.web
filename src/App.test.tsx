import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

vi.mock("./api/services/header/action", () => ({
  fetchUserDataFromCookie: vi.fn(() =>
    Promise.resolve({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    }),
  ),
}));

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
  it("renders App Component", async () => {
    renderWithQueryClient(<App />);
    await screen.findByTestId("bass-header");

    // Check that the app renders all components
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
});
