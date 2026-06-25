import { describe, it, expect } from "vitest";
import {
  STATUS_TYPE,
  getJobStatusMessages,
  getClaimStatusMessages,
  getStatusMessages,
} from "./StatusIndicator.constants";

const t = (key: string) => key;

describe("STATUS_TYPE", () => {
  it("maps DRAFT to gray", () => {
    expect(STATUS_TYPE["DRAFT"]).toBe("gray");
  });

  it("maps COMPLETED to success", () => {
    expect(STATUS_TYPE["COMPLETED"]).toBe("success");
  });

  it("maps CANCELLED to error", () => {
    expect(STATUS_TYPE["CANCELLED"]).toBe("error");
  });
});

describe("getJobStatusMessages", () => {
  it("returns a record with expected keys", () => {
    const messages = getJobStatusMessages(t);
    expect(messages).toHaveProperty("READY_FOR_DIAGNOSTIC");
    expect(messages).toHaveProperty("IN_DIAGNOSTICS");
    expect(messages).toHaveProperty("COMPLETED");
  });

  it("calls t with message keys", () => {
    const messages = getJobStatusMessages(t);
    expect(messages["READY_FOR_DIAGNOSTIC"]).toBe("statusReadyForDiagnosticMessage");
  });
});

describe("getClaimStatusMessages", () => {
  it("returns a record with expected keys", () => {
    const messages = getClaimStatusMessages(t);
    expect(messages).toHaveProperty("APPROVED");
    expect(messages).toHaveProperty("REJECTED");
  });
});

describe("getStatusMessages", () => {
  it("returns job messages for type 'job'", () => {
    const jobMessages = getJobStatusMessages(t);
    const result = getStatusMessages("job", t);
    expect(result).toEqual(jobMessages);
  });

  it("returns claim messages for type 'claim'", () => {
    const claimMessages = getClaimStatusMessages(t);
    const result = getStatusMessages("claim", t);
    expect(result).toEqual(claimMessages);
  });

  it("returns job messages for type 'sparePart' (fallback)", () => {
    const jobMessages = getJobStatusMessages(t);
    const result = getStatusMessages("sparePart", t);
    expect(result).toEqual(jobMessages);
  });
});
