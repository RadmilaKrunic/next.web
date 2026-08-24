import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getInitialFieldValues,
  formatDateDMY,
  convertDMYToISO,
  filterReimbursements,
  getBreadcrumbsList,
  handleGenerateReceipt,
} from "./Reimbursement.utils";

vi.mock("../../api/services/reimbursements/action", () => ({
  getReimbursementReceipt: vi.fn(),
}));

import { getReimbursementReceipt } from "../../api/services/reimbursements/action";

const t = (key: string) => key;

describe("getInitialFieldValues", () => {
  it("returns an object with each field set to empty string", () => {
    expect(getInitialFieldValues(["a", "b"])).toEqual({ a: "", b: "" });
  });

  it("returns an empty object for empty array", () => {
    expect(getInitialFieldValues([])).toEqual({});
  });
});

describe("formatDateDMY", () => {
  it("formats date as dd.MM.yyyy with zero padding", () => {
    expect(formatDateDMY(new Date(2026, 0, 5))).toBe("05.01.2026");
  });

  it("formats date without padding needed", () => {
    expect(formatDateDMY(new Date(2026, 11, 25))).toBe("25.12.2026");
  });
});

describe("convertDMYToISO", () => {
  it("converts dd.MM.yyyy to ISO string", () => {
    const iso = convertDMYToISO("05.01.2026");
    const date = new Date(iso);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(5);
  });
});

describe("filterReimbursements", () => {
  const items = [
    { reimbursementId: "R1", ascName: "Bosch ASC", status: "APPROVED" },
    { reimbursementId: "R2", ascName: "Other ASC", status: "PENDING" },
  ];

  it("returns all items when search value is empty", () => {
    expect(filterReimbursements(items, "")).toEqual(items);
  });

  it("returns all items when search value is whitespace", () => {
    expect(filterReimbursements(items, "   ")).toEqual(items);
  });

  it("filters by reimbursementId case-insensitively", () => {
    expect(filterReimbursements(items, "r1")).toEqual([items[0]]);
  });

  it("filters by ascName", () => {
    expect(filterReimbursements(items, "other")).toEqual([items[1]]);
  });

  it("filters by status", () => {
    expect(filterReimbursements(items, "pending")).toEqual([items[1]]);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterReimbursements(items, "nomatch")).toEqual([]);
  });
});

describe("getBreadcrumbsList", () => {
  it("returns base breadcrumb with ascList label for Reimbursement page default path", () => {
    const result = getBreadcrumbsList("Reimbursement", t);
    expect(result).toEqual([
      { label: "reimbursement", href: "/ascs" },
      { label: "ascList", href: "#" },
    ]);
  });

  it("returns reimbursementList label when path is not ascList", () => {
    const result = getBreadcrumbsList("Reimbursement", t, "reimbursementList");
    expect(result[1]).toEqual({ label: "reimbursementList", href: "#" });
  });

  it("includes ascList breadcrumb for ReimbursementDetail when user has permission", () => {
    const result = getBreadcrumbsList("ReimbursementDetail", t, "ascList", true);
    expect(result).toEqual([
      { label: "reimbursement", href: "/ascs" },
      { label: "ascList", href: "/ascs" },
      { label: "reimbursementDetail", href: "#" },
      { label: "ascList", href: "/ascs" },
      { label: "reimbursementDetail", href: "#" },
    ]);
  });

  it("omits ascList breadcrumb for ReimbursementDetail without permission", () => {
    const result = getBreadcrumbsList("ReimbursementDetail", t, "ascList", false);
    expect(result).toEqual([
      { label: "reimbursement", href: "/ascs" },
      { label: "reimbursementDetail", href: "#" },
      { label: "reimbursementDetail", href: "#" },
    ]);
  });

  it("includes reimbursementDetail breadcrumb for ReimbursementClaimsList with permission", () => {
    const result = getBreadcrumbsList("ReimbursementClaimsList", t, "ascList", true);
    expect(result).toEqual([
      { label: "reimbursement", href: "/ascs" },
      { label: "ascList", href: "/ascs" },
      { label: "reimbursementDetail", href: "#" },
    ]);
  });

  it("returns base breadcrumb only for unknown page", () => {
    const result = getBreadcrumbsList("UnknownPage", t);
    expect(result).toEqual([{ label: "reimbursement", href: "/ascs" }]);
  });
});

describe("handleGenerateReceipt", () => {
  let setMessages: ReturnType<typeof vi.fn>;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setMessages = vi.fn();
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("navigates targetWindow to the pdf url when receipt is available", async () => {
    vi.mocked(getReimbursementReceipt).mockResolvedValue(new Blob(["pdf"]) as never);
    const targetWindow = { location: { href: "" }, close: vi.fn() } as unknown as Window;

    await handleGenerateReceipt("R1", setMessages, t, targetWindow);

    expect(targetWindow.location.href).toBe("blob:mock-url");
    expect(setMessages).not.toHaveBeenCalled();
  });

  it("opens a new window when targetWindow is null and receipt is available", async () => {
    vi.mocked(getReimbursementReceipt).mockResolvedValue(new Blob(["pdf"]) as never);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    await handleGenerateReceipt("R1", setMessages, t, null);

    expect(openSpy).toHaveBeenCalledWith("blob:mock-url", "_blank");
    openSpy.mockRestore();
  });

  it("closes targetWindow and adds error message when receipt is null", async () => {
    vi.mocked(getReimbursementReceipt).mockResolvedValue(null);
    const targetWindow = { location: { href: "" }, close: vi.fn() } as unknown as Window;

    await handleGenerateReceipt("R1", setMessages, t, targetWindow);

    expect(targetWindow.close).toHaveBeenCalled();
    expect(setMessages).toHaveBeenCalledTimes(1);
    const updater = setMessages.mock.calls[0][0];
    expect(updater([])).toEqual([
      { text: "failedToGenerateReimbursementReceipt", type: "error", duration: 3000 },
    ]);
  });

  it("does not throw when receipt is null and targetWindow is null", async () => {
    vi.mocked(getReimbursementReceipt).mockResolvedValue(null);
    await expect(handleGenerateReceipt("R1", setMessages, t, null)).resolves.toBeUndefined();
    expect(setMessages).toHaveBeenCalledTimes(1);
  });
});
