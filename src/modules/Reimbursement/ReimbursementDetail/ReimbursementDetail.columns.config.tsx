import { ReactNode } from "react";
import { ReimbursementPerAsc } from "../../../api/services/reimbursements/reimbursements.types";
import { formatDateToDisplay } from "../../../utils/dateFormatter";
import StatusIndicator from "../../../components/ui/StatusIndicator/StatusIndicator";

export type ReimbursementDetailColumnKey =
  | "reimbursementId"
  | "createdAt"
  | "timePeriod"
  | "claimsIncluded"
  | "creditNoteAmount"
  | "status";
export type ReimbursementDetailColumnConfig = {
  key: ReimbursementDetailColumnKey;
  label: string;
  render: (reimbursement: ReimbursementPerAsc) => string | ReactNode;
};

const formatPeriod = (period: string): string => {
  const [start, end] = period.split(" - ");
  const startDate = new Date(start);
  const endDate = new Date(end);

  const formattedStart = formatDateToDisplay(startDate);
  const formattedEnd = formatDateToDisplay(endDate);
  return `${formattedStart} - ${formattedEnd}`;
};

export const getReimbursementDetailColumns = (
  t: (key: string) => string,
): ReimbursementDetailColumnConfig[] => {
  return [
    {
      key: "reimbursementId",
      label: t("reimbursementId"),
      render: (reimbursement) => reimbursement?.reimbursementId || "-",
    },
    {
      key: "createdAt",
      label: t("createdAt"),
      render: (reimbursement) => formatDateToDisplay(reimbursement?.createdAt) || "-",
    },
    {
      key: "timePeriod",
      label: t("period"),
      render: (reimbursement) =>
        reimbursement?.timePeriod ? formatPeriod(reimbursement.timePeriod) : "-",
    },
    {
      key: "claimsIncluded",
      label: t("claimsIncluded"),
      render: (reimbursement) => reimbursement?.claimsIncluded?.toString() || "0",
    },
    {
      key: "creditNoteAmount",
      label: t("creditNoteAmount"),
      render: (reimbursement) =>
        reimbursement?.creditNoteAmount ? `${reimbursement.creditNoteAmount.toFixed(2)}` : "0.00",
    },
    {
      key: "status",
      label: t("status"),
      render: (reimbursement) => {
        return <StatusIndicator status={reimbursement.status} />;
      },
    },
  ];
};
