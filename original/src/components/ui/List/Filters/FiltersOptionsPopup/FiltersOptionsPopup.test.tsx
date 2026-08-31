import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@bosch/react-frok", () => ({
  Icon: ({ title }: { title?: string }) => React.createElement("button", { title }),
  Popover: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "popover" }, children),
}));

import FiltersOptionsPopup from "./FiltersOptionsPopup";

describe("FiltersOptionsPopup", () => {
  it("renders children inside popover", () => {
    render(
      React.createElement(
        FiltersOptionsPopup,
        null,
        React.createElement("div", { "data-testid": "child" }, "Options content"),
      ),
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
