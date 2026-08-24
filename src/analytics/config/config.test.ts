import { describe, it, expect } from "vitest";
import { resolveAnalyticsConfig, ValidationMode } from "./config";
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
