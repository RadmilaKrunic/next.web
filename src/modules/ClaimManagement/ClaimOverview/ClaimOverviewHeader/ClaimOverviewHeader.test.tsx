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

import ClaimOverviewHeader from "./ClaimOverviewHeader";

function renderWithClaim(claimData: unknown) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (claimData) {
    qc.setQueryData(["claim", "C001"], claimData);
  }
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/claims/C001"] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/claims/:claimId",
            element: React.createElement(ClaimOverviewHeader),
          }),
        ),
      ),
    ),
  );
}

describe("ClaimOverviewHeader", () => {
  it("renders nothing when no claim data", () => {
    renderWithClaim(null);
    expect(screen.queryByTestId("overview-header")).not.toBeInTheDocument();
  });

  it("renders OverviewHeader when claim exists in cache", () => {
    const claim = {
      id: "C001",
      claimStatus: "PENDING",
      customer: {
        customerType: "BUSINESS",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "555",
        primaryEmail: "j@d.com",
      },
      job: {
        jobCreationDate: "2023-01-01",
        assigneeName: "Tech1",
        asset: { toolModelName: "Drill", bareToolNumber: "BT1", category: "POWER" },
      },
    };
    renderWithClaim(claim);
    expect(screen.getByTestId("overview-header")).toBeInTheDocument();
    expect(screen.getByText("C001")).toBeInTheDocument();
  });
});
