import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "data-testid"?: string;
  }) => React.createElement("button", { onClick, disabled, "data-testid": testId }, children),
  Dialog: ({
    children,
    open,
    title,
    onClose,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    open?: boolean;
    title?: string;
    onClose?: (e: Event) => void;
    "data-testid"?: string;
    ref?: React.Ref<HTMLDialogElement>;
  }) =>
    open
      ? React.createElement(
          "dialog",
          {
            "data-testid": testId,
            onClick: (e: React.MouseEvent) => {
              const syntheticEvent = e as unknown as Event;
              onClose?.(syntheticEvent);
            },
          },
          React.createElement("div", { "data-testid": "dialog-title" }, title),
          children,
        )
      : null,
  RadioButton: ({
    id,
    value,
    label,
    checked,
    onChange,
    "data-testid": testId,
  }: {
    id: string;
    value: string;
    label: string;
    checked?: boolean;
    onChange?: () => void;
    "data-testid"?: string;
  }) =>
    React.createElement(
      "label",
      { htmlFor: id },
      React.createElement("input", {
        id,
        type: "radio",
        value,
        checked,
        onChange,
        "data-testid": testId,
      }),
      label,
    ),
}));

vi.mock("hooks/useClickOutside", () => ({
  useClickOutside: vi.fn(),
}));

import AnswerModal from "./AnswerModal";

const defaultOptions = [
  { value: "yes", label: "yes" },
  { value: "no", label: "no" },
];

describe("AnswerModal", () => {
  it("renders nothing when isOpen is false", () => {
    render(
      React.createElement(AnswerModal, {
        isOpen: false,
        onClose: vi.fn(),
        onSave: vi.fn(),
        options: defaultOptions,
      }),
    );
    expect(screen.queryByTestId("answers-modal")).not.toBeInTheDocument();
  });

  it("renders dialog when isOpen is true", () => {
    render(
      React.createElement(AnswerModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSave: vi.fn(),
        title: "Question?",
        options: defaultOptions,
      }),
    );
    expect(screen.getByTestId("answers-modal")).toBeInTheDocument();
  });

  it("renders the title", () => {
    render(
      React.createElement(AnswerModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSave: vi.fn(),
        title: "My Question",
        options: defaultOptions,
      }),
    );
    expect(screen.getByTestId("dialog-title")).toHaveTextContent("My Question");
  });

  it("renders all radio options", () => {
    render(
      React.createElement(AnswerModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSave: vi.fn(),
        options: defaultOptions,
      }),
    );
    expect(screen.getByTestId("answer-option-yes")).toBeInTheDocument();
    expect(screen.getByTestId("answer-option-no")).toBeInTheDocument();
  });

  it("save button is disabled when no option selected", () => {
    render(
      React.createElement(AnswerModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSave: vi.fn(),
        options: defaultOptions,
      }),
    );
    const saveBtn = screen.getByTestId("save-button");
    expect(saveBtn).toBeDisabled();
  });

  it("save button is enabled after selecting an option", () => {
    render(
      React.createElement(AnswerModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSave: vi.fn(),
        options: defaultOptions,
      }),
    );
    fireEvent.click(screen.getByTestId("answer-option-yes"));
    const saveBtn = screen.getByTestId("save-button");
    expect(saveBtn).toBeEnabled();
  });

  it("calls onSave with selected value when save is clicked", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      React.createElement(AnswerModal, {
        isOpen: true,
        onClose,
        onSave,
        options: defaultOptions,
      }),
    );
    fireEvent.click(screen.getByTestId("answer-option-yes"));
    fireEvent.click(screen.getByTestId("save-button"));
    expect(onSave).toHaveBeenCalledWith("yes");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      React.createElement(AnswerModal, {
        isOpen: true,
        onClose,
        onSave: vi.fn(),
        options: defaultOptions,
      }),
    );
    fireEvent.click(screen.getByTestId("cancel-button"));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onSave when save is clicked with no option selected", () => {
    const onSave = vi.fn();
    render(
      React.createElement(AnswerModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSave,
        options: defaultOptions,
      }),
    );
    fireEvent.click(screen.getByTestId("save-button"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("renders without options (no crash)", () => {
    render(
      React.createElement(AnswerModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSave: vi.fn(),
      }),
    );
    expect(screen.getByTestId("answers-modal")).toBeInTheDocument();
  });

  it("renders subtitle text", () => {
    render(
      React.createElement(AnswerModal, {
        isOpen: true,
        onClose: vi.fn(),
        onSave: vi.fn(),
        options: defaultOptions,
      }),
    );
    expect(screen.getByText("pleaseSelectOneOfOfferedAnswers")).toBeInTheDocument();
  });
});
