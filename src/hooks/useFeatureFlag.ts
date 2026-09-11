import { useCallback, useSyncExternalStore } from "react";
import { isFeatureEnabled, subscribeToFeatureFlags, type FeatureFlag } from "../utils/featureFlags";

export const useFeatureFlag = (flag: FeatureFlag): boolean => {
  const getSnapshot = useCallback(() => isFeatureEnabled(flag), [flag]);
  return useSyncExternalStore(subscribeToFeatureFlags, getSnapshot, getSnapshot);
};
