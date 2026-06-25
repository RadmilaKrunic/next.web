import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ApprovalDecisionModal from "./ApprovalDecisionModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../../../hooks/useClickOutside", () => ({
  useClickOutside: vi.fn(),
}));

vi.mock("@bosch/react-frok", () => ({
  Dialog: ({
    open,
    title,
    children,
    "data-testid": dataTestid,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    "data-testid"?: string;
  }) =>
    open ? (
      <div data-testid={dataTestid}>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  TextArea: ({
    value,
    onChange,
    label,
    "data-testid": dataTestid,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    label: string;
    "data-testid"?: string;
  }) => (
    <label>
      {label}
      <textarea data-testid={dataTestid} value={value} onChange={onChange} />
    </label>
  ),
  Button: ({
    onClick,
    disabled,
    children,
    "data-testid": dataTestid,
  }: {
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    "data-testid"?: string;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={dataTestid}>
      {children}
    </button>
  ),
}));

describe("ApprovalDecisionModal", () => {
  it("requires comments for rejected decision", () => {
    render(
      <ApprovalDecisionModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Reject"
        decisionType="rejected"
        jobId="J-1"
      />,
    );

    expect(screen.getByTestId("confirm-button")).toBeDisabled();
    fireEvent.change(screen.getByTestId("approval-comments-rejected"), {
      target: { value: "Needs correction" },
    });
    expect(screen.getByTestId("confirm-button")).toBeEnabled();
  });

  it("confirms and closes modal", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <ApprovalDecisionModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Approve"
        decisionType="approved"
        jobId="J-2"
      />,
    );

    fireEvent.change(screen.getByTestId("approval-comments-approved"), {
      target: { value: "Looks good" },
    });
    fireEvent.click(screen.getByTestId("confirm-button"));

    expect(onConfirm).toHaveBeenCalledWith("Looks good");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cancels and closes modal", () => {
    const onClose = vi.fn();

    render(
      <ApprovalDecisionModal
        isOpen
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Revise"
        decisionType="revised"
        jobId="J-3"
      />,
    );

    fireEvent.change(screen.getByTestId("approval-comments-revised"), {
      target: { value: "Add serial" },
    });
    fireEvent.click(screen.getByTestId("cancel-button"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect((screen.getByTestId("approval-comments-revised") as HTMLTextAreaElement).value).toBe("");
  });
});
