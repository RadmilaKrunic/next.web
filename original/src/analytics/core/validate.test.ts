import { describe, it, expect } from "vitest";
import { AnalyticsEventValidator } from "./validate";
import { AnalyticsEventName } from "../domain/enums";
import { AnalyticsParameterKey as P, type DataLayerEvent } from "../domain/types";

const validator = new AnalyticsEventValidator();

const context = {
  [P.ENVIRONMENT]: "QA",
  [P.LANGUAGE]: "de",
  [P.VIRTUAL_URL]: "/create-job",
  [P.USER_ROLE]: "asc_technician",
  [P.LOCAL_TIME_HOUR]: "09AM",
  [P.LOCAL_DAY_OF_WEEK]: "Monday",
} as const;

const validJobCreated: DataLayerEvent = {
  event: AnalyticsEventName.JOB_CREATED,
  ...context,
  [P.JOB_STATUS]: "ready_for_diagnostic",
  [P.JOB_TYPE]: "warranty",
};

describe("AnalyticsEventValidator", () => {
  it("accepts a well-formed event", () => {
    const result = validator.validate(validJobCreated);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects an unknown event", () => {
    const result = validator.validate({ event: "totally_made_up" } as unknown as DataLayerEvent);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain("Unknown event");
  });

  it("rejects a missing required parameter", () => {
    const withoutStatus: DataLayerEvent = {
      event: AnalyticsEventName.JOB_CREATED,
      ...context,
      [P.JOB_TYPE]: "warranty",
    };
    const result = validator.validate(withoutStatus);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.includes(P.JOB_STATUS))).toBe(true);
  });

  it("treats an empty required string as missing", () => {
    const result = validator.validate({ ...validJobCreated, [P.LANGUAGE]: "" });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.includes(P.LANGUAGE))).toBe(true);
  });

  it("rejects an invalid enum value", () => {
    const result = validator.validate({ ...validJobCreated, [P.JOB_STATUS]: "banana" });
    expect(result.valid).toBe(false);
  });

  it("rejects a non-numeric duration", () => {
    const result = validator.validate({
      ...validJobCreated,
      [P.JOB_CREATION_DURATION_SECONDS]: "420" as unknown as number,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects an empty optional string", () => {
    const result = validator.validate({ ...validJobCreated, [P.ASC_ID]: "" });
    expect(result.valid).toBe(false);
  });
});
