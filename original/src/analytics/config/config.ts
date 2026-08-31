import { AnalyticsEnvironment } from "../domain/enums";

export enum ValidationMode {
  WARN = "warn",
  STRICT = "strict",
  SILENT = "silent",
}

export interface AnalyticsConfig {
  readonly environment: AnalyticsEnvironment;
  readonly enabled: boolean;
  readonly debug: boolean;
  readonly validationMode: ValidationMode;
  readonly gtmId?: string;
}

export interface AnalyticsRuntimeEnv {
  readonly MODE?: string;
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly VITE_GTM_ID?: string;
  readonly VITE_ANALYTICS_ENVIRONMENT?: string;
  readonly VITE_ANALYTICS_ENABLED?: string;
  readonly VITE_ANALYTICS_DEBUG?: string;
  readonly VITE_ANALYTICS_VALIDATION_MODE?: string;
}

const MODE_TO_ENVIRONMENT: Readonly<Record<string, AnalyticsEnvironment>> = Object.freeze({
  local: AnalyticsEnvironment.LOCAL,
  development: AnalyticsEnvironment.LOCAL,
  test: AnalyticsEnvironment.LOCAL,
  dev: AnalyticsEnvironment.DEV,
  qa: AnalyticsEnvironment.QA,
  stage: AnalyticsEnvironment.STAGE,
  staging: AnalyticsEnvironment.STAGE,
  prod: AnalyticsEnvironment.PROD,
  production: AnalyticsEnvironment.PROD,
});

const isAnalyticsEnvironment = (value: string): value is AnalyticsEnvironment =>
  (Object.values(AnalyticsEnvironment) as string[]).includes(value);

const parseBoolean = (value: string | undefined): boolean | undefined => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
};

const parseValidationMode = (value: string | undefined): ValidationMode | undefined =>
  (Object.values(ValidationMode) as string[]).includes(value ?? "")
    ? (value as ValidationMode)
    : undefined;

const resolveEnvironment = (env: AnalyticsRuntimeEnv): AnalyticsEnvironment => {
  const override = env.VITE_ANALYTICS_ENVIRONMENT?.trim().toUpperCase();
  if (override && isAnalyticsEnvironment(override)) return override;
  const mode = env.MODE?.trim().toLowerCase() ?? "";
  return MODE_TO_ENVIRONMENT[mode] ?? AnalyticsEnvironment.DEV;
};

export const resolveAnalyticsConfig = (
  env: AnalyticsRuntimeEnv = import.meta.env,
): AnalyticsConfig => {
  const environment = resolveEnvironment(env);
  const isLocal = environment === AnalyticsEnvironment.LOCAL;
  const isLocalOrDev = isLocal || environment === AnalyticsEnvironment.DEV;

  return Object.freeze({
    environment,
    enabled: parseBoolean(env.VITE_ANALYTICS_ENABLED) ?? !isLocal,
    debug: parseBoolean(env.VITE_ANALYTICS_DEBUG) ?? isLocalOrDev,
    validationMode:
      parseValidationMode(env.VITE_ANALYTICS_VALIDATION_MODE) ??
      (environment === AnalyticsEnvironment.PROD ? ValidationMode.SILENT : ValidationMode.WARN),
    gtmId: env.VITE_GTM_ID,
  });
};

const DEBUG_STORAGE_KEY = "bass.analytics.debug";

export const readDebugOverride = (): boolean => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};
