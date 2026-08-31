import { describe, it, expect } from "vitest";
import { getReimbursementAscColumns } from "./ReimbursementASCList.columns.config";
import { ReimbursementAsc } from "@/api/services/reimbursements/reimbursements.types";

const t = (key: string) => key;

const buildAsc = (overrides: Partial<ReimbursementAsc> = {}): ReimbursementAsc => ({
  ascId: "asc-1",
  ascName: "ASC Name",
  customerCode: "CUST-1",
  email: "asc@example.com",
  address: {
    street: "Main St",
    houseNumber: "12",
    additionalDetails: "",
    neighborhood: "",
    district: "",
    city: "",
    stateProvinceRegion: "",
    postalCode: "",
    countryCode: "",
  },
  ...overrides,
});

describe("getReimbursementAscColumns", () => {
  const columns = getReimbursementAscColumns(t);

  it("returns all expected column keys", () => {
    expect(columns.map((col) => col.key)).toEqual(["name", "customerCode", "email", "address"]);
  });

  it("renders name column from ascName", () => {
    const nameCol = columns.find((col) => col.key === "name")!;
    expect(nameCol.render(buildAsc())).toBe("ASC Name");
  });

  it("renders customerCode fallback to dash when missing", () => {
    const col = columns.find((col) => col.key === "customerCode")!;
    expect(col.render(buildAsc({ customerCode: "" }))).toBe("-");
    expect(col.render(buildAsc({ customerCode: "CUST-2" }))).toBe("CUST-2");
  });

  it("renders email fallback to dash when missing", () => {
    const col = columns.find((col) => col.key === "email")!;
    expect(col.render(buildAsc({ email: "" }))).toBe("-");
    expect(col.render(buildAsc({ email: "a@b.com" }))).toBe("a@b.com");
  });

  it("renders address by joining present fields", () => {
    const col = columns.find((col) => col.key === "address")!;
    const asc = buildAsc({
      address: {
        street: "Main St",
        houseNumber: "12",
        additionalDetails: "Apt 3",
        neighborhood: "",
        district: "",
        city: "Springfield",
        stateProvinceRegion: "",
        postalCode: "",
        countryCode: "",
      },
    });
    expect(col.render(asc)).toBe("Main St,12,Apt 3,Springfield");
  });

  it("renders dash for address when all fields empty", () => {
    const col = columns.find((col) => col.key === "address")!;
    expect(col.render(buildAsc())).toBe("Main St,12");
  });

  it("returns dash when every address field is empty", () => {
    const col = columns.find((col) => col.key === "address")!;
    const asc = buildAsc({
      address: {
        street: "",
        houseNumber: "",
        additionalDetails: "",
        neighborhood: "",
        district: "",
        city: "",
        stateProvinceRegion: "",
        postalCode: "",
        countryCode: "",
      },
    });
    expect(col.render(asc)).toBe("-");
  });
});
