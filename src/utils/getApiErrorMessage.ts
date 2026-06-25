import { TFunction } from "i18next";

interface ApiErrorBody {
  detail?: string;
  params?: Record<string, string | string[]>;
}

export function getApiErrorMessage(error: unknown, t: TFunction, fallbackKey: string): string {
  const body = (error as { response?: { data?: ApiErrorBody } })?.response?.data;
  const detail = body?.detail;

  if (!detail) return t(fallbackKey);

  const params = body?.params;
  const interpolation: Record<string, string> | undefined = params
    ? Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v]),
      )
    : undefined;
  const translated = interpolation ? t(detail, interpolation) : t(detail);

  if (translated === detail) return t(fallbackKey);

  return translated;
}
