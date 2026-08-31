import { Icon } from "@bosch/react-frok";
import { useEffect, useMemo, useState } from "react";
import { Tooltip, type ITooltip } from "react-tooltip";
import {
  bareToolNumberTooltipContent,
  purchaseDateMissingContent,
  serialNumberTooltipContent,
  warrantyInfoContent,
} from "./TooltipContent";
import "./InfoIconWithTooltip.scss";
import { useTranslation } from "react-i18next";
import { WarrantyInfoPayload } from "components/generics/Field/GenericField.types";
import PurchaseDateModal from "components/ui/PurchaseDateModal/PurchaseDateModal";
import { useParams } from "react-router-dom";

interface InfoIconWithTooltipProps extends Omit<ITooltip, "id"> {
  name: string;
  infoText?: string;
  infoPayload?: WarrantyInfoPayload;
  hasPurchaseDate?: boolean;
}

function InfoIconWithTooltip({
  name,
  infoText,
  infoPayload,
  hasPurchaseDate,
  place = "bottom",
  style,
  offset = 10,
  float = false,
  noArrow = false,
  ...tooltipProps
}: Readonly<InfoIconWithTooltipProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { jobId } = useParams<{ jobId: string }>();
  const [isPurchaseDateModalOpen, setIsPurchaseDateModalOpen] = useState(false);
  const tooltipId = `${name}-info-tooltip`;

  useEffect(() => {
    const nameLower = name?.toLowerCase();
    const isWarrantyInfo = nameLower.includes("warranty");
    if (!isWarrantyInfo || hasPurchaseDate !== false) return;

    const handler = () => setIsPurchaseDateModalOpen(true);
    document.addEventListener("open-purchase-date-modal", handler);
    return () => {
      document.removeEventListener("open-purchase-date-modal", handler);
    };
  }, [name, hasPurchaseDate]);
  const config = useMemo(() => {
    const isImage = /\.(jpg|jpeg|png|gif|svg|webp)(\?.*)?$/i.test(infoText || "");
    const nameLower = name?.toLowerCase();
    const isWarrantyInfo = nameLower.includes("warranty");

    let tooltipContent = "";
    let tooltipPlace = place;
    let tooltipClassName: string | undefined;

    if (!isImage) {
      if (isWarrantyInfo && hasPurchaseDate === false) {
        tooltipContent = purchaseDateMissingContent(t);
        tooltipPlace = "bottom-start";
        tooltipClassName = "warranty-tooltip";
      } else if (isWarrantyInfo && (infoPayload || infoText)) {
        const warrantyInfo = {
          reasonKey: infoPayload?.reasonKey || "",
          fallbackMessage: infoPayload?.fallbackMessage || infoText || "",
          validityExpirationDate: infoPayload?.validityExpirationDate || "",
          usedWarrantyRepairCount: infoPayload?.usedWarrantyRepairCount ?? 0,
          allowedWarrantyRepairCount: infoPayload?.allowedWarrantyRepairCount ?? 0,
          recommendationText: infoPayload?.recommendation || "",
        };

        tooltipContent = warrantyInfoContent(warrantyInfo, t);
        tooltipPlace = "bottom-start";
        tooltipClassName = "warranty-tooltip";
      } else {
        tooltipContent = infoText || "";
      }
    } else if (nameLower.includes("baretoolnumber")) {
      tooltipContent = bareToolNumberTooltipContent(t);
      tooltipPlace = "bottom-end";
    } else if (nameLower.includes("serialnumber")) {
      tooltipContent = serialNumberTooltipContent(t);
      tooltipPlace = "bottom-end";
    }

    return {
      tooltipContent,
      tooltipPlace,
      tooltipClassName,
      isClickable: isWarrantyInfo && hasPurchaseDate === false,
    };
  }, [name, infoPayload, infoText, place, t, hasPurchaseDate]);

  return (
    <>
      <Icon
        iconName="info-i-frame"
        className="info-icon"
        data-tooltip-id={tooltipId}
        data-tooltip-html={config.tooltipContent}
      />
      <Tooltip
        id={tooltipId}
        place={config.tooltipPlace}
        className={config.tooltipClassName}
        style={{ zIndex: 9999, maxWidth: config.tooltipClassName ? "720px" : "550px", ...style }}
        offset={offset}
        float={float}
        noArrow={noArrow}
        clickable={config.isClickable}
        {...tooltipProps}
      />
      {hasPurchaseDate === false && jobId && (
        <PurchaseDateModal
          jobId={jobId}
          isOpen={isPurchaseDateModalOpen}
          onClose={() => setIsPurchaseDateModalOpen(false)}
        />
      )}
    </>
  );
}

export default InfoIconWithTooltip;
