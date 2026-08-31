import { ActivityIndicator } from "@bosch/react-frok";
import "./ClaimsCard.scss";
import { useTranslation } from "react-i18next";
import { useClaims } from "@/api/services/claims/hooks";
import { formatDateToDisplay } from "@/utils/dateFormatter";
import StatusIndicator from "@/components/ui/StatusIndicator/StatusIndicator";

export interface ClaimsCardProps {
  title?: string;
  onViewMore?: () => void;
  viewMoreLabel?: string;
  className?: string;
}

function ClaimsCard({
  title = "Claims",
  onViewMore,
  viewMoreLabel = "ViewMore",
}: Readonly<ClaimsCardProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { data, isLoading: isClaimsLoading } = useClaims();
  const claims = data ?? [];

  if (isClaimsLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

  return (
    <div className="claims-card">
      <div className="claims-card__header">
        <span>{title}</span>
        {onViewMore && (
          <button type="button" className="claims-card__view-more" onClick={onViewMore}>
            {t(viewMoreLabel)}
          </button>
        )}
      </div>

      <div className="claims-card__content">
        {claims.slice(0, 5).map((claim) => (
          <div key={claim.claimId} className="claims-card__item">
            <div className="claims-card__details">
              <div className="claims-card__title">
                {claim.toolModelName} | {claim.ascName} | {claim.baretoolNumber}
              </div>
              <div className="claims-card__meta">
                {t("claimId")}: {claim.claimId} | {t("createdOn")}:
                {formatDateToDisplay(claim.createdOn)}
              </div>
            </div>

            <StatusIndicator status={claim.status} type="sparePart" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ClaimsCard;
