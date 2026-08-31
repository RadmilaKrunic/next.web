import "./ApprovalAction.scss";
import { useTranslation } from "react-i18next";
import { handleEnterAndArrows } from "../../../../../utils/keyboard.accessibility";

export default function ApprovalAction({
  actionName,
  onClick,
  jobId,
}: Readonly<{
  iconName: string;
  actionName: string;
  onClick?: () => void;
  jobId: string | undefined;
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    handleEnterAndArrows<HTMLButtonElement>(event, { onClick });
  };

  return (
    <button
      type="button"
      className="approval-action-container"
      data-testid={`approval-action-${actionName}-${jobId}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <span className="approval-action-text">{t(actionName)}</span>
    </button>
  );
}
