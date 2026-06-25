import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

import Reimbursement from "./Reimbursement";

describe("Reimbursement", () => {
  it("renders heading", () => {
    render(
      <MemoryRouter>
        <Reimbursement />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });
});
