import { describe, it, expect, beforeEach } from "vitest";
import { createTestAnalytics, type TestAnalyticsHarness } from "../testing";
import { AnalyticsEventValidator } from "./validate";
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

const BUSINESS_EVENT_NAMES = Object.values(AnalyticsEventName).filter(
  (name) => name !== AnalyticsEventName.VIRTUAL_PAGE_VIEW,
);

const validator = new AnalyticsEventValidator();

describe("Analytics facade — every business event", () => {
  let harness: TestAnalyticsHarness;
  beforeEach(() => {
    harness = createTestAnalytics();
  });

  const commonContext = {
    environment: "DEV",
    language: "en-US",
    user_role: "asc_technician",
    country_code: "TR",
    asc_id: "ASC_TR_001",
    local_time_hour: "09AM",
    local_day_of_week: "Monday",
  };

  it("job_created carries job context, duration and full common context", () => {
    harness.analytics.trackJobCreated({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.READY_FOR_DIAGNOSTIC,
      jobCreationDurationSeconds: 420,
    });
    expect(harness.transport.last).toMatchObject({
      ...commonContext,
      event: AnalyticsEventName.JOB_CREATED,
      virtual_url: "/dashboard",
      job_type: "warranty",
      job_status: "ready_for_diagnostic",
      job_creation_duration_seconds: 420,
    });
  });

  it("job_saved_as_draft", () => {
    harness.analytics.trackJobSavedAsDraft({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.DRAFT,
    });
    expect(harness.transport.last).toMatchObject({
      event: "job_saved_as_draft",
      job_status: "draft",
    });
  });

  it("diagnostic_validated", () => {
    harness.analytics.trackDiagnosticValidated({
      jobType: JobType.CHARGEABLE,
      jobStatus: JobStatus.IN_DIAGNOSTICS,
    });
    expect(harness.transport.last).toMatchObject({
      event: "diagnostic_validated",
      job_type: "chargeable",
    });
  });

  it("job_submitted_for_review", () => {
    harness.analytics.trackJobSubmittedForReview({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.WAITING_FOR_APPROVAL,
    });
    expect(harness.transport.last?.event).toBe("job_submitted_for_review");
  });

  it("job_approved_for_repair", () => {
    harness.analytics.trackJobApprovedForRepair({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.READY_FOR_REPAIR,
    });
    expect(harness.transport.last).toMatchObject({
      event: "job_approved_for_repair",
      job_status: "ready_for_repair",
    });
  });

  it("repair_started / repair_finished", () => {
    harness.analytics.trackRepairStarted({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.IN_REPAIR,
    });
    expect(harness.transport.last).toMatchObject({
      event: "repair_started",
      job_status: "in_repair",
    });
    harness.analytics.trackRepairFinished({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.REPAIR_DONE,
    });
    expect(harness.transport.last).toMatchObject({
      event: "repair_finished",
      job_status: "repair_done",
    });
  });

  it("job_completed with completion_type", () => {
    harness.analytics.trackJobCompleted({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.DELIVERED,
      completionType: CompletionType.DELIVERED,
    });
    expect(harness.transport.last).toMatchObject({
      event: "job_completed",
      completion_type: "delivered",
    });
  });

  it("claim_reviewed with action + duration", () => {
    harness.analytics.trackClaimReviewed({
      claimStatus: ClaimStatus.APPROVED,
      claimAction: ClaimAction.APPROVED,
      jobType: JobType.WARRANTY,
      claimReviewDurationSeconds: 86400,
    });
    expect(harness.transport.last).toMatchObject({
      event: "claim_reviewed",
      claim_status: "approved",
      claim_action: "approved",
      claim_review_duration_seconds: 86400,
    });
  });

  it("pre_approval_requested / pre_approval_reviewed", () => {
    harness.analytics.trackPreApprovalRequested({
      jobType: JobType.COMMERCIAL_GOODWILL,
      jobStatus: JobStatus.BOSCH_APPROVAL_PENDING,
    });
    expect(harness.transport.last).toMatchObject({
      event: "pre_approval_requested",
      job_status: "bosch_approval_pending",
    });
    harness.analytics.trackPreApprovalReviewed({
      jobType: JobType.COMMERCIAL_GOODWILL,
      jobStatus: JobStatus.READY_FOR_REPAIR,
      preApprovalAction: PreApprovalAction.APPROVED,
      preApprovalReviewDurationSeconds: 43200,
    });
    expect(harness.transport.last).toMatchObject({
      event: "pre_approval_reviewed",
      pre_approval_action: "approved",
    });
  });

  it("note_added (job) carries job_status; (claim) carries claim_status", () => {
    harness.analytics.trackNoteAdded({
      noteContext: NoteContext.JOB,
      jobStatus: JobStatus.READY_FOR_REPAIR,
    });
    expect(harness.transport.last).toMatchObject({
      event: "note_added",
      note_context: "job",
      job_status: "ready_for_repair",
    });
    harness.analytics.trackNoteAdded({
      noteContext: NoteContext.CLAIM,
      claimStatus: ClaimStatus.PENDING,
    });
    expect(harness.transport.last).toMatchObject({
      event: "note_added",
      note_context: "claim",
      claim_status: "pending",
    });
  });

  it("help_center_clicked includes page_name & module_name from context", () => {
    harness.analytics.trackHelpCenterClicked({ jobStatus: JobStatus.IN_DIAGNOSTICS });
    expect(harness.transport.last).toMatchObject({
      event: "help_center_clicked",
      page_name: "Dashboard",
      module_name: "Dashboard",
      job_status: "in_diagnostics",
    });
  });

  it("virtual_page_view includes the page descriptors from context", () => {
    harness.analytics.trackVirtualPage();
    expect(harness.transport.last).toMatchObject({
      event: "virtual_page_view",
      virtual_url: "/dashboard",
      page_name: "Dashboard",
      module_name: "Dashboard",
    });
  });

  it("produces a valid push for every event (registry contract satisfied)", () => {
    harness.analytics.trackJobCreated({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.READY_FOR_DIAGNOSTIC,
    });
    harness.analytics.trackJobSavedAsDraft({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.DRAFT,
    });
    harness.analytics.trackDiagnosticValidated({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.IN_DIAGNOSTICS,
    });
    harness.analytics.trackJobSubmittedForReview({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.WAITING_FOR_APPROVAL,
    });
    harness.analytics.trackJobApprovedForRepair({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.READY_FOR_REPAIR,
    });
    harness.analytics.trackRepairStarted({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.IN_REPAIR,
    });
    harness.analytics.trackRepairFinished({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.REPAIR_DONE,
    });
    harness.analytics.trackJobCompleted({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.DELIVERED,
    });
    harness.analytics.trackClaimReviewed({
      claimStatus: ClaimStatus.APPROVED,
      claimAction: ClaimAction.APPROVED,
    });
    harness.analytics.trackPreApprovalRequested({
      jobType: JobType.COMMERCIAL_GOODWILL,
      jobStatus: JobStatus.BOSCH_APPROVAL_PENDING,
    });
    harness.analytics.trackPreApprovalReviewed({
      jobType: JobType.COMMERCIAL_GOODWILL,
      jobStatus: JobStatus.READY_FOR_REPAIR,
      preApprovalAction: PreApprovalAction.APPROVED,
    });
    harness.analytics.trackNoteAdded({
      noteContext: NoteContext.JOB,
      jobStatus: JobStatus.READY_FOR_REPAIR,
    });
    harness.analytics.trackHelpCenterClicked();

    const tracked = new Set(harness.transport.events.map((event) => event.event));
    for (const businessEvent of BUSINESS_EVENT_NAMES) {
      expect(tracked.has(businessEvent)).toBe(true);
    }
    for (const event of harness.transport.events) {
      expect(validator.validate(event).valid).toBe(true);
    }
  });

  it("matches the documented dataLayer shape for job_created (snapshot)", () => {
    harness.analytics.trackJobCreated({
      jobType: JobType.WARRANTY,
      jobStatus: JobStatus.READY_FOR_DIAGNOSTIC,
      jobCreationDurationSeconds: 420,
    });
    expect(harness.transport.last).toMatchSnapshot();
  });
});
