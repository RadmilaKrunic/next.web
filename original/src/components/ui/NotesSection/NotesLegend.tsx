import { Badge } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";

function NotesLegend() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  return (
    <div className="notes-legend">
      <div className="notes-legend-item">
        <Badge label="" className="notes-badge" />
        <span className="notes-legend-label">{t("jobNote")}</span>
      </div>
      <div className="notes-legend-item">
        <Badge label="" type="success" className="notes-badge" />
        <span className="notes-legend-label">{t("claimNote")}</span>
      </div>
    </div>
  );
}

export default NotesLegend;
