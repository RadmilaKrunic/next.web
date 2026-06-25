import { describe, it, expect } from "vitest";
import { CUSTOMER_ANSWER_OPTIONS, APPROVER_ANSWER_OPTIONS } from "./AnswerModal.constants";

describe("AnswerModal.constants", () => {
  it("CUSTOMER_ANSWER_OPTIONS has 5 options", () => {
    expect(CUSTOMER_ANSWER_OPTIONS).toHaveLength(5);
  });

  it("CUSTOMER_ANSWER_OPTIONS includes REPAIR option", () => {
    expect(CUSTOMER_ANSWER_OPTIONS.some((o) => o.value === "REPAIR")).toBe(true);
  });

  it("APPROVER_ANSWER_OPTIONS has approve and reject", () => {
    expect(APPROVER_ANSWER_OPTIONS).toHaveLength(2);
    expect(APPROVER_ANSWER_OPTIONS.map((o) => o.value)).toEqual(["approve", "reject"]);
  });
});
