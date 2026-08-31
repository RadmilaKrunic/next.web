import { ReactNode } from "react";
import { Job } from "modules/JobManagement/JobList/JobList.types";
import StatusIndicator from "components/ui/StatusIndicator/StatusIndicator";
import { Icon } from "@bosch/react-frok";
import { CUSTOMER_TYPE_ICON_NAME } from "../../../../utils/customerTypeIcon";
import { formatDateToDisplay } from "../../../../utils/dateFormatter";
import { getCustomerDisplayName } from "../../../../utils/customerUtils";

export type ApprovalColumnKey =
  | "jobId"
  | "customer"
  | "serialNumber"
  | "toolModelName"
  | "createdAt"
  | "assignee"
  | "bareToolNumber"
  | "jobStatus"
  | "updatedAt"
  | "customerWish"
  | "pickupType"
  | "paymentType"
  | "source"
  | "ascName"
  | "actionType"
  | "materialCost";

export type ApprovalColumnConfig = {
  key: ApprovalColumnKey;
  label: string;
  getValue: (job: Job) => string | ReactNode;
};

export interface ApprovalColumnConfiguration {
  key: ApprovalColumnKey;
  isFixed: boolean;
  isChecked: boolean;
  order: number;
}

export type CustomerType = "INDIVIDUAL_PRIVATE" | "INDIVIDUAL_PRO" | "COMPANY" | "DEALERSHIP";

export const getApprovalColumns = (
  t: (key: string) => string,
): Record<ApprovalColumnKey, ApprovalColumnConfig> => ({
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
    label: t("pickupType"),
    getValue: (job) => t(job.pickupType) ?? "-",
  },

  paymentType: {
    key: "paymentType",
    label: t("paymentType"),
    getValue: (job) => (job.paymentType ? t(job.paymentType) : "-"),
  },

  source: {
    key: "source",
    label: t("source"),
    getValue: (job) => t(job.source) ?? "-",
  },

  toolModelName: {
    key: "toolModelName",
    label: t("toolModelNameFilter"),
    getValue: (job) => job.asset?.toolModelName ?? "-",
  },

  serialNumber: {
    key: "serialNumber",
    label: t("serialNumber"),
    getValue: (job) => job.asset?.serialNumber ?? "-",
  },

  bareToolNumber: {
    key: "bareToolNumber",
    label: t("bareToolNumber"),
    getValue: (job) => job.asset?.bareToolNumber ?? "-",
  },

  ascName: {
    key: "ascName",
    label: t("ascName"),
    getValue: (job) => job.ascName ?? "-",
  },

  actionType: {
    key: "actionType",
    label: t("jobActionType"),
    getValue: (job) => (job.diagnosticInfo?.actionType ? t(job.diagnosticInfo.actionType) : "-"),
  },

  materialCost: {
    key: "materialCost",
    label: t("materialCosts"),
    getValue: (job) => {
      const cost = job.diagnosticInfo?.materialCost;
      if (cost == null) return "-";
      return cost.toFixed(2);
    },
  },
});
