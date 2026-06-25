import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@bosch/react-frok", () => ({
  Badge: ({ label }: { label: string }) => React.createElement("span", null, label),
}));

import NotesLegend from "./NotesLegend";

describe("NotesLegend", () => {
  it("renders jobNote and claimNote labels", () => {
    render(React.createElement(NotesLegend));
    expect(screen.getByText("jobNote")).toBeInTheDocument();
    expect(screen.getByText("claimNote")).toBeInTheDocument();
  });
});
