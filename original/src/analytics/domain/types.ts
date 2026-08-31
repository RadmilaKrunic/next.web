import type {
  AnalyticsEnvironment,
  ClaimAction,
  ClaimStatus,
  CompletionType,
  JobStatus,
  JobType,
  ModuleName,
  NoteContext,
  PageName,
  PreApprovalAction,
  UserRole,
  VirtualUrl,
} from "./enums";
import { AnalyticsEventName } from "./enums";

export enum AnalyticsParameterKey {
  EVENT = "event",
  ENVIRONMENT = "environment",
  LANGUAGE = "language",
  VIRTUAL_URL = "virtual_url",
  PAGE_NAME = "page_name",
  MODULE_NAME = "module_name",
  LOCAL_TIME_HOUR = "local_time_hour",
  LOCAL_DAY_OF_WEEK = "local_day_of_week",
  USER_ROLE = "user_role",
  COUNTRY_CODE = "country_code",
  ASC_ID = "asc_id",
  JOB_STATUS = "job_status",
  CLAIM_STATUS = "claim_status",
  JOB_TYPE = "job_type",
  CLAIM_ACTION = "claim_action",
  PRE_APPROVAL_ACTION = "pre_approval_action",
  COMPLETION_TYPE = "completion_type",
  NOTE_CONTEXT = "note_context",
  JOB_CREATION_DURATION_SECONDS = "job_creation_duration_seconds",
  CLAIM_REVIEW_DURATION_SECONDS = "claim_review_duration_seconds",
  PRE_APPROVAL_REVIEW_DURATION_SECONDS = "pre_approval_review_duration_seconds",
}

/** Primitive value types allowed in a push. `undefined` is stripped before pushing. */
export type DataLayerValue = string | number | boolean | null;

/** A partial, immutable bag of parameters. Merged into a {@link DataLayerEvent}. */
export type AnalyticsParameterBag = Readonly<
  Partial<Record<AnalyticsParameterKey, DataLayerValue>>
>;

/** A fully-assembled object ready to push; always carries a discriminating `event`. */
export type DataLayerEvent = AnalyticsParameterBag & { readonly event: AnalyticsEventName };

/** One entry in `window.dataLayer` — our pushes or GTM's own bookkeeping records. */
export type DataLayerEntry = DataLayerEvent | Readonly<Record<string, unknown>>;

export interface AnalyticsContextSnapshot {
  readonly environment: AnalyticsEnvironment;
  readonly language: string;
  readonly userRole: UserRole;
  readonly countryCode?: string;
  readonly ascId?: string;
  readonly virtualUrl?: VirtualUrl | string;
  readonly pageName?: PageName | string;
  readonly moduleName?: ModuleName | string;
}

export interface VirtualPageDefinition {
  readonly reference: string;
  readonly virtualUrl: VirtualUrl;
  readonly pageName: PageName;
  readonly moduleName: ModuleName;
}

export interface JobEventPayload {
  readonly jobType: JobType;
  readonly jobStatus: JobStatus;
}

export interface JobCreatedPayload {
  readonly jobStatus: JobStatus;
  readonly jobType?: JobType;
  readonly jobCreationDurationSeconds?: number;
}

export interface JobSavedAsDraftPayload {
  readonly jobStatus: JobStatus;
  readonly jobType?: JobType;
}

export type DiagnosticValidatedPayload = JobEventPayload;
export type JobSubmittedForReviewPayload = JobEventPayload;
export type JobApprovedForRepairPayload = JobEventPayload;
export type RepairStartedPayload = JobEventPayload;
export type RepairFinishedPayload = JobEventPayload;

export interface JobCompletedPayload extends JobEventPayload {
  readonly completionType?: CompletionType;
}

export interface ClaimReviewedPayload {
  readonly claimStatus: ClaimStatus;
  readonly claimAction: ClaimAction;
  readonly jobType?: JobType;
  readonly claimReviewDurationSeconds?: number;
}

export type PreApprovalRequestedPayload = JobEventPayload;

export interface PreApprovalReviewedPayload {
  readonly jobStatus: JobStatus;
  readonly preApprovalAction: PreApprovalAction;
  readonly jobType?: JobType;
  readonly preApprovalReviewDurationSeconds?: number;
}

interface JobNoteAddedPayload {
  readonly noteContext: NoteContext.JOB;
  readonly jobStatus?: JobStatus;
  readonly jobType?: JobType;
}

interface ClaimNoteAddedPayload {
  readonly noteContext: NoteContext.CLAIM;
  readonly claimStatus?: ClaimStatus;
}

export type NoteAddedPayload = JobNoteAddedPayload | ClaimNoteAddedPayload;

export interface HelpCenterClickedPayload {
  readonly jobStatus?: JobStatus;
  readonly claimStatus?: ClaimStatus;
  readonly jobType?: JobType;
}

export interface VirtualPageViewPayload {
  readonly jobStatus?: JobStatus;
  readonly claimStatus?: ClaimStatus;
}

export type AnalyticsEvent =
  | { readonly name: AnalyticsEventName.JOB_CREATED; readonly payload: JobCreatedPayload }
  | {
      readonly name: AnalyticsEventName.JOB_SAVED_AS_DRAFT;
      readonly payload: JobSavedAsDraftPayload;
    }
  | {
      readonly name: AnalyticsEventName.DIAGNOSTIC_VALIDATED;
      readonly payload: DiagnosticValidatedPayload;
    }
  | {
      readonly name: AnalyticsEventName.JOB_SUBMITTED_FOR_REVIEW;
      readonly payload: JobSubmittedForReviewPayload;
    }
  | {
      readonly name: AnalyticsEventName.JOB_APPROVED_FOR_REPAIR;
      readonly payload: JobApprovedForRepairPayload;
    }
  | { readonly name: AnalyticsEventName.REPAIR_STARTED; readonly payload: RepairStartedPayload }
  | { readonly name: AnalyticsEventName.REPAIR_FINISHED; readonly payload: RepairFinishedPayload }
  | { readonly name: AnalyticsEventName.JOB_COMPLETED; readonly payload: JobCompletedPayload }
  | { readonly name: AnalyticsEventName.CLAIM_REVIEWED; readonly payload: ClaimReviewedPayload }
  | {
      readonly name: AnalyticsEventName.PRE_APPROVAL_REQUESTED;
      readonly payload: PreApprovalRequestedPayload;
    }
  | {
      readonly name: AnalyticsEventName.PRE_APPROVAL_REVIEWED;
      readonly payload: PreApprovalReviewedPayload;
    }
  | { readonly name: AnalyticsEventName.NOTE_ADDED; readonly payload: NoteAddedPayload }
  | {
      readonly name: AnalyticsEventName.HELP_CENTER_CLICKED;
      readonly payload: HelpCenterClickedPayload;
    }
  | {
      readonly name: AnalyticsEventName.VIRTUAL_PAGE_VIEW;
      readonly payload: VirtualPageViewPayload;
    };
