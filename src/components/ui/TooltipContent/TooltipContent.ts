import baretoolImage from "@/assets/baretoolnumber.png";
import serialImage from "@/assets/serialnumber.png";

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
