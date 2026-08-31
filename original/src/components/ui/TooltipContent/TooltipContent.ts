import baretoolImage from "@/assets/baretoolnumber.png";
import serialImage from "@/assets/serialnumber.png";

export const purchaseDateMissingContent = (t: (key: string) => string) => {
  return ` <div class="warranty-tooltip-content">
            <div class="warranty-tooltip-content__title">${t("warrantyInformationTitle")}</div>
            <div class="warranty-tooltip-content__warning">
              <span class="warranty-tooltip-content__warning-icon alert-warning" aria-hidden="true">⚠</span>
              <span class="warranty-tooltip-content__warning-text">${t("warrantyWhyNotAvailable")}</span>
            </div>
            <div class="warranty-tooltip-content__reason-title">${t("purchaseDateNotProvidedTitle")}</div>
            <div class="warranty-tooltip-content__reason">
              ${t("purchaseDateNotProvidedReason")}
              <button type="button" class="purchase-date-missing-content__link" onclick="document.dispatchEvent(new CustomEvent('open-purchase-date-modal'));">
              <strong>${t("enterPurchaseDate")}</strong>
              </button>
            </div>
            <div class="warranty-tooltip-content__recommendation">
              <span>${t("warrantyRecommendedAlternative")}: </span>
              <strong>${t("warrantyContinueAsChargeable")}</strong>
            </div>
          </div>`;
};

export const bareToolNumberTooltipContent = (t: (key: string) => string) => {
  return `<div style="max-width: 450px;">
            <div><b>${t("bareToolNumberInfo")}</b></div>
            <div>${t("whereDoIFindTheBareToolNumber")}</div>
            <img src="${baretoolImage}" alt="${t("bareToolNumberInfo")}" style="display: block; width: auto; height: auto; max-width: 100%;" />
         </div>`;
};

export const serialNumberTooltipContent = (
  t: (key: string) => string,
) => `<div style="max-width: 450px;">
         <div><b>${t("serialNumberInfo")}</b></div>
         <div>${t("whereDoIFindTheSerialNumber")}</div>
         <img src="${serialImage}" alt="${t("serialNumberInfo")}" style="display: block; width: auto; height: auto; max-width: 100%;" />
      </div>`;

interface WarrantyInfoContentInput {
  reasonKey: string;
  fallbackMessage: string;
  validityExpirationDate: string;
  usedWarrantyRepairCount: number;
  allowedWarrantyRepairCount: number;
  recommendationText: string;
}

export const warrantyInfoContent = (
  payload: WarrantyInfoContentInput,
  t: (key: string, options?: Record<string, unknown>) => string,
) => {
  const {
    reasonKey,
    fallbackMessage,
    validityExpirationDate,
    usedWarrantyRepairCount,
    allowedWarrantyRepairCount,
    recommendationText,
  } = payload;

  let reasonTitleText = t("warrantyInformationTitle");
  if (reasonKey === "WARRANTY_EXPIRED") {
    reasonTitleText = t("warrantyExpiredTitle");
  } else if (reasonKey === "ALLOWED_REPAIR_COUNT_EXCEEDED") {
    reasonTitleText = t("warrantyRepairClaimsUsedTitle");
  }

  let messageText = fallbackMessage || t("warrantyBlockedGeneric");
  if (reasonKey === "WARRANTY_EXPIRED") {
    messageText = t("warrantyExpiredMessage", { validityExpirationDate });
  } else if (reasonKey === "ALLOWED_REPAIR_COUNT_EXCEEDED") {
    messageText = t("warrantyRepairClaimsUsedMessage", {
      usedWarrantyRepairCount,
      allowedWarrantyRepairCount,
    });
  }

  return ` <div class="warranty-tooltip-content">
            <div class="warranty-tooltip-content__title">${t("warrantyInformationTitle")}</div>
            <div class="warranty-tooltip-content__warning">
              <span class="warranty-tooltip-content__warning-icon alert-warning" aria-hidden="true">⚠</span>
              <span class="warranty-tooltip-content__warning-text">${t("warrantyWhyNotAvailable")}</span>
            </div>
            <div class="warranty-tooltip-content__reason-title">${reasonTitleText}</div>
            <div class="warranty-tooltip-content__reason">${messageText}</div>
            <div class="warranty-tooltip-content__recommendation">
              <span>${t("warrantyRecommendedAlternative")}: </span>
              <strong>${t("warrantyContinueAsChargeable")}</strong>
            </div>
            ${recommendationText ? `<div class="warranty-tooltip-content__extra">${recommendationText}</div>` : ""}
          </div>`;
};
