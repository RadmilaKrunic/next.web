export const FEATURE_FLAGS = {
  /**
   * Backend-driven diagnostics: item rules resolved from country config + item policy,
   * prices and summaries calculated by the backend instead of the frontend.
   */
  DIAGNOSTICS_BACKEND_DRIVEN: "diagnosticsBackendDriven",
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

const ENV_KEYS: Record<FeatureFlag, string> = {
  [FEATURE_FLAGS.DIAGNOSTICS_BACKEND_DRIVEN]: "VITE_FF_DIAGNOSTICS_BACKEND_DRIVEN",
};

const STORAGE_PREFIX = "ff:";

const listeners = new Set<() => void>();

const readStorage = (flag: FeatureFlag): string | null => {
  try {
    return globalThis.localStorage?.getItem(`${STORAGE_PREFIX}${flag}`) ?? null;
  } catch {
    return null;
  }
};

const readEnv = (flag: FeatureFlag): string | undefined => {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  return env[ENV_KEYS[flag]];
};

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  const override = readStorage(flag);
  if (override !== null) return override === "true";
  return readEnv(flag) === "true";
};

/** Runtime override used by QA/debug tooling. Pass `null` to fall back to the env value. */
export const setFeatureOverride = (flag: FeatureFlag, value: boolean | null): void => {
  try {
    const key = `${STORAGE_PREFIX}${flag}`;
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, String(value));
  } catch {
    /* storage unavailable — override not persisted */
  }
  listeners.forEach((listener) => listener());
};

export const subscribeToFeatureFlags = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
