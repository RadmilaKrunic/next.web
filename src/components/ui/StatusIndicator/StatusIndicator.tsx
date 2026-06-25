import { useTranslation } from "react-i18next";
import "./StatusIndiicator.scss";
import { STATUS_TYPE, getStatusMessages } from "./StatusIndicator.constants";

function StatusIndicator({
  status,
  showStatusMessage,
  type = "job",
}: Readonly<{
  status: string;
  showStatusMessage?: boolean;
  type?: "job" | "claim" | "sparePart";
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const STATUS_MESSAGES = getStatusMessages(type, t);

  return (
    <div className="status-indicator">
      <output className={`a-badge -${STATUS_TYPE[status]}`} aria-live="off">
        {type === "sparePart" && t(status)}
      </output>
      {type !== "sparePart" && (
        <div className="status-text-wrapper">
          <span className="status-text">{t(status)}</span>
          {showStatusMessage && <span className="status-message">{STATUS_MESSAGES[status]}</span>}
        </div>
      )}
    </div>
  );
}

export default StatusIndicator;
