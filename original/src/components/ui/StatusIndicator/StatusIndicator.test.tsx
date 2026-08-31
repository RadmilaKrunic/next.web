import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import StatusIndicator from "./StatusIndicator";

describe("StatusIndicator", () => {
  it("renders job status text", () => {
    render(React.createElement(StatusIndicator, { status: "DRAFT" }));
    expect(screen.getByText("DRAFT")).toBeInTheDocument();
  });

  it("renders status message when showStatusMessage=true", () => {
    render(React.createElement(StatusIndicator, { status: "COMPLETED", showStatusMessage: true }));
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
  });

  it("renders sparePart type with badge", () => {
    render(React.createElement(StatusIndicator, { status: "APPROVED", type: "sparePart" }));
    expect(screen.getByText("APPROVED")).toBeInTheDocument();
  });

  it("renders claim type", () => {
    render(React.createElement(StatusIndicator, { status: "PENDING", type: "claim" }));
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });
});
