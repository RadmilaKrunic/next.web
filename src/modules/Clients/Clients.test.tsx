import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("./ClientsList/ClientsList", () => ({
  default: () => <h1>clients list</h1>,
}));

import Clients from "./Clients";

describe("Clients", () => {
  it("renders ClientsList", () => {
    render(
      <MemoryRouter>
        <Clients />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading")).toBeInTheDocument(); // iz mocka
  });
});
