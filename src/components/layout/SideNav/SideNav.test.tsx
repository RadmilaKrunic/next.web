import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({
    iconName,
    onClick,
    onKeyDown,
    tabIndex,
    role,
    "aria-label": ariaLabel,
  }: {
    iconName: string;
    onClick?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    tabIndex?: number;
    role?: string;
    "aria-label"?: string;
  }) => (
    <button
      data-testid={`icon-${iconName}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      role={role}
      aria-label={ariaLabel}
    />
  ),
}));

vi.mock("./NavItem/NavItem", () => ({
  default: ({ item }: { item: { id: number; label: string; link?: string; icon?: string } }) => (
    <li data-testid={`nav-item-${item.id}`}>{item.label}</li>
  ),
}));

vi.mock("../../ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div data-testid="loading-indicator" />,
}));

import SideNav from "./SideNav";
import { NavBar } from "./NavItem/NavItem.types";

const mockNavBar: NavBar = {
  sideNavItems: [
    { id: 1, label: "jobManagement", link: "job-management", icon: "briefcase" },
    { id: 2, label: "claimManagement", link: "claim-management", icon: "document" },
  ],
  helpLink: { name: "Help Center", value: "/help" },
};

function renderSideNav(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SideNav />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SideNav", () => {
  it("renders loading state when query is loading", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderSideNav(qc);
    // While loading, nav renders with loading indicator
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders nav items when data is loaded", () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    qc.setQueryData(["sideNav"], mockNavBar);
    renderSideNav(qc);

    expect(screen.getByTestId("nav-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("nav-item-2")).toBeInTheDocument();
  });

  it("renders help center link", () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    qc.setQueryData(["sideNav"], mockNavBar);
    renderSideNav(qc);

    expect(screen.getByRole("link", { name: "Help Center" })).toBeInTheDocument();
  });

  it("renders BASS name label", () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    qc.setQueryData(["sideNav"], mockNavBar);
    renderSideNav(qc);

    expect(screen.getByLabelText("BASS Application")).toBeInTheDocument();
  });

  it("renders nav as navigation landmark", () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    qc.setQueryData(["sideNav"], mockNavBar);
    renderSideNav(qc);

    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });
});
