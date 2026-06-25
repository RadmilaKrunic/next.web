import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));
vi.mock("./ClaimList/ClaimList", () => ({
  default: () => React.createElement("div", { "data-testid": "claim-list" }),
}));

import ClaimManagement from "./ClaimManagement";

describe("ClaimManagement", () => {
  it("renders ClaimList", () => {
    render(React.createElement(ClaimManagement));
    expect(screen.getByTestId("claim-list")).toBeInTheDocument();
  });
});
