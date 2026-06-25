import { Icon } from "@bosch/react-frok";
import "./JobAction.scss";
import { getJobActionConfig } from "./JobAction.helper";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { handleEnterAndArrows } from "../../../../../utils/keyboard.accessibility";

export default function JobAction({
  iconName,
  actionName,
  jobStatus,
  jobId,
  orderId,
  onClick,
}: {
  iconName: string;
  actionName?: string;
  jobStatus?: string;
  jobId: string;
  orderId?: string;
  onClick?: () => void;
}) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const navigate = useNavigate();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    handleEnterAndArrows(event, { onClick });
  };
  const jobActionStatus = jobId ? getJobActionConfig(jobStatus ?? "", jobId, orderId) : null;
  const actionLabel = jobActionStatus?.name ?? actionName ?? "";

  const jobActionLink = jobActionStatus?.link || "#";
  return jobActionStatus?.show || jobActionStatus === null ? (
    <button
      type="button"
      className="job-action-container"
      data-testid={`job-action-${jobActionStatus?.name || actionName}`}
      onClick={jobActionStatus ? () => navigate(jobActionLink) : onClick}
      onKeyDown={handleKeyDown}
    >
      <Icon
        iconName={jobActionStatus?.icon || iconName}
        className="job-action-icon"
        aria-hidden="true"
      />
      <span className="job-action-text">{t(actionLabel)}</span>
    </button>
  ) : null;
}
