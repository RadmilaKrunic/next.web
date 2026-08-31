import { describe, it, expect } from "vitest";
import { serializeEventPayload } from "./serialize";
import {
  AnalyticsEventName,
  ClaimAction,
  ClaimStatus,
  CompletionType,
  JobStatus,
  JobType,
  NoteContext,
  PreApprovalAction,
} from "../domain/enums";

describe("serializeEventPayload", () => {
  it("maps job_created payload fields to snake_case parameter keys", () => {
    const bag = serializeEventPayload({
      name: AnalyticsEventName.JOB_CREATED,
      payload: {
        jobType: JobType.WARRANTY,
        jobStatus: JobStatus.READY_FOR_DIAGNOSTIC,
        jobCreationDurationSeconds: 420,
      },
    });
    expect(bag).toEqual({
      job_type: "warranty",
      job_status: "ready_for_diagnostic",
      job_creation_duration_seconds: 420,
    });
  });

  it("includes completion_type only for job_completed", () => {
    const bag = serializeEventPayload({
      name: AnalyticsEventName.JOB_COMPLETED,
      payload: {
        jobType: JobType.WARRANTY,
        jobStatus: JobStatus.DELIVERED,
        completionType: CompletionType.DELIVERED,
      },
    });
    expect(bag).toMatchObject({ completion_type: "delivered", job_status: "delivered" });
  });

  it("maps claim_reviewed with action and duration", () => {
    const bag = serializeEventPayload({
      name: AnalyticsEventName.CLAIM_REVIEWED,
      payload: {
        claimStatus: ClaimStatus.APPROVED,
        claimAction: ClaimAction.APPROVED,
        jobType: JobType.WARRANTY,
        claimReviewDurationSeconds: 86400,
      },
    });
    expect(bag).toEqual({
      claim_status: "approved",
      claim_action: "approved",
      job_type: "warranty",
      claim_review_duration_seconds: 86400,
    });
  });

  it("maps pre_approval_reviewed with the pre_approval_action", () => {
    const bag = serializeEventPayload({
      name: AnalyticsEventName.PRE_APPROVAL_REVIEWED,
      payload: {
        jobType: JobType.COMMERCIAL_GOODWILL,
        jobStatus: JobStatus.READY_FOR_REPAIR,
        preApprovalAction: PreApprovalAction.APPROVED,
        preApprovalReviewDurationSeconds: 43200,
      },
    });
    expect(bag).toMatchObject({
      pre_approval_action: "approved",
      pre_approval_review_duration_seconds: 43200,
    });
  });

  it("emits job_status/job_type for a job note", () => {
    const bag = serializeEventPayload({
      name: AnalyticsEventName.NOTE_ADDED,
      payload: {
        noteContext: NoteContext.JOB,
        jobStatus: JobStatus.IN_REPAIR,
        jobType: JobType.WARRANTY,
      },
    });
    expect(bag).toEqual({ note_context: "job", job_status: "in_repair", job_type: "warranty" });
  });

  it("emits claim_status for a claim note (and never job fields)", () => {
    const bag = serializeEventPayload({
      name: AnalyticsEventName.NOTE_ADDED,
      payload: { noteContext: NoteContext.CLAIM, claimStatus: ClaimStatus.PENDING },
    });
    expect(bag).toEqual({ note_context: "claim", claim_status: "pending" });
    expect(bag).not.toHaveProperty("job_status");
  });

  it("omits page descriptors from virtual_page_view (they come from context)", () => {
    const bag = serializeEventPayload({
      name: AnalyticsEventName.VIRTUAL_PAGE_VIEW,
      payload: { jobStatus: JobStatus.IN_DIAGNOSTICS },
    });
    expect(bag).toEqual({ job_status: "in_diagnostics", claim_status: undefined });
    expect(bag).not.toHaveProperty("page_name");
  });
});
