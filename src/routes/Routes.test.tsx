import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock all heavy modules
vi.mock("../modules/Dashboard/Dashboard", () => ({
  default: () => React.createElement("div", { "data-testid": "dashboard" }, "Dashboard"),
}));
vi.mock("../modules/UserManagement/UserManagement", () => ({
  default: () => React.createElement("div", { "data-testid": "user-management" }),
}));
vi.mock("../modules/JobManagement/JobList/JobList", () => ({
  default: () => React.createElement("div", { "data-testid": "job-list" }),
}));
vi.mock("../modules/Reports/Reports", () => ({
  default: () => React.createElement("div", { "data-testid": "reports" }),
}));
vi.mock("../modules/Reports/BiqicReport/BiqicReport", () => ({
  default: () => React.createElement("div", { "data-testid": "biqic-report" }),
}));
vi.mock("../modules/SystemConfiguration/SystemConfiguration", () => ({
  default: () => React.createElement("div", { "data-testid": "system-configuration" }),
}));
vi.mock("../modules/Reimbursement/Reimbursement", () => ({
  default: () => React.createElement("div", { "data-testid": "reimbursement" }),
}));
vi.mock("../modules/Clients/Clients", () => ({
  default: () => React.createElement("div", { "data-testid": "clients" }),
}));
vi.mock("../modules/ClaimManagement/ClaimManagement", () => ({
  default: () => React.createElement("div", { "data-testid": "claim-management" }),
}));
vi.mock("../modules/ClaimManagement/ApprovalList/ApprovalList", () => ({
  default: () => React.createElement("div", { "data-testid": "approval-list" }),
}));
vi.mock("../modules/JobManagement/CreateJob/CreateJob", () => ({
  default: () => React.createElement("div", { "data-testid": "create-job" }),
}));
vi.mock("../modules/JobManagement/JobOverview/JobOverview", () => ({
  default: () => React.createElement("div", { "data-testid": "job-overview" }),
}));
vi.mock("../routes/NotFound/NotFound", () => ({
  default: () => React.createElement("div", { "data-testid": "not-found" }),
}));
vi.mock("./NotFound/NotFound", () => ({
  default: () => React.createElement("div", { "data-testid": "not-found" }),
}));
vi.mock("modules/ClaimManagement/ClaimOverview/ClaimOverview", () => ({
  default: () => React.createElement("div", { "data-testid": "claim-overview" }),
}));
vi.mock("hooks/useHasPermission", () => ({ useHasPermission: vi.fn().mockReturnValue(true) }));

import AppRoutes from "./Routes";
import { useHasPermission } from "hooks/useHasPermission";

function renderRoutes(path: string) {
  const qc = new QueryClient();
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(AppRoutes)),
    ),
  );
}

describe("AppRoutes", () => {
  it("renders Dashboard on index route", () => {
    renderRoutes("/");
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });

  it("renders Dashboard on /dashboard", () => {
    renderRoutes("/dashboard");
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });

  it("renders JobList on /job-list", () => {
    renderRoutes("/job-list");
    expect(screen.getByTestId("job-list")).toBeInTheDocument();
  });

  it("renders CreateJob on /create-job", () => {
    renderRoutes("/create-job");
    expect(screen.getByTestId("create-job")).toBeInTheDocument();
  });

  it("renders Reports on /reports", () => {
    renderRoutes("/reports");
    expect(screen.getByTestId("reports")).toBeInTheDocument();
  });

  it("renders ClaimManagement on /claim-list", () => {
    renderRoutes("/claim-list");
    expect(screen.getByTestId("claim-management")).toBeInTheDocument();
  });

  it("renders NotFound for unknown route", () => {
    renderRoutes("/this-route-does-not-exist");
    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });

  it("renders permission denied for protected route when no permission", () => {
    vi.mocked(useHasPermission).mockReturnValueOnce(false);
    renderRoutes("/job-list");
    expect(screen.getByText(/permission/i)).toBeInTheDocument();
  });
});
