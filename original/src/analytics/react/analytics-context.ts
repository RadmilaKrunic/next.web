import { createContext } from "react";
import { createNoopAnalytics, type Analytics } from "../core/analytics";

export const AnalyticsContext = createContext<Analytics>(createNoopAnalytics());
AnalyticsContext.displayName = "AnalyticsContext";
