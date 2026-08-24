import { describe, it, expect, vi } from "vitest";
import { AnalyticsTracker } from "./analytics";
import { AnalyticsContextEnricher } from "./context";
import { AnalyticsEventValidator } from "./validate";
import { ValidationMode, type AnalyticsConfig } from "../config/config";
import { AnalyticsEnvironment, AnalyticsEventName, JobStatus, JobType } from "../domain/enums";
import type { AnalyticsContextSnapshot, AnalyticsEvent } from "../domain/types";
import type { AnalyticsLogger } from "../infra/logger";
import { InMemoryAnalyticsTransport, DEFAULT_TEST_CLOCK, DEFAULT_TEST_SNAPSHOT } from "../testing";

const jobCreated: AnalyticsEvent = {
  name: AnalyticsEventName.JOB_CREATED,
  payload: { jobType: JobType.WARRANTY, jobStatus: JobStatus.READY_FOR_DIAGNOSTIC },
};

const spyLogger = (): AnalyticsLogger => ({
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const build = (params: {
  config?: Partial<AnalyticsConfig>;
  snapshot?: AnalyticsContextSnapshot | null;
  logger?: AnalyticsLogger;
}) => {
  const transport = new InMemoryAnalyticsTransport();
  const logger = params.logger ?? spyLogger();
  const config: AnalyticsConfig = {
    environment: AnalyticsEnvironment.DEV,
    enabled: true,
    debug: false,
    validationMode: ValidationMode.WARN,
    ...params.config,
  };
  const snapshot = params.snapshot === undefined ? DEFAULT_TEST_SNAPSHOT : params.snapshot;
  const tracker = new AnalyticsTracker({
    config,
    transport,
    contextSource: { getSnapshot: () => snapshot },
    enricher: new AnalyticsContextEnricher(DEFAULT_TEST_CLOCK),
    validator: new AnalyticsEventValidator(),
    logger,
  });
  return { tracker, transport, logger };
};

describe("AnalyticsTracker", () => {
  it("assembles context + event params into one dataLayer push", () => {
    const { tracker, transport } = build({});
    tracker.track(jobCreated);
    expect(transport.events).toHaveLength(1);
    expect(transport.last).toEqual({
      event: "job_created",
      environment: "DEV",
      language: "en-US",
      user_role: "asc_technician",
      country_code: "TR",
      asc_id: "ASC_TR_001",
      virtual_url: "/dashboard",
      local_time_hour: "09AM",
      local_day_of_week: "Monday",
      job_type: "warranty",
      job_status: "ready_for_diagnostic",
    });
  });

  it("does nothing when analytics is disabled", () => {
    const { tracker, transport } = build({ config: { enabled: false } });
    tracker.track(jobCreated);
    expect(transport.events).toHaveLength(0);
  });

  it("skips (and warns) when no context is available yet", () => {
    const { tracker, transport, logger } = build({ snapshot: null });
    tracker.track(jobCreated);
    expect(transport.events).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("drops an invalid event in STRICT mode", () => {
    const { tracker, transport } = build({
      config: { validationMode: ValidationMode.STRICT },
      snapshot: { ...DEFAULT_TEST_SNAPSHOT, language: "" },
    });
    tracker.track(jobCreated);
    expect(transport.events).toHaveLength(0);
  });

  it("still pushes an invalid event in WARN mode (never break the app)", () => {
    const { tracker, transport } = build({
      config: { validationMode: ValidationMode.WARN },
      snapshot: { ...DEFAULT_TEST_SNAPSHOT, language: "" },
    });
    tracker.track(jobCreated);
    expect(transport.events).toHaveLength(1);
  });

  it("emits a debug trace only when debug is enabled", () => {
    const verbose = spyLogger();
    build({ config: { debug: true }, logger: verbose }).tracker.track(jobCreated);
    expect(verbose.debug).toHaveBeenCalled();
  });

  it("never throws even if a collaborator explodes", () => {
    const transport = new InMemoryAnalyticsTransport();
    const logger = spyLogger();
    const tracker = new AnalyticsTracker({
      config: {
        environment: AnalyticsEnvironment.DEV,
        enabled: true,
        debug: false,
        validationMode: ValidationMode.WARN,
      },
      transport,
      contextSource: {
        getSnapshot: () => {
          throw new Error("context exploded");
        },
      },
      enricher: new AnalyticsContextEnricher(DEFAULT_TEST_CLOCK),
      validator: new AnalyticsEventValidator(),
      logger,
    });
    expect(() => tracker.track(jobCreated)).not.toThrow();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
