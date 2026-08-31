export const STATUS_TYPE: Record<string, string> = {
  DRAFT: "gray",
  WAITING_FOR_TOOL: "warning",
  READY_FOR_DIAGNOSTIC: "skyBlue",
  IN_DIAGNOSTICS: "boschBlue",
  WAITING_FOR_APPROVAL: "amber",
  REPAIR_DONE: "darkGreen",
  DELIVERED: "black",
  COMPLETED: "success",
  CANCELLED: "error",
  ON_HOLD: "gray",
  APPROVED: "success",
  REJECTED: "red",
  PENDING: "warning",
  ARCHIVED: "gray",
  SUBMITTED: "warning",
  BOSCH_APPROVAL_PENDING: "amber",
  CUSTOMER_APPROVAL_PENDING: "amber",
  MULTIPLE_APPROVAL_PENDING: "amber",
  REVISED: "darkBlue",
  RETURN_ASSEMBLY: "purple",
  SCRAP_TOOL: "red",
  EXCHANGE: "teal",
  RETURN_UNASSEMBLY: "purple",
  IN_REPAIR: "green",
  READY_FOR_REPAIR: "lightGreen",
  ACTIVE: "green",
  INACTIVE: "red",
};

export const getJobStatusMessages = (t: (key: string) => string): Record<string, string> => ({
  READY_FOR_DIAGNOSTIC: t("statusReadyForDiagnosticMessage"),
  IN_DIAGNOSTICS: t("statusInDiagnosticsMessage"),
  WAITING_FOR_TOOL: t("statusWaitingForToolMessage"),
  WAITING_FOR_APPROVAL: t("statusWaitingForApprovalMessage"),
  DELIVERED: t("statusDeliveredMessage"),
  CANCELLED: t("statusCancelledMessage"),
  REPAIR_DONE: t("statusRepairDoneMessage"),
  ON_HOLD: t("statusOnHoldMessage"),
  COMPLETED: t("statusCompletedMessage"),
  BOSCH_APPROVAL_PENDING: t("statusBoschApprovalPending"),
  CUSTOMER_APPROVAL_PENDING: t("statusCustomerApprovalPending"),
  MULTIPLE_APPROVAL_PENDING: t("statusMultipleApprovalPending"),
});

export const getClaimStatusMessages = (t: (key: string) => string): Record<string, string> => ({
  CREATED: t("claimStatusCreatedMessage"),
  SUBMITTED: t("claimStatusSubmittedMessage"),
  PENDING: t("claimStatusPendingMessage"),
  APPROVED: t("claimStatusApprovedMessage"),
  REJECTED: t("claimStatusRejectedMessage"),
  COMPLETED: t("claimStatusCompletedMessage"),
  CANCELLED: t("claimStatusCancelledMessage"),
});

export const getEmployeeStatusMessages = (t: (key: string) => string): Record<string, string> => ({
  ACTIVE: t("employeeStatus"),
  INACTIVE: t("employeeStatus"),
});

export const getAscStatusMessages = (t: (key: string) => string): Record<string, string> => ({
  ACTIVE: t("status"),
  INACTIVE: t("status"),
  DRAFT: t("status"),
});

export const getStatusMessages = (
  type: "job" | "claim" | "sparePart" | "employee" | "ASC",
  t: (key: string) => string,
): Record<string, string> => {
  if (type === "claim") {
    return getClaimStatusMessages(t);
  } else if (type === "employee") {
    return getEmployeeStatusMessages(t);
  } else if (type === "ASC") {
    return getAscStatusMessages(t);
  } else {
    return getJobStatusMessages(t);
  }
};
