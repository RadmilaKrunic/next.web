import { describe, it, expect, vi, afterEach } from "vitest";
import { DataLayerTransport, resolveWindowDataLayer } from "./data-layer";
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

describe("resolveWindowDataLayer", () => {
  afterEach(() => {
    delete (globalThis.window as Window & { dataLayer?: DataLayerEntry[] }).dataLayer;
  });

  it("returns the existing dataLayer array when already initialised", () => {
    const existing: DataLayerEntry[] = [{ event: AnalyticsEventName.JOB_CREATED }];
    (globalThis.window as Window & { dataLayer?: DataLayerEntry[] }).dataLayer = existing;
    expect(resolveWindowDataLayer()).toBe(existing);
  });

  it("initialises dataLayer to an empty array when it is absent and returns it", () => {
    delete (globalThis.window as Window & { dataLayer?: DataLayerEntry[] }).dataLayer;
    const result = resolveWindowDataLayer();
    expect(result).toEqual([]);
    expect(globalThis.window.dataLayer).toBe(result);
  });

  it("replaces a non-array dataLayer with an empty array", () => {
    (globalThis.window as unknown as Record<string, unknown>).dataLayer = "not-an-array";
    const result = resolveWindowDataLayer();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it("returns undefined when window is undefined (SSR / non-browser environment)", () => {
    const originalWindow = globalThis.window;
    delete (globalThis as unknown as { window?: Window }).window;
    try {
      expect(resolveWindowDataLayer()).toBeUndefined();
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("returns undefined when accessing window.dataLayer throws", () => {
    Object.defineProperty(globalThis.window, "dataLayer", {
      get() {
        throw new Error("access denied");
      },
      configurable: true,
    });
    expect(resolveWindowDataLayer()).toBeUndefined();
  });
});
