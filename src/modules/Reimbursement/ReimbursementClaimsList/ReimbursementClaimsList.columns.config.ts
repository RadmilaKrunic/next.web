import { ReactNode } from "react";
import { ReimbursementClaim } from "api/services/reimbursements/reimbursements.types";
import { formatDateToDisplay } from "utils/dateFormatter";

export type ReimbursementClaimColumnKey =
  | "claimId"
  | "created"
  | "assetName"
  | "bareToolNumber"
  | "actionType"
  | "jobType"
  | "jobId"
  | "creditNoteAmount";

export type ReimbursementClaimColumnConfig = {
  key: ReimbursementClaimColumnKey;
  label: string;
  render: (claim: ReimbursementClaim) => string | ReactNode;
};

export const getReimbursementClaimsColumns = (
  t: (key: string) => string,
): ReimbursementClaimColumnConfig[] => {
  return [
    {
      key: "claimId",
      label: t("claimId"),
      render: (claim) => claim.claimId || "-",
    },
    {
      key: "created",
      label: t("created"),
      render: (claim) => formatDateToDisplay(claim.createdOn) || "-",
    },
    {
      key: "assetName",
      label: t("assetName"),
      render: (claim) => claim.assetName || "-",
    },
    {
      key: "bareToolNumber",
      label: t("bareToolNumber"),
      render: (claim) => claim.bareToolNumber || "-",
    },
    {
      key: "actionType",
      label: t("actionType"),
      render: (claim) => t(claim.actionType) || "-",
    },
    {
      key: "jobId",
      label: t("jobId"),
      render: (claim) => claim.jobId || "-",
    },
    {
      key: "jobType",
      label: t("jobType"),
      render: (claim) => t(claim.jobType) || "-",
    },
    {
      key: "creditNoteAmount",
      label: t("creditNoteAmount"),
      render: (claim) => (claim.creditNoteAmount ? `${claim.creditNoteAmount.toFixed(2)}` : "0.00"),
    },
  ];
};
