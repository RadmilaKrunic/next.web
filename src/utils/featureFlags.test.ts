import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  FEATURE_FLAGS,
  isFeatureEnabled,
  setFeatureOverride,
  subscribeToFeatureFlags,
} from "./featureFlags";

const FLAG = FEATURE_FLAGS.DIAGNOSTICS_BACKEND_DRIVEN;

describe("featureFlags", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    vi.unstubAllEnvs();
  });

  it("is disabled by default", () => {
    expect(isFeatureEnabled(FLAG)).toBe(false);
  });

  it("reads the env var", () => {
    vi.stubEnv("VITE_FF_DIAGNOSTICS_BACKEND_DRIVEN", "true");
    expect(isFeatureEnabled(FLAG)).toBe(true);
  });

  it("localStorage override wins over env", () => {
    vi.stubEnv("VITE_FF_DIAGNOSTICS_BACKEND_DRIVEN", "true");
    setFeatureOverride(FLAG, false);
    expect(isFeatureEnabled(FLAG)).toBe(false);

    setFeatureOverride(FLAG, null);
    expect(isFeatureEnabled(FLAG)).toBe(true);
  });

  it("notifies subscribers when an override changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToFeatureFlags(listener);
    setFeatureOverride(FLAG, true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setFeatureOverride(FLAG, false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
