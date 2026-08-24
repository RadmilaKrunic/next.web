import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getReimbursementDetailColumns } from "./ReimbursementDetail.columns.config";
import { ReimbursementPerAsc } from "../../../api/services/reimbursements/reimbursements.types";

const t = (key: string) => key;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const buildItem = (overrides: Partial<ReimbursementPerAsc> = {}): ReimbursementPerAsc => ({
  reimbursementId: "R1",
  createdAt: new Date("2026-01-05T00:00:00Z"),
  timePeriod: "2026-01-01 - 2026-01-31",
  claimsIncluded: 5,
  creditNoteAmount: 100.5,
  status: "APPROVED",
  ...overrides,
});

describe("getReimbursementDetailColumns", () => {
  const columns = getReimbursementDetailColumns(t);

  it("returns all expected column keys", () => {
    expect(columns.map((col) => col.key)).toEqual([
      "reimbursementId",
      "createdAt",
      "timePeriod",
      "claimsIncluded",
      "creditNoteAmount",
      "status",
    ]);
  });

  it("renders reimbursementId fallback to dash when missing", () => {
    const col = columns.find((col) => col.key === "reimbursementId")!;
    expect(col.render(buildItem({ reimbursementId: "" }))).toBe("-");
    expect(col.render(buildItem())).toBe("R1");
  });

  it("renders createdAt formatted date", () => {
    const col = columns.find((col) => col.key === "createdAt")!;
    expect(col.render(buildItem())).not.toBe("-");
  });

  it("renders timePeriod formatted with a dash between start and end", () => {
    const col = columns.find((col) => col.key === "timePeriod")!;
    const result = col.render(buildItem()) as string;
    expect(result).toContain(" - ");
  });

  it("renders dash when timePeriod is missing", () => {
    const col = columns.find((col) => col.key === "timePeriod")!;
    expect(col.render(buildItem({ timePeriod: "" }))).toBe("-");
  });

  it("renders claimsIncluded as string, defaulting to 0", () => {
    const col = columns.find((col) => col.key === "claimsIncluded")!;
    expect(col.render(buildItem({ claimsIncluded: 5 }))).toBe("5");
    expect(col.render(buildItem({ claimsIncluded: 0 }))).toBe("0");
  });

  it("renders creditNoteAmount formatted to two decimals, defaulting to 0.00", () => {
    const col = columns.find((col) => col.key === "creditNoteAmount")!;
    expect(col.render(buildItem({ creditNoteAmount: 100.5 }))).toBe("100.50");
    expect(col.render(buildItem({ creditNoteAmount: 0 }))).toBe("0.00");
  });

  it("renders a StatusIndicator for status", () => {
    const col = columns.find((col) => col.key === "status")!;
    render(<>{col.render(buildItem({ status: "APPROVED" }))}</>);
    expect(screen.getByText("APPROVED")).toBeInTheDocument();
  });
});
