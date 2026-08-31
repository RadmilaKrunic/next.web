import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@bosch/react-frok", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement("button", { onClick }, children),
  Popover: ({ children, trigger }: { children: React.ReactNode; trigger: React.ReactNode }) =>
    React.createElement("div", null, trigger, children),
}));

import ExportApprovalListPopup from "./ExportApprovalListPopup";

describe("ExportApprovalListPopup", () => {
  it("renders export trigger button", () => {
    render(React.createElement(ExportApprovalListPopup));
    expect(screen.getByText("exportJobList")).toBeInTheDocument();
  });

  it("renders xlsx and csv export options", () => {
    render(React.createElement(ExportApprovalListPopup));
    expect(screen.getByText("exportAsXslx")).toBeInTheDocument();
    expect(screen.getByText("exportAsCsv")).toBeInTheDocument();
  });
});
