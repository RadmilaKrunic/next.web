import type { DataLayerEntry, DataLayerEvent } from "../domain/types";
import type { AnalyticsLogger } from "./logger";

/** Global `window.dataLayer`; optional since it only exists after the GTM snippet runs. */
declare global {
  interface Window {
    dataLayer?: DataLayerEntry[];
  }
}

export interface AnalyticsTransport {
  push(event: DataLayerEvent): void;
}

type DataLayerProvider = () => DataLayerEntry[] | undefined;

export const resolveWindowDataLayer = (): DataLayerEntry[] | undefined => {
  try {
    if (typeof window === "undefined") return undefined;
    if (!Array.isArray(window.dataLayer)) window.dataLayer = [];
    return window.dataLayer;
  } catch {
    return undefined;
  }
};

export class DataLayerTransport implements AnalyticsTransport {
  constructor(
    private readonly logger: AnalyticsLogger,
    private readonly dataLayerProvider: DataLayerProvider = resolveWindowDataLayer,
  ) {}

  push(event: DataLayerEvent): void {
    try {
      const dataLayer = this.dataLayerProvider();
      if (!dataLayer) {
        this.logger.warn("dataLayer unavailable — skipping event", { event });
        return;
      }
      dataLayer.push(event);
    } catch (error) {
      this.logger.error("Failed to push event to dataLayer", { event, error });
    }
  }
}
