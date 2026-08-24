import { AnalyticsEnvironment, UserRole } from "./domain/enums";
import type { AnalyticsContextSnapshot, DataLayerEvent } from "./domain/types";
import { ValidationMode, type AnalyticsConfig } from "./config/config";
import { createAnalytics, type Analytics } from "./core/analytics";
import { FixedClock, type AnalyticsClock } from "./infra/time";
import { NoopAnalyticsLogger } from "./infra/logger";
import type { AnalyticsTransport } from "./infra/data-layer";

export class InMemoryAnalyticsTransport implements AnalyticsTransport {
  readonly events: DataLayerEvent[] = [];

  push(event: DataLayerEvent): void {
    this.events.push(event);
  }

  get last(): DataLayerEvent | undefined {
    return this.events.at(-1);
  }
}

export const DEFAULT_TEST_SNAPSHOT: AnalyticsContextSnapshot = Object.freeze({
  environment: AnalyticsEnvironment.DEV,
  language: "en-US",
  userRole: UserRole.ASC_TECHNICIAN,
  countryCode: "TR",
  ascId: "ASC_TR_001",
  virtualUrl: "/dashboard",
  pageName: "Dashboard",
  moduleName: "Dashboard",
});

export const DEFAULT_TEST_CLOCK = new FixedClock(new Date("2026-01-05T09:30:00"));

export interface CreateTestAnalyticsOptions {
  readonly snapshot?: AnalyticsContextSnapshot | null;
  readonly config?: Partial<AnalyticsConfig>;
  readonly clock?: AnalyticsClock;
}

export interface TestAnalyticsHarness {
  readonly analytics: Analytics;
  readonly transport: InMemoryAnalyticsTransport;
}

export const createTestAnalytics = (
  options: CreateTestAnalyticsOptions = {},
): TestAnalyticsHarness => {
  const transport = new InMemoryAnalyticsTransport();
  const snapshot = options.snapshot === undefined ? DEFAULT_TEST_SNAPSHOT : options.snapshot;
  const config: AnalyticsConfig = {
    environment: AnalyticsEnvironment.DEV,
    enabled: true,
    debug: false,
    validationMode: ValidationMode.WARN,
    ...options.config,
  };
  const analytics = createAnalytics({
    contextSource: { getSnapshot: () => snapshot },
    config,
    transport,
    clock: options.clock ?? DEFAULT_TEST_CLOCK,
    logger: new NoopAnalyticsLogger(),
  });
  return { analytics, transport };
};
