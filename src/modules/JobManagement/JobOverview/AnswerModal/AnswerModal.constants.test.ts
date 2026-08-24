import { describe, it, expect } from "vitest";
import {
  CUSTOMER_ANSWER_REPAIR_OPTIONS,
  CUSTOMER_ANSWER_EXCHANGE_OPTIONS,
  APPROVER_ANSWER_OPTIONS,
} from "./AnswerModal.constants";

describe("AnswerModal.constants", () => {
  it("CUSTOMER_ANSWER_REPAIR_OPTIONS has 6 options", () => {
    expect(CUSTOMER_ANSWER_REPAIR_OPTIONS).toHaveLength(6);
  });

  it("CUSTOMER_ANSWER_REPAIR_OPTIONS includes REPAIR option", () => {
    expect(CUSTOMER_ANSWER_REPAIR_OPTIONS.some((o) => o.value === "REPAIR")).toBe(true);
  });

  it("CUSTOMER_ANSWER_EXCHANGE_OPTIONS excludes REPAIR option", () => {
    expect(CUSTOMER_ANSWER_EXCHANGE_OPTIONS.some((o) => o.value === "REPAIR")).toBe(false);
  });

  it("CUSTOMER_ANSWER_EXCHANGE_OPTIONS includes REVISE option", () => {
    expect(CUSTOMER_ANSWER_EXCHANGE_OPTIONS.some((o) => o.value === "REVISE")).toBe(true);
  });

  it("APPROVER_ANSWER_OPTIONS has approve and reject", () => {
    expect(APPROVER_ANSWER_OPTIONS).toHaveLength(2);
    expect(APPROVER_ANSWER_OPTIONS.map((o) => o.value)).toEqual(["approve", "reject"]);
  });
});
