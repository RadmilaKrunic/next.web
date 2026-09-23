import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatSubtext } from "components/ui/OverviewHeader/OverviewHeader.helpers";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateToDisplay } from "utils/dateFormatter";
import { getCustomerDisplayName, CUSTOMER_TYPE_ICON_NAME, CustomerType } from "utils/customerUtils";
import OverviewHeader from "components/ui/OverviewHeader/OverviewHeader";
import { ClaimItem } from "../Claims.types";

function ClaimOverviewHeader() {
  const { claimId } = useParams<{ claimId: string }>();
  const queryClient = useQueryClient();
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const claim = queryClient.getQueryData<ClaimItem>(["claim", claimId]);

  if (!claim) {
    return null;
  }

  const iconName = CUSTOMER_TYPE_ICON_NAME[claim.customer.customerType as CustomerType] ?? "user";

  return (
    <OverviewHeader
      type="claim"
      id={claim.id}
      idLabel={t("claimId")}
      createdAt={formatDateToDisplay(claim.job.jobCreationDate)}
      createdAtLabel={t("createdAt")}
      items={[
        {
          icon: iconName,
          title: getCustomerDisplayName(claim.customer),
          subtitle: formatSubtext(claim.customer.phoneNumber, "", claim.customer.primaryEmail),
        },
        {
          icon: "drill-driver-cordless",
          title: claim.job.asset.toolModelName,
          subtitle: formatSubtext(claim.job.asset.bareToolNumber, "", claim.job.asset.category),
        },
      ]}
      showStatus={true}
      status={claim.claimStatus}
      assigneeInfo={{
        icon: "user-mechanic",
        name: claim.job.assigneeName,
        subtitle: t("technician"),
      }}
      ascName={claim.ascName}
    />
  );
}

export default ClaimOverviewHeader;
