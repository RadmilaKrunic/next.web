import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Formik } from "formik";

const mockGetQueryData = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Chip: ({
    label,
    onClose,
    chipLabelId,
  }: {
    label: string;
    onClose?: (e: React.MouseEvent<HTMLElement>) => void;
    chipLabelId?: string;
  }) =>
    React.createElement(
      "button",
      {
        "data-testid": chipLabelId,
        onClick: (e: React.MouseEvent<HTMLElement>) => onClose?.(e),
      },
      label,
    ),
}));

vi.mock("components/ui/DatePicker/hooks/DatePicker.utils", () => ({
  formatFormikDateValue: () => "01.01.2024",
  getLocale: () => undefined,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    getQueryData: mockGetQueryData,
  }),
}));

import FiltersChips from "./FiltersChips";
import Section from "components/generics/Section/GenericSection.types";

const mockSection: Section = {
  name: "filters",
  label: "",
  areas: [
    {
      name: "area1",
      label: "",
      position: 0,
      fields: [
        {
          name: "status",
          label: "Status",
          type: "dropdown",
          options: [
            { value: "OPEN", name: "open" },
            { value: "CLOSED", name: "closed" },
          ],
        },
        {
          name: "ascName",
          label: "ASC",
          type: "dropdown",
          optionsEndpoint: {
            url: "/asc",
            queryParams: {},
          },
        },
        { name: "noOptions", label: "No options", type: "text", options: undefined },
      ],
    },
  ],
} as unknown as Section;

function renderChips(values: Record<string, unknown>, filters?: Section) {
  return render(
    React.createElement(
      Formik,
      { initialValues: values, onSubmit: vi.fn() },
      React.createElement(FiltersChips, { filters }),
    ),
  );
}

describe("FiltersChips", () => {
  it("renders nothing when all values are empty strings", () => {
    renderChips({ status: "" }, mockSection);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("renders chip for non-empty string value", () => {
    renderChips({ status: "OPEN" }, mockSection);
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("renders chips for array value", () => {
    renderChips({ status: ["OPEN", "CLOSED"] }, mockSection);
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("closed")).toBeInTheDocument();
  });

  it("skips unassigned key", () => {
    renderChips({ unassigned: "true" }, mockSection);
    expect(screen.queryByText("true")).not.toBeInTheDocument();
  });

  it("skips readyForDiagnostic key", () => {
    renderChips({ readyForDiagnostic: "yes" }, mockSection);
    expect(screen.queryByText("yes")).not.toBeInTheDocument();
  });

  it("skips null value", () => {
    renderChips({ status: null as unknown as string }, mockSection);
    expect(screen.queryByTestId("status-chip")).not.toBeInTheDocument();
  });

  it("renders date chip with 'created:' prefix for createdAt key", () => {
    renderChips({ createdAt: "2024-01-01" }, mockSection);
    expect(screen.getByText("created: 01.01.2024")).toBeInTheDocument();
  });

  it("renders date chip with 'modified:' prefix for updatedAt key", () => {
    renderChips({ updatedAt: "2024-01-01" }, mockSection);
    expect(screen.getByText("modified: 01.01.2024")).toBeInTheDocument();
  });

  it("renders date chip with 'created:' prefix for createdOn key", () => {
    renderChips({ createdOn: "2024-01-01" }, mockSection);
    expect(screen.getByText("created: 01.01.2024")).toBeInTheDocument();
  });

  it("closing a scalar chip calls setFieldValue with empty string", async () => {
    renderChips({ status: "OPEN" }, mockSection);
    const chip = screen.getByTestId("status-chip");
    fireEvent.click(chip);
    expect(screen.queryByTestId("status-chip")).not.toBeInTheDocument();
  });

  it("closing an array chip removes that item", () => {
    renderChips({ status: ["OPEN", "CLOSED"] }, mockSection);
    const chip = screen.getByTestId("status-OPEN-chip");
    fireEvent.click(chip);
    expect(screen.queryByTestId("status-OPEN-chip")).not.toBeInTheDocument();
    expect(screen.getByTestId("status-CLOSED-chip")).toBeInTheDocument();
  });

  it("renders without filters prop (no crash)", () => {
    renderChips({ status: "OPEN" });
    expect(screen.getByText("OPEN")).toBeInTheDocument();
  });

  it("falls back to value as label when no option match", () => {
    renderChips({ noOptions: "someValue" }, mockSection);
    expect(screen.getByText("someValue")).toBeInTheDocument();
  });
  it("renders ascName from query cache", () => {
    mockGetQueryData.mockReturnValue([
      {
        ascId: "123",
        name: "ASC Stuttgart",
      },
    ]);
    renderChips({ ascName: "123" }, mockSection);
    expect(screen.getByText("ASC Stuttgart")).toBeInTheDocument();
  });

  it("falls back to ascName value when not found", () => {
    mockGetQueryData.mockReturnValue([]);
    renderChips({ ascName: "123" }, mockSection);
    expect(screen.getByText("123")).toBeInTheDocument();
  });
});
