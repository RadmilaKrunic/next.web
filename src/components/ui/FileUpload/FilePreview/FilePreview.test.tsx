import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FilePreview from "./FilePreview";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: () => <div>loading-indicator</div>,
  Dropdown: ({
    value,
    options,
    onChange,
    label,
  }: {
    value: string;
    options: Array<{ name: string; value: string }>;
    onChange: (event: { target: { value: string } }) => void;
    label?: string;
  }) => (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange({ target: { value: e.target.value } })}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  ),
  Button: ({
    onClick,
    disabled,
    label,
    children,
  }: {
    onClick?: () => void;
    disabled?: boolean;
    label?: string;
    children?: React.ReactNode;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {label || children}
    </button>
  ),
}));

vi.mock("components/ui/DocumentFile/DocumentFile", () => ({
  default: ({
    name,
    removeFile,
    dataTestid,
  }: {
    name: string;
    removeFile: () => void;
    dataTestid: string;
  }) => (
    <div>
      <span>{name}</span>
      <button type="button" onClick={removeFile} data-testid={`remove-${dataTestid}`}>
        remove
      </button>
    </div>
  ),
}));

describe("FilePreview", () => {
  const fileTypeOptions = [
    { name: "invoice", value: "invoice" },
    { name: "warranty", value: "warranty" },
  ];

  const files = [
    new File(["a"], "first.pdf", { type: "application/pdf" }),
    new File(["b"], "second.jpg", { type: "image/jpeg" }),
  ];

  it("renders file rows and translated file type options", () => {
    render(
      <FilePreview
        files={files}
        onClose={vi.fn()}
        onSave={vi.fn()}
        fileTypeOptions={fileTypeOptions}
      />,
    );

    expect(screen.getByText("first.pdf")).toBeInTheDocument();
    expect(screen.getByText("second.jpg")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getAllByRole("option", { name: "invoice" }).length).toBeGreaterThan(0);
  });

  it("updates selected file type for a row", () => {
    render(
      <FilePreview
        files={files}
        onClose={vi.fn()}
        onSave={vi.fn()}
        fileTypeOptions={fileTypeOptions}
      />,
    );

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "warranty" } });

    expect((selects[0] as HTMLSelectElement).value).toBe("warranty");
  });

  it("calls onSave with current file/type mapping", () => {
    const onSave = vi.fn();

    render(
      <FilePreview
        files={files}
        onClose={vi.fn()}
        onSave={onSave}
        fileTypeOptions={fileTypeOptions}
      />,
    );

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "warranty" } });

    fireEvent.click(screen.getByRole("button", { name: "save" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      files: [
        { file: files[0], fileType: "warranty" },
        { file: files[1], fileType: "invoice" },
      ],
    });
  });

  it("removes row and closes when last file is deleted", () => {
    const onClose = vi.fn();

    render(
      <FilePreview
        files={[new File(["z"], "single.pdf", { type: "application/pdf" })]}
        onClose={onClose}
        onSave={vi.fn()}
        fileTypeOptions={fileTypeOptions}
      />,
    );

    fireEvent.click(screen.getByTestId("remove-0"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows loader and disables actions while loading", () => {
    render(
      <FilePreview
        files={files}
        onClose={vi.fn()}
        onSave={vi.fn()}
        fileTypeOptions={fileTypeOptions}
        isLoading
      />,
    );

    expect(screen.getByText("loading-indicator")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled();
  });
});
