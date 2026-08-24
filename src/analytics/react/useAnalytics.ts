import { useContext } from "react";
import { AnalyticsContext } from "./analytics-context";
import type { Analytics } from "../core/analytics";

export const useAnalytics = (): Analytics => useContext(AnalyticsContext);
