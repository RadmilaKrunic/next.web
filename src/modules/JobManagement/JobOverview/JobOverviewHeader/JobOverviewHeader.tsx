import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatSubtext } from "components/ui/OverviewHeader/OverviewHeader.helpers";
import { useQueryClient } from "@tanstack/react-query";
import { JobOverviewItem } from "modules/JobManagement/JobList/JobList.types";
import { CUSTOMER_TYPE_ICON_NAME } from "../../../../utils/customerTypeIcon";
import { formatDateToDisplay } from "utils/dateFormatter";
import { getCustomerDisplayName } from "../../../../utils/customerUtils";
import OverviewHeader from "components/ui/OverviewHeader/OverviewHeader";
import { CustomerType } from "modules/JobManagement/JobList/JobListTable/JobListColumns.config";

function JobOverviewHeader() {
  const { jobId } = useParams<{ jobId: string }>();
  const queryClient = useQueryClient();
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const jobData = queryClient.getQueryData<JobOverviewItem>(["job", jobId]);

  if (!jobData) {
    return null;
  }

  const {
    job,
    order: { customer },
  } = jobData;
  const iconName = CUSTOMER_TYPE_ICON_NAME[customer.customerType as CustomerType] ?? "user";

  return (
    <OverviewHeader
      type="job"
      id={job.jobId}
      idLabel={t("jobId")}
      createdAt={formatDateToDisplay(job.jobCreationDate)}
      createdAtLabel={t("createdAt")}
      historyLink={undefined}
      items={[
        {
          icon: iconName,
          title: getCustomerDisplayName(customer),
          subtitle: formatSubtext(customer.phoneNumber, "", customer.primaryEmail),
        },
        {
          icon: "drill-driver-cordless",
          title: job.asset.toolModelName,
          subtitle: formatSubtext(job.asset.bareToolNumber, "", job.asset.category),
        },
      ]}
      showStatus={true}
      status={job.jobStatus}
      technicianSelectProps={{
        assigneeName: job.assigneeName,
        ascId: job.ascId,
        jobId: job.jobId,
      }}
      assigneeInfo={{
        icon: "user-mechanic",
        name: job.assigneeName,
        subtitle: t("technician"),
      }}
      isDisabled={job.isOnHold}
    />
  );
}

export default JobOverviewHeader;
