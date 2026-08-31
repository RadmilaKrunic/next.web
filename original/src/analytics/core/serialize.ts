import { AnalyticsEventName, NoteContext } from "../domain/enums";
import {
  AnalyticsParameterKey as P,
  type AnalyticsEvent,
  type AnalyticsParameterBag,
  type DataLayerEvent,
  type DataLayerValue,
} from "../domain/types";

/**
 * Maps an event's camelCase payload to a snake_case parameter bag (context is added
 * separately by the enricher). The exhaustive `switch` makes a new event a compile error.
 */
export const serializeEventPayload = (event: AnalyticsEvent): AnalyticsParameterBag => {
  switch (event.name) {
    case AnalyticsEventName.JOB_CREATED: {
      const p = event.payload;
      return {
        [P.JOB_TYPE]: p.jobType,
        [P.JOB_STATUS]: p.jobStatus,
        [P.JOB_CREATION_DURATION_SECONDS]: p.jobCreationDurationSeconds,
      };
    }
    case AnalyticsEventName.JOB_SAVED_AS_DRAFT:
    case AnalyticsEventName.DIAGNOSTIC_VALIDATED:
    case AnalyticsEventName.JOB_SUBMITTED_FOR_REVIEW:
    case AnalyticsEventName.JOB_APPROVED_FOR_REPAIR:
    case AnalyticsEventName.REPAIR_STARTED:
    case AnalyticsEventName.REPAIR_FINISHED:
    case AnalyticsEventName.PRE_APPROVAL_REQUESTED: {
      const p = event.payload;
      return { [P.JOB_TYPE]: p.jobType, [P.JOB_STATUS]: p.jobStatus };
    }
    case AnalyticsEventName.JOB_COMPLETED: {
      const p = event.payload;
      return {
        [P.JOB_TYPE]: p.jobType,
        [P.JOB_STATUS]: p.jobStatus,
        [P.COMPLETION_TYPE]: p.completionType,
      };
    }
    case AnalyticsEventName.CLAIM_REVIEWED: {
      const p = event.payload;
      return {
        [P.CLAIM_STATUS]: p.claimStatus,
        [P.CLAIM_ACTION]: p.claimAction,
        [P.JOB_TYPE]: p.jobType,
        [P.CLAIM_REVIEW_DURATION_SECONDS]: p.claimReviewDurationSeconds,
      };
    }
    case AnalyticsEventName.PRE_APPROVAL_REVIEWED: {
      const p = event.payload;
      return {
        [P.JOB_STATUS]: p.jobStatus,
        [P.JOB_TYPE]: p.jobType,
        [P.PRE_APPROVAL_ACTION]: p.preApprovalAction,
        [P.PRE_APPROVAL_REVIEW_DURATION_SECONDS]: p.preApprovalReviewDurationSeconds,
      };
    }
    case AnalyticsEventName.NOTE_ADDED: {
      const p = event.payload;
      if (p.noteContext === NoteContext.JOB) {
        return {
          [P.NOTE_CONTEXT]: p.noteContext,
          [P.JOB_STATUS]: p.jobStatus,
          [P.JOB_TYPE]: p.jobType,
        };
      }
      return { [P.NOTE_CONTEXT]: p.noteContext, [P.CLAIM_STATUS]: p.claimStatus };
    }
    case AnalyticsEventName.HELP_CENTER_CLICKED: {
      const p = event.payload; // page_name/module_name come from context
      return {
        [P.JOB_STATUS]: p.jobStatus,
        [P.CLAIM_STATUS]: p.claimStatus,
        [P.JOB_TYPE]: p.jobType,
      };
    }
    case AnalyticsEventName.VIRTUAL_PAGE_VIEW: {
      const p = event.payload; // virtual_url/page_name/module_name come from context
      return { [P.JOB_STATUS]: p.jobStatus, [P.CLAIM_STATUS]: p.claimStatus };
    }
    default:
      return assertNever(event);
  }
};

export const buildDataLayerEvent = (
  eventName: AnalyticsEventName,
  ...bags: readonly AnalyticsParameterBag[]
): DataLayerEvent => {
  const merged: Record<string, DataLayerValue> = {};
  for (const bag of bags) {
    for (const [key, value] of Object.entries(bag)) {
      if (value !== undefined) merged[key] = value;
    }
  }
  return { [P.EVENT]: eventName, ...merged };
};

export const assertNever = (value: never): never => {
  throw new Error(`Unexpected value: ${String(value)}`);
};
