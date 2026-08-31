import { describe, it, expect } from "vitest";
import { getJobActionConfig, JOB_ACTION_CONFIG } from "./JobAction.helper";

describe("JOB_ACTION_CONFIG", () => {
  it("has an entry for DRAFT with createJob name", () => {
    expect(JOB_ACTION_CONFIG["DRAFT"].name).toBe("createJob");
    expect(JOB_ACTION_CONFIG["DRAFT"].icon).toBe("document-add");
    expect(JOB_ACTION_CONFIG["DRAFT"].show).toBe(true);
  });

  it("has an entry for IN_DIAGNOSTICS with goToDiagnostics name", () => {
    expect(JOB_ACTION_CONFIG["IN_DIAGNOSTICS"].name).toBe("goToDiagnostics");
  });

  it("DRAFT link function uses orderId parameter", () => {
    expect(JOB_ACTION_CONFIG["DRAFT"].link("ord-123")).toBe("/edit-order/ord-123");
  });

  it("IN_DIAGNOSTICS link function uses jobId parameter", () => {
    expect(JOB_ACTION_CONFIG["IN_DIAGNOSTICS"].link("job-42")).toBe(
      "/job-overview/job-42#diagnosticData",
    );
  });

  it("WAITING_FOR_TOOL link goes to job-overview without hash", () => {
    expect(JOB_ACTION_CONFIG["WAITING_FOR_TOOL"].link("job-1")).toBe("/job-overview/job-1");
  });
});

describe("getJobActionConfig", () => {
  it("returns null for unknown status", () => {
    expect(getJobActionConfig("UNKNOWN_STATUS", "job-1")).toBeNull();
  });

  it("returns config for DRAFT using orderId", () => {
    const result = getJobActionConfig("DRAFT", "job-1", "ord-99");
    expect(result).not.toBeNull();
    expect(result?.link).toBe("/edit-order/ord-99");
    expect(result?.name).toBe("createJob");
    expect(result?.icon).toBe("document-add");
    expect(result?.show).toBe(true);
  });

  it("uses jobId as fallback for DRAFT when orderId is undefined", () => {
    const result = getJobActionConfig("DRAFT", "job-1");
    expect(result?.link).toBe("/edit-order/job-1");
  });

  it("returns config for IN_DIAGNOSTICS using jobId", () => {
    const result = getJobActionConfig("IN_DIAGNOSTICS", "job-42");
    expect(result).not.toBeNull();
    expect(result?.link).toBe("/job-overview/job-42#diagnosticData");
    expect(result?.name).toBe("goToDiagnostics");
  });

  it("returns config for WAITING_FOR_TOOL using jobId", () => {
    const result = getJobActionConfig("WAITING_FOR_TOOL", "job-5");
    expect(result?.link).toBe("/job-overview/job-5");
    expect(result?.name).toBe("confirmToolReceived");
  });

  it("returns config for REPAIR_DONE", () => {
    const result = getJobActionConfig("REPAIR_DONE", "job-10");
    expect(result?.link).toBe("/job-overview/job-10#diagnosticData");
  });

  it("returns config for WAITING_FOR_APPROVAL", () => {
    const result = getJobActionConfig("WAITING_FOR_APPROVAL", "job-20");
    expect(result?.link).toBe("/job-overview/job-20#diagnosticData");
    expect(result?.name).toBe("goToDiagnostics");
  });

  it("returns config for DELIVERED", () => {
    const result = getJobActionConfig("DELIVERED", "job-30");
    expect(result).not.toBeNull();
    expect(result?.link).toContain("/job-overview/job-30");
  });

  it("returns config for BOSCH_APPROVAL_PENDING", () => {
    const result = getJobActionConfig("BOSCH_APPROVAL_PENDING", "job-31");
    expect(result?.name).toBe("goToDiagnostics");
  });

  it("returns config for EXCHANGE", () => {
    const result = getJobActionConfig("EXCHANGE", "job-32");
    expect(result?.name).toBe("goToDiagnostics");
  });

  it("returns config for SCRAP_TOOL", () => {
    const result = getJobActionConfig("SCRAP_TOOL", "job-33");
    expect(result?.link).toBe("/job-overview/job-33#diagnosticData");
  });

  it("returns config for REJECTED", () => {
    const result = getJobActionConfig("REJECTED", "job-34");
    expect(result?.name).toBe("goToDiagnostics");
  });
});
