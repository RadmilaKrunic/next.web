import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Formik } from "formik";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  RadioButton: ({
    label,
    value,
    onChange,
    checked,
    name,
    id,
    disabled,
  }: {
    label: string;
    value: string | number;
    onChange: () => void;
    checked?: boolean;
    name?: string;
    id?: string;
    disabled?: boolean;
  }) => (
    <label>
      <input
        type="radio"
        name={name}
        id={id}
        value={String(value)}
        onChange={onChange}
        checked={checked}
        disabled={disabled}
        data-testid={`radio-${String(value)}`}
      />
      {label}
    </label>
  ),
}));

import RadioGroup from "./RadioGroup";

const radioButtons = [
  { value: "yes", label: "labelYes" },
  { value: "no", label: "labelNo" },
];

function renderRadioGroup(
  initialValues: Record<string, unknown> = { myField: undefined },
  props: Partial<React.ComponentProps<typeof RadioGroup>> = {},
) {
  return render(
    <Formik initialValues={initialValues} onSubmit={vi.fn()}>
      <RadioGroup name="myField" radioButtons={radioButtons} direction="row" {...props} />
    </Formik>,
  );
}

describe("RadioGroup", () => {
  it("renders all radio buttons", () => {
    renderRadioGroup();
    expect(screen.getByTestId("radio-yes")).toBeInTheDocument();
    expect(screen.getByTestId("radio-no")).toBeInTheDocument();
  });

  it("renders fieldset with correct data-testid", () => {
    renderRadioGroup();
    expect(screen.getByTestId("radio-group-myField")).toBeInTheDocument();
  });

  it("renders with row direction class", () => {
    renderRadioGroup();
    expect(screen.getByTestId("radio-group-myField")).toHaveClass("--row");
  });

  it("renders with column direction class", () => {
    renderRadioGroup({}, { direction: "column" });
    expect(screen.getByTestId("radio-group-myField")).toHaveClass("--column");
  });

  it("renders disabled fieldset when disabled", () => {
    renderRadioGroup({}, { disabled: true });
    expect(screen.getByTestId("radio-group-myField")).toBeDisabled();
  });

  it("calls onChange when radio button is selected", () => {
    const onChange = vi.fn();
    renderRadioGroup({ myField: "yes" }, { onChange });
    fireEvent.click(screen.getByTestId("radio-no"));
    expect(onChange).toHaveBeenCalledWith("no");
  });

  it("marks selected radio button as checked", () => {
    renderRadioGroup({ myField: "yes" });
    expect(screen.getByTestId("radio-yes")).toBeChecked();
    expect(screen.getByTestId("radio-no")).not.toBeChecked();
  });

  it("renders translated labels", () => {
    renderRadioGroup();
    expect(screen.getByText("labelYes")).toBeInTheDocument();
    expect(screen.getByText("labelNo")).toBeInTheDocument();
  });
});
