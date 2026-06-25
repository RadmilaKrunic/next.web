import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName }: { iconName: string }) => React.createElement("span", null, iconName),
}));

import ClaimAction from "./ClaimAction";

describe("ClaimAction", () => {
  it("renders button with action name", () => {
    render(
      React.createElement(ClaimAction, {
        iconName: "document",
        actionName: "documents",
        claimId: "C001",
      }),
    );
    expect(screen.getByText("documents")).toBeInTheDocument();
  });

  it("calls onClick when clicked and not disabled", () => {
    const onClick = vi.fn();
    render(
      React.createElement(ClaimAction, {
        iconName: "document",
        actionName: "documents",
        onClick,
        claimId: "C001",
      }),
    );
    fireEvent.click(screen.getByTestId("claim-action-documents-C001"));
    expect(onClick).toHaveBeenCalled();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      React.createElement(ClaimAction, {
        iconName: "document",
        actionName: "documents",
        onClick,
        disabled: true,
        claimId: "C001",
      }),
    );
    const btn = screen.getByTestId("claim-action-documents-C001");
    expect(btn).toBeDisabled();
  });
});
