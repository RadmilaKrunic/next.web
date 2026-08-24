import { ReactNode } from "react";
import { Reimbursement } from "api/services/reimbursements/reimbursements.types";
import { format } from "date-fns";

export type ReimbursementColumnKey =
  | "reimbursementId"
  | "ascName"
  | "created"
  | "period"
  | "periodType"
  | "claimCount"
  | "totalAmount"
  | "status";

export type ReimbursementColumnConfig = {
  key: ReimbursementColumnKey;
  label: string;
  render: (reimbursement: Reimbursement) => string | ReactNode;
};

export const getReimbursementListColumns = (
  t: (key: string) => string,
): ReimbursementColumnConfig[] => {
  return [
    {
      key: "reimbursementId",
      label: t("reimbursementId"),
      render: (reimbursement) => reimbursement?.reimbursementId || "-",
    },
    {
      key: "ascName",
      label: t("ascName"),
      render: (reimbursement) => reimbursement?.ascName || "-",
    },
    {
      key: "periodType",
      label: t("period"),
      render: (reimbursement) => t(reimbursement?.periodType) || "-",
    },
    {
      key: "period",
      label: t("period"),
      render: (reimbursement) => {
        const periodStartDateString = format(reimbursement?.periodStartDate, "dd.MM.yyyy");
        const periodEndDateString = format(reimbursement?.periodEndDate, "dd.MM.yyyy");
        return `${periodStartDateString} - ${periodEndDateString}`;
      },
    },
    {
      key: "claimCount",
      label: t("numberOfClaims"),
      render: (reimbursement) => reimbursement?.claimCount?.toString() || "0",
    },
    {
      key: "totalAmount",
      label: t("totalAmount"),
      render: (reimbursement) =>
        reimbursement?.totalAmount ? `${reimbursement.totalAmount.toFixed(2)}` : "0.00",
    },
    {
      key: "status",
      label: t("status"),
      render: (reimbursement) => t(reimbursement?.status) || "-",
    },
  ];
};
