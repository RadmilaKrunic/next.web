import { Icon } from "@bosch/react-frok";
import "./ClaimAction.scss";
import { useTranslation } from "react-i18next";
import { handleEnterAndArrows } from "../../../../../utils/keyboard.accessibility";

export default function ClaimAction({
  iconName,
  actionName,
  disabled = false,
  onClick,
  claimId,
}: Readonly<{
  iconName: string;
  actionName: string;
  disabled?: boolean;
  onClick?: () => void;
  claimId: string;
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (!disabled) handleEnterAndArrows<HTMLButtonElement>(event, { onClick });
  };

  return (
    <button
      type="button"
      className={`claim-action-container${disabled ? " claim-action-container--disabled" : ""}`}
      data-testid={`claim-action-${actionName}-${claimId}`}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
    >
      <Icon iconName={iconName} className="claim-action-icon" aria-hidden="true" />
      <span className="claim-action-text">{t(actionName)}</span>
    </button>
  );
}
