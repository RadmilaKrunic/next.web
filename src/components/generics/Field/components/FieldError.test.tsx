import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Formik, Form } from "formik";
import FieldError from "./FieldError";

const renderWithFormikError = (errorValue: string) => {
  return render(
    <Formik
      initialValues={{ testField: "" }}
      initialErrors={{ testField: errorValue }}
      initialTouched={{ testField: true }}
      onSubmit={() => {}}
    >
      <Form>
        <FieldError name="testField" />
      </Form>
    </Formik>,
  );
};

describe("FieldError", () => {
  it("renders plain error message as-is", () => {
    renderWithFormikError("Required field");

    expect(screen.getByText("Required field")).toBeInTheDocument();
    expect(screen.getByTitle("Required field")).toBeInTheDocument();
  });

  it("normalizes JSON array message into dotted sentence", () => {
    renderWithFormikError('["Line one","Line two"]');

    expect(screen.getByText("Line one. Line two")).toBeInTheDocument();
    expect(screen.getByTitle("Line one. Line two")).toBeInTheDocument();
  });

  it("returns Error for malformed JSON arrays", () => {
    renderWithFormikError("[bad-json");

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByTitle("Error")).toBeInTheDocument();
  });

  it("keeps original string when JSON starts with [ but is not array", () => {
    renderWithFormikError('{"a":1}');

    expect(screen.getByText('{"a":1}')).toBeInTheDocument();
    expect(screen.getByTitle('{"a":1}')).toBeInTheDocument();
  });
});
