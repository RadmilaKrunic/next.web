import type { WarrantyInfoPayload } from "components/generics/Field/GenericField.types";
import type { WarrantyCheckResponse } from "api/services/orders/orders.types";

const KNOWN_PRO_SERVICE_TYPE_LABELS = {
  INDIVIDUAL_PRO: "INDIVIDUAL_PRO",
  individualPro: "individualPro",
} as const;

const WARRANTY_REASON_MESSAGE_KEY = {
  UNKNOWN_SERIAL_NUMBER: "warrantyBlockedUnknownSerialNumber",
  WARRANTY_EXPIRED: "warrantyBlockedExpired",
  ALLOWED_REPAIR_COUNT_EXCEEDED: "warrantyBlockedRepairCountExceeded",
} as const;

/** Job types that must be disabled when the tool is warranty-ineligible. */
export const INELIGIBLE_JOB_TYPES = new Set(["WARRANTY", "SERVICE_OFFERING", "SPECIAL_CONTRACT"]);

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;
type FormatDateFn = (value?: string | null) => string | undefined;

export const getWarrantyUnavailableMessage = (
  reasonKey: string | null | undefined,
  t: TranslateFn,
): string => {
  const normalizedReasonKey = reasonKey?.trim();
  if (!normalizedReasonKey) return t("warrantyBlockedGeneric");

  const messageKey =
    WARRANTY_REASON_MESSAGE_KEY[normalizedReasonKey as keyof typeof WARRANTY_REASON_MESSAGE_KEY];

  return messageKey ? t(messageKey) : t("warrantyBlockedGeneric");
};

export const getWarrantyRecommendationText = (
  proServiceType: string | null | undefined,
  t: TranslateFn,
): string | undefined => {
  const normalizedType = proServiceType?.trim();
  if (!normalizedType) return undefined;

  const translationKey =
    KNOWN_PRO_SERVICE_TYPE_LABELS[normalizedType as keyof typeof KNOWN_PRO_SERVICE_TYPE_LABELS];
  if (!translationKey) return undefined;

  return t("warrantyProServiceAvailable", { type: t(translationKey) });
};

export const formatWarrantyDate = (value?: string | null): string | undefined => {
  if (!value) return undefined;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return undefined;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

export const buildWarrantyInfoContent = (
  response: WarrantyCheckResponse,
  t: TranslateFn,
  formatDate: FormatDateFn,
): WarrantyInfoPayload | null => {
  if (response.evaluationStatus !== "INELIGIBLE") return null;

  const reasonKey = response.reasonKey;
  const recommendation = getWarrantyRecommendationText(response.proServiceType, t);

  if (reasonKey === "WARRANTY_EXPIRED") {
    return {
      reasonKey,
      fallbackMessage: t("warrantyBlockedExpired"),
      validityExpirationDate: formatDate(response.validityExpirationDate) || "",
      usedWarrantyRepairCount: 0,
      allowedWarrantyRepairCount: 0,
      recommendation,
    };
  }

  if (reasonKey === "ALLOWED_REPAIR_COUNT_EXCEEDED") {
    return {
      reasonKey,
      fallbackMessage: t("warrantyBlockedRepairCountExceeded"),
      validityExpirationDate: "",
      usedWarrantyRepairCount: response.usedWarrantyRepairCount ?? 0,
      allowedWarrantyRepairCount: response.allowedWarrantyRepairCount ?? 0,
      recommendation,
    };
  }

  return {
    reasonKey: reasonKey ?? undefined,
    fallbackMessage: getWarrantyUnavailableMessage(reasonKey, t),
    validityExpirationDate: "",
    usedWarrantyRepairCount: response.usedWarrantyRepairCount ?? 0,
    allowedWarrantyRepairCount: response.allowedWarrantyRepairCount ?? 0,
    recommendation,
  };
};
