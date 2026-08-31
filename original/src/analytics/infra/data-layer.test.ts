import { describe, it, expect, vi } from "vitest";
import { DataLayerTransport } from "./data-layer";
import type { AnalyticsLogger } from "./logger";
import { AnalyticsEventName } from "../domain/enums";
import type { DataLayerEntry, DataLayerEvent } from "../domain/types";

const event: DataLayerEvent = { event: AnalyticsEventName.JOB_CREATED };

const createLogger = (): AnalyticsLogger => ({
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe("DataLayerTransport", () => {
  it("pushes assembled events to the resolved dataLayer", () => {
    const dataLayer: DataLayerEntry[] = [];
    const transport = new DataLayerTransport(createLogger(), () => dataLayer);
    transport.push(event);
    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toBe(event);
  });

  it("skips and warns when the dataLayer is unavailable", () => {
    const logger = createLogger();
    const transport = new DataLayerTransport(logger, () => undefined);
    transport.push(event);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("never throws — swallows and logs a failing push", () => {
    const logger = createLogger();
    const throwingSink = {
      push: () => {
        throw new Error("boom");
      },
    } as unknown as DataLayerEntry[];
    const transport = new DataLayerTransport(logger, () => throwingSink);
    expect(() => transport.push(event)).not.toThrow();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
