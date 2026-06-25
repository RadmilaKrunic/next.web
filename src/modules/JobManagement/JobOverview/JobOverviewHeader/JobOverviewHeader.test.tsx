import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("components/ui/OverviewHeader/OverviewHeader", () => ({
  default: ({ id }: { id: string }) =>
    React.createElement("div", { "data-testid": "overview-header" }, id),
}));

vi.mock("components/ui/OverviewHeader/OverviewHeader.helpers", () => ({
  formatSubtext: (...args: string[]) => args.filter(Boolean).join(" | "),
}));

import JobOverviewHeader from "./JobOverviewHeader";

const mockJobData = {
  order: {
    orderId: "O001",
    ascId: "ASC1",
    customer: {
      customerType: "PRIVATE",
      firstName: "Jane",
      lastName: "Smith",
      phoneNumber: "123",
      primaryEmail: "jane@example.com",
    },
  },
  job: {
    jobId: "J001",
    orderId: "O001",
    assigneeID: "A1",
    assigneeName: "Tech1",
    ascId: "ASC1",
    internalReferenceNumber: "REF1",
    jobStatus: "DRAFT",
    jobCreationDate: "2024-01-15",
    isOnHold: false,
    pendingApprovals: [],
    asset: {
      brand: "Bosch",
      bareToolNumber: "BT1",
      serialNumber: "S1",
      toolModelName: "Drill X",
      manufacturedDate: "2023-01-01",
      category: "POWER",
      categoryId: "C1",
      purchaseDate: "2023-06-01",
      customerDescriptionOfFailure: "Not working",
      invoiceNumber: "INV1",
      hasAccessories: false,
      isBareTool: false,
      accessories: [],
      customerWish: { action: "REPAIR" } as never,
      attachments: [],
    },
  },
};

function renderWithJob(jobData: unknown) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (jobData) {
    qc.setQueryData(["job", "J001"], jobData);
  }
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/job-overview/J001"] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/job-overview/:jobId",
            element: React.createElement(JobOverviewHeader),
          }),
        ),
      ),
    ),
  );
}

describe("JobOverviewHeader", () => {
  it("renders nothing when no job data in cache", () => {
    renderWithJob(null);
    expect(screen.queryByTestId("overview-header")).not.toBeInTheDocument();
  });

  it("renders OverviewHeader when job data is in cache", () => {
    renderWithJob(mockJobData);
    expect(screen.getByTestId("overview-header")).toBeInTheDocument();
  });

  it("passes job ID to OverviewHeader", () => {
    renderWithJob(mockJobData);
    expect(screen.getByText("J001")).toBeInTheDocument();
  });

  it("renders for BUSINESS customer type", () => {
    const businessJob = {
      ...mockJobData,
      order: {
        ...mockJobData.order,
        customer: { ...mockJobData.order.customer, customerType: "BUSINESS" },
      },
    };
    renderWithJob(businessJob);
    expect(screen.getByTestId("overview-header")).toBeInTheDocument();
  });

  it("renders for unknown customer type without crashing", () => {
    const unknownJob = {
      ...mockJobData,
      order: {
        ...mockJobData.order,
        customer: { ...mockJobData.order.customer, customerType: "UNKNOWN_TYPE" },
      },
    };
    renderWithJob(unknownJob);
    expect(screen.getByTestId("overview-header")).toBeInTheDocument();
  });
});
