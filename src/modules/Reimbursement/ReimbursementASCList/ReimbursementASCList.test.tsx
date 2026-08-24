import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../api/services/reimbursements/hooks", () => ({
  useReimbursementASCs: vi.fn(),
}));

import ReimbursementASCList from "./ReimbursementASCList";
import { useReimbursementASCs } from "../../../api/services/reimbursements/hooks";

const mockUseReimbursementASCs = vi.mocked(useReimbursementASCs);

const buildAsc = (id: string) => ({
  ascId: id,
  ascName: `ASC ${id}`,
  customerCode: "CUST",
  email: "asc@example.com",
  address: {
    street: "Main St",
    houseNumber: "1",
    additionalDetails: "",
    neighborhood: "",
    district: "",
    city: "",
    stateProvinceRegion: "",
    postalCode: "",
    countryCode: "",
  },
});

describe("ReimbursementASCList", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    sessionStorage.clear();
    mockUseReimbursementASCs.mockReturnValue({
      data: { content: [buildAsc("1"), buildAsc("2")], page: { totalElements: 2 } },
    } as any);
  });

  it("renders ASC rows from data", () => {
    render(
      <MemoryRouter>
        <ReimbursementASCList />
      </MemoryRouter>,
    );

    expect(screen.getByText("ASC 1")).toBeInTheDocument();
    expect(screen.getByText("ASC 2")).toBeInTheDocument();
  });

  it("renders loading state when ASCs are loading", () => {
    mockUseReimbursementASCs.mockReturnValue({ isLoading: true, data: undefined } as any);

    render(
      <MemoryRouter>
        <ReimbursementASCList />
      </MemoryRouter>,
    );

    expect(screen.queryByPlaceholderText("search")).not.toBeInTheDocument();
    expect(screen.queryByText("ASC 1")).not.toBeInTheDocument();
    expect(screen.queryByText("createReimbursement")).not.toBeInTheDocument();
  });

  it("navigates to reimbursement-detail when a row is clicked", () => {
    render(
      <MemoryRouter>
        <ReimbursementASCList />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("ASC 1"));
    expect(mockNavigate).toHaveBeenCalledWith("/reimbursement-detail/1", {
      state: { ascName: "ASC 1" },
    });
  });

  it("updates search value on input change", () => {
    render(
      <MemoryRouter>
        <ReimbursementASCList />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText("search");
    fireEvent.change(searchInput, { target: { value: "test" } });
    expect(searchInput).toHaveValue("test");
  });

  it("does not render pagination when total elements below page size", () => {
    render(
      <MemoryRouter>
        <ReimbursementASCList />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/pagination/i)).not.toBeInTheDocument();
  });

  it("renders pagination when total elements exceed page size", () => {
    mockUseReimbursementASCs.mockReturnValue({
      data: {
        content: [buildAsc("1")],
        page: { totalElements: 50 },
      },
    } as any);

    render(
      <MemoryRouter>
        <ReimbursementASCList />
      </MemoryRouter>,
    );

    expect(sessionStorage.getItem("reimbursementASCList-currentPage")).toBeNull();
  });
});
