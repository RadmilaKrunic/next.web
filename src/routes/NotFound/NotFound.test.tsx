import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import NotFound from "./NotFound";

describe("NotFound", () => {
  it("renders not found text", () => {
    render(<NotFound />);
    expect(screen.getByText("notFound")).toBeInTheDocument();
  });
});
