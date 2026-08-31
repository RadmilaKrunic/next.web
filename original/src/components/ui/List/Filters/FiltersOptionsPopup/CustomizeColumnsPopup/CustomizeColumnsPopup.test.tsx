import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CustomizeColumnsPopup from "./CustomizeColumnsPopup";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Button: ({
    children,
    onClick,
    label,
    "data-testid": testId,
  }: {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    label?: string;
    "data-testid"?: string;
  }) => React.createElement("button", { onClick, "data-testid": testId }, label ?? children),
  Popover: ({
    trigger,
    children,
    open,
    className,
    onOutsideClick,
  }: {
    trigger: React.ReactNode;
    children: React.ReactNode;
    open: boolean;
    className?: string;
    onOutsideClick?: () => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "popover-root", className },
      trigger,
      React.createElement(
        "button",
        { type: "button", "data-testid": "outside-click", onClick: onOutsideClick },
        "outside",
      ),
      open ? React.createElement("div", { "data-testid": "popover" }, children) : null,
    ),
  Checkbox: ({
    id,
    label,
    checked,
    disabled,
    onChange,
  }: {
    id: string;
    label: string;
    checked?: boolean;
    disabled?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) =>
    React.createElement(
      "label",
      { htmlFor: id },
      React.createElement("input", { id, type: "checkbox", checked, disabled, onChange }),
      label,
    ),
}));

type TestKey = "colA" | "colB" | "colC";
type TestConfig = { key: TestKey; isChecked: boolean; order: number };

type RenderPopupOptions = {
  columnConfig?: TestConfig[];
  setColumnConfig?: (config: TestConfig[]) => void;
  isColumnDisabled?: (columnKey: TestKey, config: TestConfig[]) => boolean;
  getDefaultFixedColumns?: () => TestConfig[];
  saveVisibleColumns?: (config: TestConfig[]) => Promise<void>;
  saveErrorMessage?: string;
  type?: "claims" | "jobs";
  isExportOpen?: boolean;
};

const makeColumnOptions = (
  t: (k: string) => string,
): Record<TestKey, { key: TestKey; label: string }> => ({
  colA: { key: "colA", label: t("Column A") },
  colB: { key: "colB", label: t("Column B") },
  colC: { key: "colC", label: t("Column C") },
});

const baseConfig: TestConfig[] = [
  { key: "colA", isChecked: true, order: 0 },
  { key: "colB", isChecked: false, order: 1 },
  { key: "colC", isChecked: true, order: 2 },
];

function renderPopup({
  columnConfig = baseConfig,
  setColumnConfig = vi.fn(),
  isColumnDisabled = vi.fn(() => false),
  getDefaultFixedColumns = vi.fn(() => [{ key: "colA" as const, isChecked: true, order: 0 }]),
  saveVisibleColumns = vi.fn().mockResolvedValue(undefined),
  saveErrorMessage = "save error",
  type,
  isExportOpen,
}: RenderPopupOptions = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
  return {
    setColumnConfig,
    saveVisibleColumns,
    invalidateQueriesSpy,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CustomizeColumnsPopup<TestKey, TestConfig>
          columnConfig={columnConfig}
          setColumnConfig={setColumnConfig}
          getColumnOptions={makeColumnOptions}
          isColumnDisabled={isColumnDisabled}
          getDefaultFixedColumns={getDefaultFixedColumns}
          saveVisibleColumns={saveVisibleColumns}
          saveErrorMessage={saveErrorMessage}
          type={type}
          isExportOpen={isExportOpen}
        />
      </QueryClientProvider>,
    ),
  };
}

describe("CustomizeColumnsPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial render", () => {
    it("renders trigger button", () => {
      renderPopup();
      expect(screen.getByText("customizeColumns")).toBeInTheDocument();
    });

    it("popover is closed by default", () => {
      renderPopup();
      expect(screen.queryByTestId("popover")).not.toBeInTheDocument();
    });
  });

  describe("open/close behaviour", () => {
    it("opens popover on trigger click", () => {
      renderPopup();
      fireEvent.click(screen.getByText("customizeColumns"));
      expect(screen.getByTestId("popover")).toBeInTheDocument();
    });

    it("shows job list header by default", () => {
      renderPopup();
      fireEvent.click(screen.getByText("customizeColumns"));
      expect(screen.getByText("customizeColumnsPopupHeader")).toBeInTheDocument();
    });

    it("shows claim list header when type is claims", () => {
      renderPopup({ type: "claims" });
      fireEvent.click(screen.getByText("customizeColumns"));
      expect(screen.getByText("customizeColumnsClaimPopupHeader")).toBeInTheDocument();
    });

    it("closes popover on second trigger click", () => {
      renderPopup();
      fireEvent.click(screen.getByText("customizeColumns"));
      fireEvent.click(screen.getByText("customizeColumns"));
      expect(screen.queryByTestId("popover")).not.toBeInTheDocument();
    });

    it("closes popover on outside click", () => {
      renderPopup();
      fireEvent.click(screen.getByText("customizeColumns"));
      expect(screen.getByTestId("popover")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("outside-click"));
      expect(screen.queryByTestId("popover")).not.toBeInTheDocument();
    });

    it("keeps popover container open when isExportOpen is true", () => {
      renderPopup({ isExportOpen: true });
      expect(screen.getByTestId("popover")).toBeInTheDocument();
      expect(screen.getByTestId("popover-root")).toHaveClass("export-open");
    });
  });

  describe("checkboxes", () => {
    it("renders a checkbox for every column config entry", () => {
      renderPopup();
      fireEvent.click(screen.getByText("customizeColumns"));
      expect(screen.getByLabelText("Column A")).toBeInTheDocument();
      expect(screen.getByLabelText("Column B")).toBeInTheDocument();
      expect(screen.getByLabelText("Column C")).toBeInTheDocument();
    });

    it("reflects isChecked state on checkboxes", () => {
      renderPopup();
      fireEvent.click(screen.getByText("customizeColumns"));
      expect(screen.getByLabelText("Column A")).toBeChecked();
      expect(screen.getByLabelText("Column B")).not.toBeChecked();
    });

    it("calls isColumnDisabled for each rendered column", () => {
      const isColumnDisabled = vi.fn(() => false);
      renderPopup({ isColumnDisabled });
      fireEvent.click(screen.getByText("customizeColumns"));
      for (const { key } of baseConfig) {
        expect(isColumnDisabled).toHaveBeenCalledWith(key, expect.anything());
      }
    });

    it("disables checkbox when isColumnDisabled returns true", () => {
      const isColumnDisabled = vi.fn((key: TestKey): boolean => key === "colA");
      renderPopup({ isColumnDisabled });
      fireEvent.click(screen.getByText("customizeColumns"));
      expect(screen.getByLabelText("Column A")).toBeDisabled();
      expect(screen.getByLabelText("Column B")).toBeEnabled();
    });

    it("updates pending state when a checkbox is toggled", () => {
      renderPopup();
      fireEvent.click(screen.getByText("customizeColumns"));
      const checkbox = screen.getByLabelText("Column B");
      fireEvent.change(checkbox, { target: { checked: true } });
      expect(checkbox).toBeChecked();
    });

    it("renders checkboxes in ascending order by order field", () => {
      const shuffledConfig: TestConfig[] = [
        { key: "colC", isChecked: false, order: 2 },
        { key: "colA", isChecked: true, order: 0 },
        { key: "colB", isChecked: true, order: 1 },
      ];
      renderPopup({ columnConfig: shuffledConfig });
      fireEvent.click(screen.getByText("customizeColumns"));
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes[0].id).toBe("colA");
      expect(checkboxes[1].id).toBe("colB");
      expect(checkboxes[2].id).toBe("colC");
    });
  });

  describe("save", () => {
    it("calls saveVisibleColumns and setColumnConfig on save", async () => {
      const saveVisibleColumns = vi.fn().mockResolvedValue(undefined);
      const setColumnConfig = vi.fn();
      renderPopup({ saveVisibleColumns, setColumnConfig });
      fireEvent.click(screen.getByText("customizeColumns"));
      fireEvent.click(screen.getByTestId("save-columns-button"));
      await waitFor(() => expect(saveVisibleColumns).toHaveBeenCalledTimes(1));
      expect(setColumnConfig).toHaveBeenCalledTimes(1);
    });

    it("saves updated pending config after checkbox changes", async () => {
      const saveVisibleColumns = vi.fn().mockResolvedValue(undefined);
      renderPopup({ saveVisibleColumns });

      fireEvent.click(screen.getByText("customizeColumns"));
      fireEvent.click(screen.getByLabelText("Column B"));
      fireEvent.click(screen.getByTestId("save-columns-button"));

      await waitFor(() => expect(saveVisibleColumns).toHaveBeenCalledTimes(1));
      expect(saveVisibleColumns).toHaveBeenCalledWith([
        { key: "colA", isChecked: true, order: 0 },
        { key: "colB", isChecked: true, order: 1 },
        { key: "colC", isChecked: true, order: 2 },
      ]);
    });

    it("invalidates user query after successful save", async () => {
      const { invalidateQueriesSpy } = renderPopup();

      fireEvent.click(screen.getByText("customizeColumns"));
      fireEvent.click(screen.getByTestId("save-columns-button"));

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["user"] });
      });
    });

    it("closes popover after save", async () => {
      renderPopup();
      fireEvent.click(screen.getByText("customizeColumns"));
      fireEvent.click(screen.getByTestId("save-columns-button"));
      await waitFor(() => expect(screen.queryByTestId("popover")).not.toBeInTheDocument());
    });

    it("reverts columnConfig and logs error when save fails", async () => {
      const saveError = new Error("network error");
      const saveVisibleColumns = vi.fn().mockRejectedValue(saveError);
      const setColumnConfig = vi.fn();
      renderPopup({ saveVisibleColumns, setColumnConfig, saveErrorMessage: "save error" });
      fireEvent.click(screen.getByText("customizeColumns"));
      fireEvent.click(screen.getByTestId("save-columns-button"));
      await waitFor(() => expect(setColumnConfig).toHaveBeenCalledTimes(2));
      expect(setColumnConfig.mock.calls[1][0]).toEqual(baseConfig);
      expect(console.error).toHaveBeenCalledWith("save error", saveError);
    });
  });

  describe("reset", () => {
    it("calls getDefaultFixedColumns and resets pending config", () => {
      const defaultConfig: TestConfig[] = [{ key: "colA", isChecked: true, order: 0 }];
      const getDefaultFixedColumns = vi.fn(() => defaultConfig);
      renderPopup({ getDefaultFixedColumns });
      fireEvent.click(screen.getByText("customizeColumns"));
      fireEvent.click(screen.getByTestId("reset-columns-button"));
      expect(getDefaultFixedColumns).toHaveBeenCalledTimes(1);
      expect(screen.queryByLabelText("Column B")).not.toBeInTheDocument();
    });
  });

  describe("prop sync", () => {
    it("syncs pendingConfig when columnConfig prop updates", () => {
      const { rerender } = renderPopup();
      fireEvent.click(screen.getByText("customizeColumns"));

      const updatedConfig: TestConfig[] = [
        { key: "colA", isChecked: false, order: 0 },
        { key: "colB", isChecked: true, order: 1 },
        { key: "colC", isChecked: false, order: 2 },
      ];

      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      rerender(
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(CustomizeColumnsPopup, {
            columnConfig: updatedConfig as never,
            setColumnConfig: vi.fn(),
            getColumnOptions: makeColumnOptions,
            isColumnDisabled: vi.fn(() => false),
            getDefaultFixedColumns: vi.fn(),
            saveVisibleColumns: vi.fn().mockResolvedValue(undefined),
            saveErrorMessage: "save error",
          }),
        ),
      );

      expect(screen.getByLabelText("Column A")).not.toBeChecked();
      expect(screen.getByLabelText("Column B")).toBeChecked();
    });
  });
});
