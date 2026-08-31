import { TFunction } from "i18next";

interface ApiErrorBody {
  detail?: string;
  params?: Record<string, string | string[]>;
}

function parseParamValue(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  // Try valid JSON first (e.g. '["06010000","06010001"]')
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.join(", ");
    }
    return value;
  } catch {
    // Fall through
  }
  // Handle Java List.toString() format: [item1, item2] (no quotes around items)
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
  }
  return value;
}

export function getApiErrorMessage(error: unknown, t: TFunction, fallbackKey: string): string {
  const body = (error as { response?: { data?: ApiErrorBody } })?.response?.data;
  const detail = body?.detail;

  if (!detail) return t(fallbackKey);

  const params = body?.params;
  const interpolation: Record<string, string> | undefined = params
    ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, parseParamValue(v)]))
    : undefined;
  const translated = interpolation ? t(detail, interpolation) : t(detail);

  if (translated === detail) return t(fallbackKey);

  return translated;
}
