import { GoodwillApproval } from "modules/ClaimManagement/ApprovalList/ApprovalList.types";
import { ApprovalColumnConfiguration } from "modules/ClaimManagement/ApprovalList/ApprovalListTable/ApprovalListColumns.config";
import { fetchJobs } from "../jobs/action";
import axiosClient from "api/axios-client/axiosClient";
import { PreApprovalDecision } from "./approvals.types";

export const fetchApprovals = async (): Promise<GoodwillApproval[]> => {
  try {
    const allJobs = await fetchJobs();
    return allJobs;
  } catch (error) {
    console.error("Error fetching goodwill approvals:", error);
    throw error;
  }
};

export const saveApprovalListColumns = async (
  columns: ApprovalColumnConfiguration[],
): Promise<void> => {
  try {
    const selectedColumnKeys = columns.filter((col) => col.isChecked).map((col) => col.key);
    await axiosClient.post(`/v1/profile/preferences/job`, selectedColumnKeys);
  } catch (error) {
    console.error("Error saving approval list columns:", error);
    throw error;
  }
};

export const updateApprovalStatus = async ({
  jobId,
  materialIds,
  approvalStatus,
  message,
}: PreApprovalDecision): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/flow/bosch-approval`, {
      materialIds,
      approvalStatus,
      message,
    });
  } catch (error) {
    console.error(`Error updating approval status for job ${jobId}:`, error);
    throw error;
  }
};

export const approveJobs = async (jobIds: string[]): Promise<void> => {
  try {
    await axiosClient.post("/v1/jobs/flow/bosch-approval/approve", { jobIds });
  } catch (error) {
    console.error("Error approving jobs:", error);
    throw error;
  }
};
