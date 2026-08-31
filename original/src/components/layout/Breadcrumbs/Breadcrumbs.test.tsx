import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BreadcrumbsContext } from "../../../contexts/breadcrumbscontext";
import Breadcrumbs from "./Breadcrumbs";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName }: { iconName: string }) => <span data-testid={`icon-${iconName}`} />,
}));

function renderBreadcrumbs(breadcrumbs: { href: string; label: string }[] = []) {
  return render(
    <MemoryRouter>
      <BreadcrumbsContext.Provider value={{ breadcrumbs, setBreadcrumbs: vi.fn() }}>
        <Breadcrumbs />
      </BreadcrumbsContext.Provider>
    </MemoryRouter>,
  );
}

describe("Breadcrumbs", () => {
  it("renders dashboard link always", () => {
    renderBreadcrumbs([]);
    expect(screen.getByTestId("breadcrumb-link-dashboard")).toBeInTheDocument();
  });

  it("renders no breadcrumb items when list is empty", () => {
    renderBreadcrumbs([]);
    expect(screen.queryByTestId("breadcrumb-link-0")).not.toBeInTheDocument();
  });

  it("renders breadcrumb items when provided", () => {
    renderBreadcrumbs([
      { href: "/job-list", label: "Jobs" },
      { href: "/job-overview/123", label: "Job 123" },
    ]);
    expect(screen.getByTestId("breadcrumb-link-0")).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumb-link-1")).toBeInTheDocument();
  });

  it("renders labels for each breadcrumb", () => {
    renderBreadcrumbs([{ href: "/job-list", label: "Jobs" }]);
    expect(screen.getByText("Jobs")).toBeInTheDocument();
  });
});
