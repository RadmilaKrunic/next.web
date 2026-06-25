import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("../../../routes/Routes", () => ({
  default: () => React.createElement("div", { "data-testid": "app-routes" }, "Routes"),
}));

vi.mock("../Breadcrumbs/Breadcrumbs", () => ({
  default: () => React.createElement("div", { "data-testid": "breadcrumbs" }, "Breadcrumbs"),
}));

vi.mock("../../ui/MessagesList/MessagesList", () => ({
  default: () => React.createElement("div", { "data-testid": "messages-list" }, "Messages"),
}));

import Main from "./Main";

describe("Main", () => {
  it("renders main element", () => {
    render(React.createElement(Main));
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders breadcrumbs", () => {
    render(React.createElement(Main));
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
  });

  it("renders messages list", () => {
    render(React.createElement(Main));
    expect(screen.getByTestId("messages-list")).toBeInTheDocument();
  });

  it("renders app routes", () => {
    render(React.createElement(Main));
    expect(screen.getByTestId("app-routes")).toBeInTheDocument();
  });
});
