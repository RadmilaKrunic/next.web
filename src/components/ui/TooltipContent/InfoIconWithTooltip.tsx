import { Icon } from "@bosch/react-frok";
import { useMemo } from "react";
import { Tooltip, type ITooltip } from "react-tooltip";
import { bareToolNumberTooltipContent, serialNumberTooltipContent } from "./TooltipContent";
import "./InfoIconWithTooltip.scss";
import { useTranslation } from "react-i18next";

interface InfoIconWithTooltipProps extends Omit<ITooltip, "id"> {
  name: string;
  infoText?: string;
}

function InfoIconWithTooltip({
  name,
  infoText,
  place = "bottom",
  style,
  offset = 10,
  float = false,
  noArrow = false,
  ...tooltipProps
}: Readonly<InfoIconWithTooltipProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const config = useMemo(() => {
    const isImage = /\.(jpg|jpeg|png|gif|svg|webp)(\?.*)?$/i.test(infoText || "");
    const nameLower = name?.toLowerCase();

    let tooltipContent = "";
    let tooltipPlace = place;

    if (!isImage) {
      tooltipContent = infoText || "";
    } else if (nameLower.includes("baretoolnumber")) {
      tooltipContent = bareToolNumberTooltipContent(t);
      tooltipPlace = "bottom-end";
    } else if (nameLower.includes("serialnumber")) {
      tooltipContent = serialNumberTooltipContent(t);
      tooltipPlace = "bottom-end";
    }

    return { tooltipContent, tooltipPlace };
  }, [name, infoText, place, t]);

  return (
    <>
      <Icon
        iconName="info-i-frame"
        className="info-icon"
        data-tooltip-id={`${name}-info-tooltip`}
        data-tooltip-html={config.tooltipContent}
      />
      <Tooltip
        id={`${name}-info-tooltip`}
        place={config.tooltipPlace}
        style={{ zIndex: 9999, maxWidth: "550px", ...style }}
        offset={offset}
        float={float}
        noArrow={noArrow}
        {...tooltipProps}
      />
    </>
  );
}

export default InfoIconWithTooltip;
