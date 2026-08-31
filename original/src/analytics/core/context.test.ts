import { describe, it, expect } from "vitest";
import { AnalyticsContextEnricher } from "./context";
import { FixedClock } from "../infra/time";
import { AnalyticsEnvironment, UserRole } from "../domain/enums";
import type { AnalyticsContextSnapshot } from "../domain/types";

const enricher = new AnalyticsContextEnricher(new FixedClock(new Date(2026, 0, 5, 9, 30)));

const fullSnapshot: AnalyticsContextSnapshot = {
  environment: AnalyticsEnvironment.DEV,
  language: "de",
  userRole: UserRole.ASC_TECHNICIAN,
  countryCode: "TR",
  ascId: "ASC_TR_001",
  virtualUrl: "/create-job",
  pageName: "Create Job",
  moduleName: "Job Management / Job Creation",
};

describe("AnalyticsContextEnricher", () => {
  it("injects the common context and local time from the clock", () => {
    const bag = enricher.enrich(fullSnapshot, { includePageDescriptor: false });
    expect(bag).toMatchObject({
      environment: "DEV",
      language: "de",
      user_role: "asc_technician",
      country_code: "TR",
      asc_id: "ASC_TR_001",
      virtual_url: "/create-job",
      local_time_hour: "09AM",
      local_day_of_week: "Monday",
    });
  });

  it("omits page descriptors unless requested", () => {
    expect(
      enricher.enrich(fullSnapshot, { includePageDescriptor: false }).page_name,
    ).toBeUndefined();
    const withDescriptor = enricher.enrich(fullSnapshot, { includePageDescriptor: true });
    expect(withDescriptor.page_name).toBe("Create Job");
    expect(withDescriptor.module_name).toBe("Job Management / Job Creation");
  });

  it("omits optional org/page context when the snapshot lacks it", () => {
    const bag = enricher.enrich(
      { environment: AnalyticsEnvironment.QA, language: "en-US", userRole: UserRole.UNKNOWN },
      { includePageDescriptor: true },
    );
    expect(bag.country_code).toBeUndefined();
    expect(bag.asc_id).toBeUndefined();
    expect(bag.virtual_url).toBeUndefined();
    expect(bag.page_name).toBeUndefined();
  });
});
