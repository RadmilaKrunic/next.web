import {
  AnalyticsParameterKey as P,
  type AnalyticsContextSnapshot,
  type AnalyticsParameterBag,
  type DataLayerValue,
} from "../domain/types";
import { formatLocalDayOfWeek, formatLocalTimeHour, type AnalyticsClock } from "../infra/time";

interface EnrichmentOptions {
  readonly includePageDescriptor: boolean;
}

export class AnalyticsContextEnricher {
  constructor(private readonly clock: AnalyticsClock) {}

  enrich(snapshot: AnalyticsContextSnapshot, options: EnrichmentOptions): AnalyticsParameterBag {
    const now = this.clock.now();
    const bag: Record<string, DataLayerValue | undefined> = {
      [P.ENVIRONMENT]: snapshot.environment,
      [P.LANGUAGE]: snapshot.language,
      [P.USER_ROLE]: snapshot.userRole,
      [P.VIRTUAL_URL]: snapshot.virtualUrl,
      [P.COUNTRY_CODE]: snapshot.countryCode,
      [P.ASC_ID]: snapshot.ascId,
      [P.LOCAL_TIME_HOUR]: formatLocalTimeHour(now),
      [P.LOCAL_DAY_OF_WEEK]: formatLocalDayOfWeek(now),
    };
    if (options.includePageDescriptor) {
      bag[P.PAGE_NAME] = snapshot.pageName;
      bag[P.MODULE_NAME] = snapshot.moduleName;
    }
    return bag;
  }
}
