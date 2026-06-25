import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName }: { iconName: string }) =>
    React.createElement("span", { "data-testid": `icon-${iconName}` }),
}));

vi.mock("components/ui/StatusIndicator/StatusIndicator", () => ({
  default: ({ status }: { status: string }) =>
    React.createElement("span", { "data-testid": "status-indicator" }, status),
}));

vi.mock("./TechnicianSelect/TechnicianSelect", () => ({
  default: ({ assigneeName }: { assigneeName: string }) =>
    React.createElement("div", { "data-testid": "technician-select" }, assigneeName),
}));

vi.mock("hooks/useHasPermission", () => ({ useHasPermission: vi.fn().mockReturnValue(false) }));

import OverviewHeader from "./OverviewHeader";
import { useHasPermission } from "hooks/useHasPermission";

const defaultProps = {
  type: "job" as const,
  id: "JOB-001",
  idLabel: "Job ID",
  createdAt: "01.01.2024",
  createdAtLabel: "Created",
  items: [{ icon: "wrench", title: "Tool X", subtitle: "Sub" }],
};

function renderHeader(props = {}) {
  const qc = new QueryClient();
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(OverviewHeader, { ...defaultProps, ...props }),
      ),
    ),
  );
}

describe("OverviewHeader", () => {
  it("renders id label and id", () => {
    renderHeader();
    expect(screen.getByText(/JOB-001/)).toBeInTheDocument();
  });

  it("renders creation date", () => {
    renderHeader();
    expect(screen.getByText(/01\.01\.2024/)).toBeInTheDocument();
  });

  it("renders items from array", () => {
    renderHeader();
    expect(screen.getByText("Tool X")).toBeInTheDocument();
    expect(screen.getByText("Sub")).toBeInTheDocument();
  });

  it("renders history link when provided", () => {
    renderHeader({ historyLink: { label: "View History", href: "/history" } });
    expect(screen.getByRole("link", { name: "View History" })).toBeInTheDocument();
  });

  it("does not render history link when not provided", () => {
    renderHeader();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders status indicator when showStatus=true and status provided", () => {
    renderHeader({ showStatus: true, status: "DRAFT" });
    expect(screen.getByTestId("status-indicator")).toBeInTheDocument();
  });

  it("renders assignee info block when no technician permission", () => {
    renderHeader({ assigneeInfo: { icon: "user", name: "John Doe", subtitle: "Tech" } });
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("renders unassigned when assignee name is null", () => {
    renderHeader({ assigneeInfo: { icon: "user", name: null } });
    expect(screen.getByText("unassigned")).toBeInTheDocument();
  });

  it("renders technician select when canAssignTechnician=true", () => {
    vi.mocked(useHasPermission).mockReturnValue(true);
    renderHeader({
      technicianSelectProps: { assigneeName: "Tech A", ascId: "ASC1", jobId: "JOB-001" },
    });
    expect(screen.getByTestId("technician-select")).toBeInTheDocument();
    vi.mocked(useHasPermission).mockReturnValue(false);
  });

  it("renders ASC name for claim type when no technician permission", () => {
    renderHeader({ type: "claim" as const, ascName: "ACME ASC" });
    expect(screen.getByText("ACME ASC")).toBeInTheDocument();
  });
});
