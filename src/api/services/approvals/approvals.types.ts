export interface PreApprovalDecision {
  jobId: string;
  materialIds: string[];
  approvalStatus: string;
  message: string | null;
}
