import { ReactNode } from "react";
import { Claim } from "../ClaimList.types";
import StatusIndicator from "components/ui/StatusIndicator/StatusIndicator";
import { formatDateToDisplay } from "../../../../utils/dateFormatter";

export type ClaimColumnKey =
  | "claimId"
  | "createdOn"
  | "ascName"
  | "toolModelName"
  | "baretoolNumber"
  | "jobAction"
  | "jobType"
  | "totalCost"
  | "status";

export type ClaimColumnConfig = {
  key: ClaimColumnKey;
  label: string;
  getValue: (claim: Claim) => string | ReactNode;
};

export const getClaimColumns = (
  t: (key: string) => string,
): Record<ClaimColumnKey, ClaimColumnConfig> => ({
  claimId: {
    key: "claimId",
    label: t("claimId"),
    getValue: (claim) => claim.claimId,
  },

  createdOn: {
    key: "createdOn",
    label: t("createdOn"),
    getValue: (claim) => formatDateToDisplay(claim.createdOn),
  },

  toolModelName: {
    key: "toolModelName",
    label: t("toolModelName"),
    getValue: (claim) => claim.toolModelName ?? "-",
  },

  baretoolNumber: {
    key: "baretoolNumber",
    label: t("bareToolNumber"),
    getValue: (claim) => claim.baretoolNumber ?? "-",
  },

  jobAction: {
    key: "jobAction",
    label: t("jobAction"),
    getValue: (claim) => t(claim.jobAction) || claim.jobAction,
  },

  jobType: {
    key: "jobType",
    label: t("jobType"),
    getValue: (claim) => t(claim.jobType) || claim.jobType,
  },

  totalCost: {
    key: "totalCost",
    label: t("totalCost"),
    getValue: (claim) => {
      if (claim.totalCost == null) return "-";
      return claim.totalCost.toFixed(2);
    },
  },

  ascName: {
    key: "ascName",
    label: t("ascName"),
    getValue: (claim) => claim.ascName ?? "-",
  },

  status: {
    key: "status",
    label: t("status"),
    getValue: (claim) => <StatusIndicator status={claim.status} type="claim" />,
  },
});
