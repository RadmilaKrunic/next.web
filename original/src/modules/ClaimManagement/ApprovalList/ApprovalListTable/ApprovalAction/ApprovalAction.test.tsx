import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import ApprovalAction from "./ApprovalAction";

describe("ApprovalAction", () => {
  it("renders button with translated action name", () => {
    render(
      React.createElement(ApprovalAction, {
        iconName: "approve",
        actionName: "approve",
        jobId: "J001",
      }),
    );
    expect(screen.getByText("approve")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      React.createElement(ApprovalAction, {
        iconName: "reject",
        actionName: "reject",
        onClick,
        jobId: "J001",
      }),
    );
    fireEvent.click(screen.getByTestId("approval-action-reject-J001"));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders with correct data-testid", () => {
    render(
      React.createElement(ApprovalAction, {
        iconName: "approve",
        actionName: "approve",
        jobId: "J002",
      }),
    );
    expect(screen.getByTestId("approval-action-approve-J002")).toBeInTheDocument();
  });
});
