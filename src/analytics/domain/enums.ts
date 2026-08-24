/** `environment` parameter. */
export enum AnalyticsEnvironment {
  LOCAL = "LOCAL",
  DEV = "DEV",
  QA = "QA",
  STAGE = "STAGE",
  PROD = "PROD",
}
export const ANALYTICS_ENVIRONMENTS: readonly AnalyticsEnvironment[] = Object.freeze(
  Object.values(AnalyticsEnvironment),
);

/** `event` name pushed to the dataLayer. One per business event + the SPA pageview. */
export enum AnalyticsEventName {
  VIRTUAL_PAGE_VIEW = "virtual_page_view",
  JOB_CREATED = "job_created",
  JOB_SAVED_AS_DRAFT = "job_saved_as_draft",
  DIAGNOSTIC_VALIDATED = "diagnostic_validated",
  JOB_SUBMITTED_FOR_REVIEW = "job_submitted_for_review",
  JOB_APPROVED_FOR_REPAIR = "job_approved_for_repair",
  REPAIR_STARTED = "repair_started",
  REPAIR_FINISHED = "repair_finished",
  JOB_COMPLETED = "job_completed",
  CLAIM_REVIEWED = "claim_reviewed",
  PRE_APPROVAL_REQUESTED = "pre_approval_requested",
  PRE_APPROVAL_REVIEWED = "pre_approval_reviewed",
  NOTE_ADDED = "note_added",
  HELP_CENTER_CLICKED = "help_center_clicked",
}

/** `user_role` parameter (mapped from the app's role strings). */
export enum UserRole {
  ASC_TECHNICIAN = "asc_technician",
  ASC_MANAGER = "asc_manager",
  COUNTRY_MANAGER = "country_manager",
  UNKNOWN = "unknown",
}
export const USER_ROLES: readonly UserRole[] = Object.freeze(Object.values(UserRole));

/** `job_type` parameter. */
export enum JobType {
  WARRANTY = "warranty",
  CHARGEABLE = "chargeable",
  COMMERCIAL_GOODWILL = "commercial_goodwill",
}
export const JOB_TYPES: readonly JobType[] = Object.freeze(Object.values(JobType));

/** `job_status` parameter — aligned 1:1 (lowercased) with the app's order statuses. */
export enum JobStatus {
  DRAFT = "draft",
  WAITING_FOR_TOOL = "waiting_for_tool",
  READY_FOR_DIAGNOSTIC = "ready_for_diagnostic",
  IN_DIAGNOSTICS = "in_diagnostics",
  WAITING_FOR_APPROVAL = "waiting_for_approval",
  BOSCH_APPROVAL_PENDING = "bosch_approval_pending",
  CUSTOMER_APPROVAL_PENDING = "customer_approval_pending",
  MULTIPLE_APPROVAL_PENDING = "multiple_approval_pending",
  READY_FOR_REPAIR = "ready_for_repair",
  IN_REPAIR = "in_repair",
  REPAIR_DONE = "repair_done",
  DELIVERED = "delivered",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  ON_HOLD = "on_hold",
}
export const JOB_STATUSES: readonly JobStatus[] = Object.freeze(Object.values(JobStatus));

/** `claim_status` parameter. */
export enum ClaimStatus {
  CREATED = "created",
  SUBMITTED = "submitted",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  REVISED = "revised",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}
export const CLAIM_STATUSES: readonly ClaimStatus[] = Object.freeze(Object.values(ClaimStatus));

/** `claim_action` parameter — only on `claim_reviewed`. */
export enum ClaimAction {
  APPROVED = "approved",
  REJECTED = "rejected",
  REVISED = "revised",
}
export const CLAIM_ACTIONS: readonly ClaimAction[] = Object.freeze(Object.values(ClaimAction));

/** `pre_approval_action` parameter — only on `pre_approval_reviewed`. */
export enum PreApprovalAction {
  APPROVED = "approved",
  REJECTED = "rejected",
  REVISED = "revised",
}
export const PRE_APPROVAL_ACTIONS: readonly PreApprovalAction[] = Object.freeze(
  Object.values(PreApprovalAction),
);

/** `completion_type` parameter — only on `job_completed`. */
export enum CompletionType {
  DELIVERED = "delivered",
  NO_REPAIR_RETURN_WITH_ASSEMBLY = "no_repair_return_with_assembly",
  NO_REPAIR_RETURN_WITHOUT_ASSEMBLY = "no_repair_return_without_assembly",
  SCRAP_DISPOSAL = "scrap_disposal",
  EXCHANGE = "exchange",
}
export const COMPLETION_TYPES: readonly CompletionType[] = Object.freeze(
  Object.values(CompletionType),
);

/** `note_context` parameter — selects whether job_status or claim_status applies. */
export enum NoteContext {
  JOB = "job",
  CLAIM = "claim",
}
export const NOTE_CONTEXTS: readonly NoteContext[] = Object.freeze(Object.values(NoteContext));

/** `virtual_url` values — functional screen paths (never technical routes or ids). */
export enum VirtualUrl {
  DASHBOARD = "/dashboard",
  JOB_LIST = "/job-list",
  CREATE_JOB = "/create-job",
  EDIT_JOB = "/edit-job",
  JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA = "/job-overview/customer-payment-data",
  JOB_OVERVIEW_ASSET_DATA = "/job-overview/asset-data",
  JOB_OVERVIEW_DOCUMENTS = "/job-overview/documents",
  JOB_OVERVIEW_DIAGNOSTIC_DATA = "/job-overview/diagnostic-data",
  JOB_OVERVIEW_NOTES = "/job-overview/notes",
  CLAIM_LIST = "/claim-list",
  CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA = "/claim-overview/customer-payment-data",
  CLAIM_OVERVIEW_ASSET_DATA = "/claim-overview/asset-data",
  CLAIM_OVERVIEW_DOCUMENTS = "/claim-overview/documents",
  CLAIM_OVERVIEW_DIAGNOSTIC_DATA = "/claim-overview/diagnostic-data",
  CLAIM_OVERVIEW_CLAIMS = "/claim-overview/claims",
  CLAIM_OVERVIEW_NOTES = "/claim-overview/notes",
  PRE_APPROVAL_LIST = "/pre-approval-list",
  CLIENTS = "/clients",
  REPORTS = "/reports",
  BIQIC_REPORT = "/biqic-report",
  REIMBURSEMENT = "/reimbursement",
  USER_MANAGEMENT = "/user-management",
}

/** `page_name` parameter for pageviews + help events. */
export enum PageName {
  DASHBOARD = "Dashboard",
  JOB_LIST = "Job List",
  CREATE_JOB = "Create Job",
  EDIT_JOB = "Edit Draft Job",
  JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA = "Job Overview - Customer & Payment Data",
  JOB_OVERVIEW_ASSET_DATA = "Job Overview - Asset Data",
  JOB_OVERVIEW_DOCUMENTS = "Job Overview - Documents",
  JOB_OVERVIEW_DIAGNOSTIC_DATA = "Job Overview - Diagnostic Data",
  JOB_OVERVIEW_NOTES = "Job Overview - Notes",
  CLAIM_LIST = "Claim List",
  CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA = "Claim Overview - Customer & Payment Data",
  CLAIM_OVERVIEW_ASSET_DATA = "Claim Overview - Asset Data",
  CLAIM_OVERVIEW_DOCUMENTS = "Claim Overview - Documents",
  CLAIM_OVERVIEW_DIAGNOSTIC_DATA = "Claim Overview - Diagnostic Data",
  CLAIM_OVERVIEW_CLAIMS = "Claim Overview - Claims",
  CLAIM_OVERVIEW_NOTES = "Claim Overview - Notes",
  PRE_APPROVAL_LIST = "Pre-approval List",
  CLIENTS = "Clients",
  REPORTS = "Reports",
  BIQIC_REPORT = "BIQIC Report",
  REIMBURSEMENT = "Reimbursement",
  USER_MANAGEMENT = "User Management",
}

/** `module_name` parameter for pageviews + help events. */
export enum ModuleName {
  DASHBOARD = "Dashboard",
  JOB_MANAGEMENT = "Job Management",
  JOB_MANAGEMENT_JOB_CREATION = "Job Management / Job Creation",
  JOB_MANAGEMENT_DRAFT_JOB = "Job Management / Draft Job",
  JOB_OVERVIEW = "Job Overview",
  JOB_OVERVIEW_DIAGNOSTIC = "Job Overview / Diagnostic",
  JOB_OVERVIEW_NOTES = "Job Overview / Notes",
  CLAIM_MANAGEMENT = "Claim Management",
  CLAIM_MANAGEMENT_PRE_APPROVAL = "Claim Management / Pre-approval",
  CLAIM_OVERVIEW = "Claim Overview",
  CLAIM_OVERVIEW_DIAGNOSTIC = "Claim Overview / Diagnostic",
  CLAIM_OVERVIEW_CLAIMS = "Claim Overview / Claims",
  CLAIM_OVERVIEW_NOTES = "Claim Overview / Notes",
  CLIENTS = "Clients",
  REPORTS = "Reports",
  REPORTS_BIQIC = "Reports / BIQIC",
  REIMBURSEMENT = "Reimbursement",
  USER_MANAGEMENT = "User Management",
}
