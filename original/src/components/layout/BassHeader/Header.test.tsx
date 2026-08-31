import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";
import { BreadcrumbsContext } from "../../../contexts/breadcrumbscontext";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("./AccountManagement/AccountManagement", () => ({
  default: () => <div data-testid="account-management">Account Management</div>,
}));

function renderHeader(options?: {
  initialEntry?: string | { pathname: string; state?: unknown };
  breadcrumbs?: Array<{ label: string; href: string }>;
}) {
  const initialEntry = options?.initialEntry ?? "/dashboard";
  const breadcrumbs = options?.breadcrumbs ?? [{ label: "dashboard", href: "/dashboard" }];

  return render(
    <BreadcrumbsContext.Provider
      value={{
        breadcrumbs,
        setBreadcrumbs: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[initialEntry as any]}>
        <Header />
      </MemoryRouter>
    </BreadcrumbsContext.Provider>,
  );
}

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("renders account management and default breadcrumb title", () => {
    renderHeader({
      initialEntry: "/dashboard",
      breadcrumbs: [{ label: "dashboard", href: "/dashboard" }],
    });

    expect(screen.getByTestId("account-management")).toBeInTheDocument();
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });

  it("shows preApprovals title on job overview when navigated from approval list", () => {
    renderHeader({
      initialEntry: {
        pathname: "/job-overview/123",
        state: { from: "approval-list" },
      },
      breadcrumbs: [{ label: "jobList", href: "/job-list" }],
    });

    expect(screen.getByText("preApprovals")).toBeInTheDocument();
    expect(screen.queryByText("jobOverview")).not.toBeInTheDocument();
  });

  it("shows jobOverview title on job overview when not from approval list", () => {
    renderHeader({
      initialEntry: {
        pathname: "/job-overview/123",
      },
      breadcrumbs: [{ label: "jobList", href: "/job-list" }],
    });

    expect(screen.getByText("jobOverview")).toBeInTheDocument();
  });

  it("clears job list filters when route is outside job pages", () => {
    sessionStorage.setItem("jobFilters-job-advancedFilters", "x");
    sessionStorage.setItem("job-quickFilters", "x");

    renderHeader({ initialEntry: "/employee-list" });

    expect(sessionStorage.getItem("jobFilters-job-advancedFilters")).toBeNull();
    expect(sessionStorage.getItem("job-quickFilters")).toBeNull();
  });

  it("keeps job list filters when route is /job-list", () => {
    sessionStorage.setItem("jobFilters-job-advancedFilters", "x");
    sessionStorage.setItem("job-quickFilters", "x");

    renderHeader({ initialEntry: "/job-list" });

    expect(sessionStorage.getItem("jobFilters-job-advancedFilters")).toBe("x");
    expect(sessionStorage.getItem("job-quickFilters")).toBe("x");
  });
});
