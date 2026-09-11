import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { resolveAnalyticsConfig, readDebugOverride, ValidationMode } from "./config";
import { AnalyticsEnvironment } from "../domain/enums";

describe("resolveAnalyticsConfig", () => {
  it("maps every Vite mode produced by the package scripts to an environment", () => {
    expect(resolveAnalyticsConfig({ MODE: "development" }).environment).toBe(
      AnalyticsEnvironment.LOCAL,
    );
    expect(resolveAnalyticsConfig({ MODE: "local" }).environment).toBe(AnalyticsEnvironment.LOCAL);
    expect(resolveAnalyticsConfig({ MODE: "test" }).environment).toBe(AnalyticsEnvironment.LOCAL);
    expect(resolveAnalyticsConfig({ MODE: "dev" }).environment).toBe(AnalyticsEnvironment.DEV);
    expect(resolveAnalyticsConfig({ MODE: "qa" }).environment).toBe(AnalyticsEnvironment.QA);
    expect(resolveAnalyticsConfig({ MODE: "stage" }).environment).toBe(AnalyticsEnvironment.STAGE);
    expect(resolveAnalyticsConfig({ MODE: "prod" }).environment).toBe(AnalyticsEnvironment.PROD);
    expect(resolveAnalyticsConfig({ MODE: "production" }).environment).toBe(
      AnalyticsEnvironment.PROD,
    );
  });

  it("falls back to DEV for an unrecognised mode", () => {
    expect(resolveAnalyticsConfig({ MODE: "something-else" }).environment).toBe(
      AnalyticsEnvironment.DEV,
    );
    expect(resolveAnalyticsConfig({}).environment).toBe(AnalyticsEnvironment.DEV);
  });

  it("disables analytics in LOCAL by default and enables it elsewhere", () => {
    expect(resolveAnalyticsConfig({ MODE: "development" }).enabled).toBe(false);
    expect(resolveAnalyticsConfig({ MODE: "dev" }).enabled).toBe(true);
    expect(resolveAnalyticsConfig({ MODE: "prod" }).enabled).toBe(true);
  });

  it("enables the debug tracer in LOCAL/DEV and disables it in QA/STAGE/PROD", () => {
    expect(resolveAnalyticsConfig({ MODE: "development" }).debug).toBe(true);
    expect(resolveAnalyticsConfig({ MODE: "dev" }).debug).toBe(true);
    expect(resolveAnalyticsConfig({ MODE: "qa" }).debug).toBe(false);
    expect(resolveAnalyticsConfig({ MODE: "prod" }).debug).toBe(false);
  });

  it("defaults validation to SILENT in PROD and WARN elsewhere", () => {
    expect(resolveAnalyticsConfig({ MODE: "prod" }).validationMode).toBe(ValidationMode.SILENT);
    expect(resolveAnalyticsConfig({ MODE: "qa" }).validationMode).toBe(ValidationMode.WARN);
  });

  it("honours explicit VITE_ANALYTICS_* overrides", () => {
    const config = resolveAnalyticsConfig({
      MODE: "prod",
      VITE_ANALYTICS_ENVIRONMENT: "stage",
      VITE_ANALYTICS_ENABLED: "false",
      VITE_ANALYTICS_DEBUG: "true",
      VITE_ANALYTICS_VALIDATION_MODE: "strict",
    });
    expect(config.environment).toBe(AnalyticsEnvironment.STAGE);
    expect(config.enabled).toBe(false);
    expect(config.debug).toBe(true);
    expect(config.validationMode).toBe(ValidationMode.STRICT);
  });

  it("ignores an invalid environment/validation override and uses the mode default", () => {
    const config = resolveAnalyticsConfig({
      MODE: "qa",
      VITE_ANALYTICS_ENVIRONMENT: "MARS",
      VITE_ANALYTICS_VALIDATION_MODE: "loud",
    });
    expect(config.environment).toBe(AnalyticsEnvironment.QA);
    expect(config.validationMode).toBe(ValidationMode.WARN);
  });

  it("passes through the GTM id and freezes the result", () => {
    const config = resolveAnalyticsConfig({ MODE: "qa", VITE_GTM_ID: "GTM-TEST" });
    expect(config.gtmId).toBe("GTM-TEST");
    expect(Object.isFrozen(config)).toBe(true);
  });
});

describe("readDebugOverride", () => {
  const STORAGE_KEY = "bass.analytics.debug";

  // jsdom 27 delegates to Node webstorage, which is unusable without --localstorage-file.
  const store = new Map<string, string>();
  const storageStub = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis.window, "localStorage");

  beforeEach(() => {
    Object.defineProperty(globalThis.window, "localStorage", {
      get: () => storageStub,
      configurable: true,
    });
  });

  afterEach(() => {
    store.clear();
    if (originalDescriptor) {
      Object.defineProperty(globalThis.window, "localStorage", originalDescriptor);
    }
  });

  it("returns false when the key is absent", () => {
    window.localStorage.removeItem(STORAGE_KEY);
    expect(readDebugOverride()).toBe(false);
  });

  it("returns true when the key is set to 'true'", () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    expect(readDebugOverride()).toBe(true);
  });

  it("returns false when the key is set to any other value", () => {
    window.localStorage.setItem(STORAGE_KEY, "false");
    expect(readDebugOverride()).toBe(false);

    window.localStorage.setItem(STORAGE_KEY, "1");
    expect(readDebugOverride()).toBe(false);

    window.localStorage.setItem(STORAGE_KEY, "yes");
    expect(readDebugOverride()).toBe(false);
  });

  it("returns false when localStorage throws (e.g. storage access denied)", () => {
    const realLocalStorage = globalThis.window.localStorage;
    Object.defineProperty(globalThis.window, "localStorage", {
      get() {
        throw new Error("SecurityError");
      },
      configurable: true,
    });
    try {
      expect(readDebugOverride()).toBe(false);
    } finally {
      Object.defineProperty(globalThis.window, "localStorage", {
        get() {
          return realLocalStorage;
        },
        configurable: true,
      });
    }
  });
});
