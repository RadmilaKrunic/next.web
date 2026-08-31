import { AnalyticsEventName, ModuleName, PageName, VirtualUrl } from "../domain/enums";
import { AnalyticsParameterKey as P, type VirtualPageDefinition } from "../domain/types";

export interface EventDefinition {
  readonly name: AnalyticsEventName;
  readonly requiredParameters: readonly P[];
  readonly optionalParameters: readonly P[];
  readonly requiresPageDescriptor: boolean;
}

const COMMON_REQUIRED: readonly P[] = Object.freeze([
  P.ENVIRONMENT,
  P.LANGUAGE,
  P.VIRTUAL_URL,
  P.USER_ROLE,
  P.LOCAL_TIME_HOUR,
  P.LOCAL_DAY_OF_WEEK,
]);
const COMMON_OPTIONAL: readonly P[] = Object.freeze([P.COUNTRY_CODE, P.ASC_ID]);
const JOB_WORKFLOW_REQUIRED: readonly P[] = Object.freeze([
  ...COMMON_REQUIRED,
  P.JOB_STATUS,
  P.JOB_TYPE,
]);

const define = (
  name: AnalyticsEventName,
  requiredParameters: readonly P[],
  optionalParameters: readonly P[],
  requiresPageDescriptor = false,
): EventDefinition =>
  Object.freeze({ name, requiredParameters, optionalParameters, requiresPageDescriptor });

export const EVENT_REGISTRY: Readonly<Record<AnalyticsEventName, EventDefinition>> = Object.freeze({
  [AnalyticsEventName.VIRTUAL_PAGE_VIEW]: define(
    AnalyticsEventName.VIRTUAL_PAGE_VIEW,
    [...COMMON_REQUIRED, P.PAGE_NAME, P.MODULE_NAME],
    [...COMMON_OPTIONAL, P.JOB_STATUS, P.CLAIM_STATUS],
    true,
  ),
  [AnalyticsEventName.JOB_CREATED]: define(
    AnalyticsEventName.JOB_CREATED,
    [...COMMON_REQUIRED, P.JOB_STATUS],
    [...COMMON_OPTIONAL, P.JOB_TYPE, P.JOB_CREATION_DURATION_SECONDS],
  ),
  [AnalyticsEventName.JOB_SAVED_AS_DRAFT]: define(
    AnalyticsEventName.JOB_SAVED_AS_DRAFT,
    [...COMMON_REQUIRED, P.JOB_STATUS],
    [...COMMON_OPTIONAL, P.JOB_TYPE],
  ),
  [AnalyticsEventName.DIAGNOSTIC_VALIDATED]: define(
    AnalyticsEventName.DIAGNOSTIC_VALIDATED,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.JOB_SUBMITTED_FOR_REVIEW]: define(
    AnalyticsEventName.JOB_SUBMITTED_FOR_REVIEW,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.JOB_APPROVED_FOR_REPAIR]: define(
    AnalyticsEventName.JOB_APPROVED_FOR_REPAIR,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.REPAIR_STARTED]: define(
    AnalyticsEventName.REPAIR_STARTED,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.REPAIR_FINISHED]: define(
    AnalyticsEventName.REPAIR_FINISHED,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.JOB_COMPLETED]: define(
    AnalyticsEventName.JOB_COMPLETED,
    JOB_WORKFLOW_REQUIRED,
    [...COMMON_OPTIONAL, P.COMPLETION_TYPE],
  ),
  [AnalyticsEventName.CLAIM_REVIEWED]: define(
    AnalyticsEventName.CLAIM_REVIEWED,
    [...COMMON_REQUIRED, P.CLAIM_STATUS, P.CLAIM_ACTION],
    [...COMMON_OPTIONAL, P.JOB_TYPE, P.CLAIM_REVIEW_DURATION_SECONDS],
  ),
  [AnalyticsEventName.PRE_APPROVAL_REQUESTED]: define(
    AnalyticsEventName.PRE_APPROVAL_REQUESTED,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.PRE_APPROVAL_REVIEWED]: define(
    AnalyticsEventName.PRE_APPROVAL_REVIEWED,
    [...COMMON_REQUIRED, P.JOB_STATUS, P.PRE_APPROVAL_ACTION],
    [...COMMON_OPTIONAL, P.JOB_TYPE, P.PRE_APPROVAL_REVIEW_DURATION_SECONDS],
  ),
  [AnalyticsEventName.NOTE_ADDED]: define(
    AnalyticsEventName.NOTE_ADDED,
    [...COMMON_REQUIRED, P.NOTE_CONTEXT],
    [...COMMON_OPTIONAL, P.JOB_STATUS, P.CLAIM_STATUS, P.JOB_TYPE],
  ),
  [AnalyticsEventName.HELP_CENTER_CLICKED]: define(
    AnalyticsEventName.HELP_CENTER_CLICKED,
    [...COMMON_REQUIRED, P.PAGE_NAME, P.MODULE_NAME],
    [...COMMON_OPTIONAL, P.JOB_STATUS, P.CLAIM_STATUS, P.JOB_TYPE],
    true,
  ),
});

export const getAllowedParameters = (name: AnalyticsEventName): readonly P[] => {
  const def = EVENT_REGISTRY[name];
  return [P.EVENT, ...def.requiredParameters, ...def.optionalParameters];
};

export const VIRTUAL_PAGE_REGISTRY: Readonly<Record<VirtualUrl, VirtualPageDefinition>> =
  Object.freeze({
    [VirtualUrl.DASHBOARD]: {
      reference: "VPV_001",
      virtualUrl: VirtualUrl.DASHBOARD,
      pageName: PageName.DASHBOARD,
      moduleName: ModuleName.DASHBOARD,
    },
    [VirtualUrl.JOB_LIST]: {
      reference: "VPV_002",
      virtualUrl: VirtualUrl.JOB_LIST,
      pageName: PageName.JOB_LIST,
      moduleName: ModuleName.JOB_MANAGEMENT,
    },
    [VirtualUrl.CREATE_JOB]: {
      reference: "VPV_003",
      virtualUrl: VirtualUrl.CREATE_JOB,
      pageName: PageName.CREATE_JOB,
      moduleName: ModuleName.JOB_MANAGEMENT_JOB_CREATION,
    },
    [VirtualUrl.EDIT_JOB]: {
      reference: "VPV_004",
      virtualUrl: VirtualUrl.EDIT_JOB,
      pageName: PageName.EDIT_JOB,
      moduleName: ModuleName.JOB_MANAGEMENT_DRAFT_JOB,
    },
    [VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA]: {
      reference: "VPV_005",
      virtualUrl: VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      pageName: PageName.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      moduleName: ModuleName.JOB_OVERVIEW,
    },
    [VirtualUrl.JOB_OVERVIEW_ASSET_DATA]: {
      reference: "VPV_006",
      virtualUrl: VirtualUrl.JOB_OVERVIEW_ASSET_DATA,
      pageName: PageName.JOB_OVERVIEW_ASSET_DATA,
      moduleName: ModuleName.JOB_OVERVIEW,
    },
    [VirtualUrl.JOB_OVERVIEW_DOCUMENTS]: {
      reference: "VPV_007",
      virtualUrl: VirtualUrl.JOB_OVERVIEW_DOCUMENTS,
      pageName: PageName.JOB_OVERVIEW_DOCUMENTS,
      moduleName: ModuleName.JOB_OVERVIEW,
    },
    [VirtualUrl.JOB_OVERVIEW_DIAGNOSTIC_DATA]: {
      reference: "VPV_008",
      virtualUrl: VirtualUrl.JOB_OVERVIEW_DIAGNOSTIC_DATA,
      pageName: PageName.JOB_OVERVIEW_DIAGNOSTIC_DATA,
      moduleName: ModuleName.JOB_OVERVIEW_DIAGNOSTIC,
    },
    [VirtualUrl.JOB_OVERVIEW_NOTES]: {
      reference: "VPV_009",
      virtualUrl: VirtualUrl.JOB_OVERVIEW_NOTES,
      pageName: PageName.JOB_OVERVIEW_NOTES,
      moduleName: ModuleName.JOB_OVERVIEW_NOTES,
    },
    [VirtualUrl.CLAIM_LIST]: {
      reference: "VPV_010",
      virtualUrl: VirtualUrl.CLAIM_LIST,
      pageName: PageName.CLAIM_LIST,
      moduleName: ModuleName.CLAIM_MANAGEMENT,
    },
    [VirtualUrl.CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA]: {
      reference: "VPV_011",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      pageName: PageName.CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      moduleName: ModuleName.CLAIM_OVERVIEW,
    },
    [VirtualUrl.CLAIM_OVERVIEW_ASSET_DATA]: {
      reference: "VPV_012",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_ASSET_DATA,
      pageName: PageName.CLAIM_OVERVIEW_ASSET_DATA,
      moduleName: ModuleName.CLAIM_OVERVIEW,
    },
    [VirtualUrl.CLAIM_OVERVIEW_DOCUMENTS]: {
      reference: "VPV_013",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_DOCUMENTS,
      pageName: PageName.CLAIM_OVERVIEW_DOCUMENTS,
      moduleName: ModuleName.CLAIM_OVERVIEW,
    },
    [VirtualUrl.CLAIM_OVERVIEW_DIAGNOSTIC_DATA]: {
      reference: "VPV_014",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_DIAGNOSTIC_DATA,
      pageName: PageName.CLAIM_OVERVIEW_DIAGNOSTIC_DATA,
      moduleName: ModuleName.CLAIM_OVERVIEW_DIAGNOSTIC,
    },
    [VirtualUrl.CLAIM_OVERVIEW_CLAIMS]: {
      reference: "VPV_015",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_CLAIMS,
      pageName: PageName.CLAIM_OVERVIEW_CLAIMS,
      moduleName: ModuleName.CLAIM_OVERVIEW_CLAIMS,
    },
    [VirtualUrl.CLAIM_OVERVIEW_NOTES]: {
      reference: "VPV_016",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_NOTES,
      pageName: PageName.CLAIM_OVERVIEW_NOTES,
      moduleName: ModuleName.CLAIM_OVERVIEW_NOTES,
    },
    [VirtualUrl.PRE_APPROVAL_LIST]: {
      reference: "VPV_017",
      virtualUrl: VirtualUrl.PRE_APPROVAL_LIST,
      pageName: PageName.PRE_APPROVAL_LIST,
      moduleName: ModuleName.CLAIM_MANAGEMENT_PRE_APPROVAL,
    },
    [VirtualUrl.CLIENTS]: {
      reference: "VPV_018",
      virtualUrl: VirtualUrl.CLIENTS,
      pageName: PageName.CLIENTS,
      moduleName: ModuleName.CLIENTS,
    },
    [VirtualUrl.REPORTS]: {
      reference: "VPV_019",
      virtualUrl: VirtualUrl.REPORTS,
      pageName: PageName.REPORTS,
      moduleName: ModuleName.REPORTS,
    },
    [VirtualUrl.BIQIC_REPORT]: {
      reference: "VPV_020",
      virtualUrl: VirtualUrl.BIQIC_REPORT,
      pageName: PageName.BIQIC_REPORT,
      moduleName: ModuleName.REPORTS_BIQIC,
    },
    [VirtualUrl.REIMBURSEMENT]: {
      reference: "VPV_021",
      virtualUrl: VirtualUrl.REIMBURSEMENT,
      pageName: PageName.REIMBURSEMENT,
      moduleName: ModuleName.REIMBURSEMENT,
    },
    [VirtualUrl.USER_MANAGEMENT]: {
      reference: "VPV_022",
      virtualUrl: VirtualUrl.USER_MANAGEMENT,
      pageName: PageName.USER_MANAGEMENT,
      moduleName: ModuleName.USER_MANAGEMENT,
    },
  });

// ── Route mapping: router path (+ tab #hash) → VirtualUrl ──────────────────────

interface StaticRouteRule {
  readonly pattern: string;
  readonly virtualUrl: VirtualUrl;
}

interface TabbedRouteRule {
  readonly pattern: string;
  /** Tab hash (without `#`) → virtual page. */
  readonly tabHashToVirtualUrl: Readonly<Record<string, VirtualUrl>>;
  /** Used when the hash is absent/unknown. */
  readonly defaultVirtualUrl: VirtualUrl;
}

/** Routes with no virtual page in scope are intentionally absent (no pageview). */
export const STATIC_ROUTE_RULES: readonly StaticRouteRule[] = Object.freeze([
  { pattern: "/", virtualUrl: VirtualUrl.DASHBOARD },
  { pattern: "/dashboard", virtualUrl: VirtualUrl.DASHBOARD },
  { pattern: "/job-list", virtualUrl: VirtualUrl.JOB_LIST },
  { pattern: "/create-job", virtualUrl: VirtualUrl.CREATE_JOB },
  { pattern: "/edit-order/:orderId", virtualUrl: VirtualUrl.EDIT_JOB },
  { pattern: "/claim-list", virtualUrl: VirtualUrl.CLAIM_LIST },
  { pattern: "/approval-list", virtualUrl: VirtualUrl.PRE_APPROVAL_LIST },
  { pattern: "/pre-approval-list", virtualUrl: VirtualUrl.PRE_APPROVAL_LIST },
  { pattern: "/clients", virtualUrl: VirtualUrl.CLIENTS },
  { pattern: "/reports", virtualUrl: VirtualUrl.REPORTS },
  { pattern: "/biqic-report", virtualUrl: VirtualUrl.BIQIC_REPORT },
  { pattern: "/reimbursement", virtualUrl: VirtualUrl.REIMBURSEMENT },
  { pattern: "/user-management", virtualUrl: VirtualUrl.USER_MANAGEMENT },
]);

export const TABBED_ROUTE_RULES: readonly TabbedRouteRule[] = Object.freeze([
  {
    pattern: "/job-overview/:jobId",
    defaultVirtualUrl: VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
    tabHashToVirtualUrl: {
      customerAndPaymentData: VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      assetData: VirtualUrl.JOB_OVERVIEW_ASSET_DATA,
      documents: VirtualUrl.JOB_OVERVIEW_DOCUMENTS,
      diagnosticData: VirtualUrl.JOB_OVERVIEW_DIAGNOSTIC_DATA,
      notes: VirtualUrl.JOB_OVERVIEW_NOTES,
    },
  },
  {
    pattern: "/claim-overview/:claimId",
    defaultVirtualUrl: VirtualUrl.CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA,
    tabHashToVirtualUrl: {
      customerAndPaymentData: VirtualUrl.CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      assetData: VirtualUrl.CLAIM_OVERVIEW_ASSET_DATA,
      documents: VirtualUrl.CLAIM_OVERVIEW_DOCUMENTS,
      diagnosticData: VirtualUrl.CLAIM_OVERVIEW_DIAGNOSTIC_DATA,
      claims: VirtualUrl.CLAIM_OVERVIEW_CLAIMS,
      notes: VirtualUrl.CLAIM_OVERVIEW_NOTES,
    },
  },
]);
