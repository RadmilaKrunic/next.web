import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ reimbursementId: "reimb-1" }),
}));

vi.mock("hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("api/services/reimbursements/hooks", () => ({
  useReimbursementClaims: vi.fn(),
}));

vi.mock("@/hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(() => true),
}));

vi.mock("@bosch/react-frok", async () => {
  const actual = await vi.importActual<object>("@bosch/react-frok");
  return {
    ...actual,
    ActivityIndicator: () => <div data-testid="activity-indicator" />,
  };
});

vi.mock("@/modules/ClaimManagement/ClaimList/ClaimList.utils", () => ({
  getClaimNavigationPath: (claimId: string) => `/claim/${claimId}`,
}));

import ReimbursementClaimsList from "./ReimbursementClaimsList";
import { useReimbursementClaims } from "api/services/reimbursements/hooks";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useBreadcrumbs } from "hooks/useBreadcrumbs";

const mockUseReimbursementClaims = vi.mocked(useReimbursementClaims);
const mockUseHasPermission = vi.mocked(useHasPermission);
const mockUseBreadcrumbs = vi.mocked(useBreadcrumbs);

const buildClaim = (id: string) => ({
  claimId: id,
  created: "2026-01-01",
  assetName: "Drill",
  bareToolNumber: "BT-1",
  actionType: "REPAIR",
  jobType: "WARRANTY",
  createdOn: "2026-01-01T00:00:00Z",
  creditNoteAmount: 10,
});

describe("ReimbursementClaimsList", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseBreadcrumbs.mockClear();
    sessionStorage.clear();
    mockUseHasPermission.mockReturnValue(true);
    mockUseReimbursementClaims.mockReturnValue({
      data: {
        ascId: "asc-1",
        ascName: "ASC Name",
        customerCode: "CUST-1",
        claims: [buildClaim("c1"), buildClaim("c2")],
      },
      isLoading: false,
    } as any);
  });

  it("shows loading indicator while data is loading", () => {
    mockUseReimbursementClaims.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(
      <MemoryRouter>
        <ReimbursementClaimsList />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("activity-indicator")).toBeInTheDocument();
  });

  it("renders claims rows from data", () => {
    render(
      <MemoryRouter>
        <ReimbursementClaimsList />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("c1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("c2").length).toBeGreaterThan(0);
  });

  it("navigates to claim detail when a row is clicked", () => {
    render(
      <MemoryRouter>
        <ReimbursementClaimsList />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByText("c1")[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/claim/c1");
  });

  it("renders ascName and customerCode in header", () => {
    render(
      <MemoryRouter>
        <ReimbursementClaimsList />
      </MemoryRouter>,
    );

    expect(screen.getByText(/ascName: ASC Name/)).toBeInTheDocument();
    expect(screen.getByText(/customerCode: CUST-1/)).toBeInTheDocument();
  });

  it("omits ASCs breadcrumb when user lacks permission", () => {
    mockUseHasPermission.mockReturnValue(false);

    render(
      <MemoryRouter>
        <ReimbursementClaimsList />
      </MemoryRouter>,
    );

    expect(screen.getByText(/reimbursementId: reimb-1/)).toBeInTheDocument();
  });

  it("passes ascName in reimbursement detail breadcrumb href", () => {
    render(
      <MemoryRouter>
        <ReimbursementClaimsList />
      </MemoryRouter>,
    );

    expect(mockUseBreadcrumbs).toHaveBeenCalled();
    const breadcrumbs = mockUseBreadcrumbs.mock.calls[0][0] as Array<{
      label: string;
      href: string;
    }>;
    expect(breadcrumbs[1].href).toContain("ascName=ASC%20Name");
  });
});
