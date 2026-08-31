import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useFormikContext } from "formik";
import { MessagesContext } from "../../../../contexts/messagescontext";

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../../api/axios-client/axiosClient", () => ({
  default: {
    post: postMock,
  },
}));

vi.mock("@bosch/react-frok", () => ({
  Dialog: ({
    title,
    cancelLabel,
    confirmLabel,
    onClose,
    onCancel,
    onConfirm,
    children,
  }: {
    title: string;
    cancelLabel: string;
    confirmLabel: string;
    onClose?: () => void;
    onCancel?: () => void;
    onConfirm?: () => void;
    children: React.ReactNode;
  }) =>
    React.createElement(
      "div",
      null,
      React.createElement("h1", null, title),
      React.createElement("button", { type: "button", onClick: onClose }, "close"),
      React.createElement("button", { type: "button", onClick: onCancel }, cancelLabel),
      React.createElement("button", { type: "button", onClick: onConfirm }, confirmLabel),
      children,
    ),
}));

vi.mock("../../../../components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: { name: string } }) => {
    const { values, setFieldValue, errors, touched } = useFormikContext<Record<string, string>>();
    const fieldName = field.name;

    return React.createElement(
      "div",
      null,
      React.createElement("input", {
        "data-testid": "date-range-input",
        value: values[fieldName] ?? "",
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          void setFieldValue(fieldName, event.target.value);
        },
      }),
      touched[fieldName] && errors[fieldName]
        ? React.createElement("div", null, String(errors[fieldName]))
        : null,
    );
  },
}));

import ClaimListExportDialog from "./ClaimListExportDialog";

describe("ClaimListExportDialog", () => {
  const setIsExportOpen = vi.fn();
  const setMessages = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    if (!("createObjectURL" in URL)) {
      Object.defineProperty(URL, "createObjectURL", {
        writable: true,
        value: vi.fn(() => "blob:mock"),
      });
    }
    if (!("revokeObjectURL" in URL)) {
      Object.defineProperty(URL, "revokeObjectURL", {
        writable: true,
        value: vi.fn(),
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderDialog = () =>
    render(
      React.createElement(
        MessagesContext.Provider,
        { value: { messages: [], setMessages } },
        React.createElement(ClaimListExportDialog, { setIsExportOpen }),
      ),
    );

  it("renders dialog title and actions", () => {
    renderDialog();

    expect(screen.getByText("exportClaims")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "export" })).toBeInTheDocument();
  });

  it("closes dialog on cancel and close actions", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "close" }));

    expect(setIsExportOpen).toHaveBeenCalledTimes(2);
    expect(setIsExportOpen).toHaveBeenNthCalledWith(1, false);
    expect(setIsExportOpen).toHaveBeenNthCalledWith(2, false);
  });

  it("shows validation error and does not export when date range missing", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "export" }));

    expect(await screen.findByText("dateRangeNotSet")).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
    expect(setIsExportOpen).not.toHaveBeenCalled();
  });

  it("exports csv and closes dialog when date range is valid", async () => {
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:claims");
    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    postMock.mockResolvedValue({
      data: new Blob(["csv"], { type: "text/csv" }),
      headers: {
        "content-disposition": 'attachment; filename="claims-export.csv"',
      },
    });

    renderDialog();

    fireEvent.change(screen.getByTestId("date-range-input"), {
      target: { value: "2026-01-01T00:00:00Z,2026-01-31T00:00:00Z" },
    });

    fireEvent.click(screen.getByRole("button", { name: "export" }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        "/v1/claims/csv-export",
        { fromDate: "2026-01-01", toDate: "2026-01-31" },
        {
          responseType: "blob",
          timeout: 120000,
          headers: { Accept: "text/csv" },
        },
      );
    });

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(setIsExportOpen).toHaveBeenCalledWith(false);
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();
  });

  it("adds error message and closes dialog when export request fails", async () => {
    postMock.mockRejectedValue(new Error("export failed"));

    renderDialog();

    fireEvent.change(screen.getByTestId("date-range-input"), {
      target: { value: "2026-01-01T00:00:00Z,2026-01-31T00:00:00Z" },
    });

    fireEvent.click(screen.getByRole("button", { name: "export" }));

    await waitFor(() => {
      expect(setMessages).toHaveBeenCalledTimes(1);
    });

    const updater = setMessages.mock.calls[0][0] as (
      prev: Array<{ type: string; text: string }>,
    ) => Array<{ type: string; text: string }>;

    expect(updater([])).toEqual([{ type: "error", text: "errorExportClaims" }]);
    expect(setIsExportOpen).toHaveBeenCalledWith(false);
  });
});
