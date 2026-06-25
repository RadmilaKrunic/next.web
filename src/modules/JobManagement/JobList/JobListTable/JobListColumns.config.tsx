import { ReactNode } from "react";
import { Job } from "../JobList.types";
import StatusIndicator from "components/ui/StatusIndicator/StatusIndicator";
import { Icon } from "@bosch/react-frok";
import { CUSTOMER_TYPE_ICON_NAME } from "../../../../utils/customerTypeIcon";
import { formatDateToDisplay } from "../../../../utils/dateFormatter";
import { getCustomerDisplayName } from "../../../../utils/customerUtils";

export type JobColumnKey =
  | "jobId"
  | "jobStatus"
  | "createdAt"
  | "updatedAt"
  | "assignee"
  | "customer"
  | "customerWish"
  | "pickupType"
  | "paymentType"
  | "source"
  | "toolModelName"
  | "serialNumber"
  | "bareToolNumber";
export type JobColumnConfig = {
  key: JobColumnKey;
  label: string;
  getValue: (job: Job) => string | ReactNode;
};

export interface JobColumnConfiguration {
  key: JobColumnKey;
  isFixed: boolean;
  isChecked: boolean;
  order: number;
}

export type CustomerType = "INDIVIDUAL_PRIVATE" | "INDIVIDUAL_PRO" | "COMPANY" | "DEALERSHIP";

export const getJobColumns = (
  t: (key: string) => string,
): Record<JobColumnKey, JobColumnConfig> => ({
  jobId: {
    key: "jobId",
    label: t("jobId"),
    getValue: (job) => job.jobId,
  },

  createdAt: {
    key: "createdAt",
    label: t("createdAt"),
    getValue: (job) => formatDateToDisplay(job.createdAt),
  },

  updatedAt: {
    key: "updatedAt",
    label: t("updatedAt"),
    getValue: (job) => formatDateToDisplay(job.updatedAt),
  },

  assignee: {
    key: "assignee",
    label: t("assignee"),
    getValue: (job) =>
      job.assigneeName === "un-assigned" ? t("unassigned") : (job.assigneeName ?? "-"),
  },

  jobStatus: {
    key: "jobStatus",
    label: t("jobStatus"),
    getValue: (job) => {
      return <StatusIndicator status={job.jobStatus} />;
    },
  },

  customer: {
    key: "customer",
    label: t("customerName"),
    getValue: (job) => {
      const customer = job.customer;
      if (!customer) return "-";

      const customerDisplayName = getCustomerDisplayName(customer);
      if (customerDisplayName === "-") return "-";

      const iconName = CUSTOMER_TYPE_ICON_NAME[customer.customerType as CustomerType] ?? "user";

      return (
        <>
          <Icon iconName={iconName} className="user-icon" />
          {customerDisplayName}
        </>
      );
    },
  },

  customerWish: {
    key: "customerWish",
    label: t("customerWish"),
    getValue: (job) => (job.customerWish ? t(job.customerWish) : "-"),
  },

  pickupType: {
    key: "pickupType",
    label: t("pickupTypeColumn"),
    getValue: (job) => t(job.pickupType) ?? "-",
  },

  paymentType: {
    key: "paymentType",
    label: t("paymentType"),
    getValue: (job) => {
      if (job.paymentType?.trim()) {
        const translatedValue = t(job.paymentType);
        return translatedValue === job.paymentType ? "-" : translatedValue;
      }
      return "-";
    },
  },

  source: {
    key: "source",
    label: t("source"),
    getValue: (job) => job.source ?? "-",
  },

  toolModelName: {
    key: "toolModelName",
    label: t("toolModelNameFilter"),
    getValue: (job) => {
      return job.asset?.toolModelName ?? "-";
    },
  },

  serialNumber: {
    key: "serialNumber",
    label: t("serialNumber"),
    getValue: (job) => job.asset?.serialNumber ?? "-",
  },

  bareToolNumber: {
    key: "bareToolNumber",
    label: t("baretoolNumber"),
    getValue: (job) => job.asset?.bareToolNumber ?? "-",
  },
});
