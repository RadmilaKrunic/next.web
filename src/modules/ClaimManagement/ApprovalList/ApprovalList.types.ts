import { Job } from "modules/JobManagement/JobList/JobList.types";

// Goodwill Approvals are jobs filtered by type and status
export type GoodwillApproval = Job;

export interface GoodwillApprovalList {
  count: number;
  jobs: GoodwillApproval[];
}

export type Filter = {
  name: string;
  value: string | boolean;
};

// Eligible statuses for goodwill approval review
export const GOODWILL_APPROVAL_STATUSES = [
  "SUBMITTED",
  "PENDING_APPROVAL",
  "IN_REVIEW",
  "WAITING_FOR_APPROVAL",
  "READY_FOR_DIAGNOSTIC",
] as const;

export type GoodwillApprovalStatus = (typeof GOODWILL_APPROVAL_STATUSES)[number];

// Customer wish values that indicate goodwill requests
export const GOODWILL_CUSTOMER_WISH_VALUES = [
  "serviceGoodwill",
  "COMMERCIAL_GOODWILL",
  "SERVICE_GOODWILL",
] as const;
