import { AnalyticsEventName } from "../domain/enums";
import type {
  AnalyticsContextSnapshot,
  AnalyticsEvent,
  ClaimReviewedPayload,
  DataLayerEvent,
  DiagnosticValidatedPayload,
  HelpCenterClickedPayload,
  JobApprovedForRepairPayload,
  JobCompletedPayload,
  JobCreatedPayload,
  JobSavedAsDraftPayload,
  JobSubmittedForReviewPayload,
  NoteAddedPayload,
  PreApprovalRequestedPayload,
  PreApprovalReviewedPayload,
  RepairFinishedPayload,
  RepairStartedPayload,
  VirtualPageViewPayload,
} from "../domain/types";
import { resolveAnalyticsConfig, ValidationMode, type AnalyticsConfig } from "../config/config";
import { EVENT_REGISTRY } from "../config/registries";
import { AnalyticsContextEnricher } from "./context";
import { buildDataLayerEvent, serializeEventPayload } from "./serialize";
import { AnalyticsEventValidator, type ValidationResult } from "./validate";
import { DataLayerTransport, type AnalyticsTransport } from "../infra/data-layer";
import { SystemClock, type AnalyticsClock } from "../infra/time";
import { ConsoleAnalyticsLogger, type AnalyticsLogger } from "../infra/logger";

export interface Analytics {
  trackJobCreated(payload: JobCreatedPayload): void;
  trackJobSavedAsDraft(payload: JobSavedAsDraftPayload): void;
  trackDiagnosticValidated(payload: DiagnosticValidatedPayload): void;
  trackJobSubmittedForReview(payload: JobSubmittedForReviewPayload): void;
  trackJobApprovedForRepair(payload: JobApprovedForRepairPayload): void;
  trackRepairStarted(payload: RepairStartedPayload): void;
  trackRepairFinished(payload: RepairFinishedPayload): void;
  trackJobCompleted(payload: JobCompletedPayload): void;
  trackClaimReviewed(payload: ClaimReviewedPayload): void;
  trackPreApprovalRequested(payload: PreApprovalRequestedPayload): void;
  trackPreApprovalReviewed(payload: PreApprovalReviewedPayload): void;
  trackNoteAdded(payload: NoteAddedPayload): void;
  trackHelpCenterClicked(payload?: HelpCenterClickedPayload): void;
  trackVirtualPage(payload?: VirtualPageViewPayload): void;
}

export interface AnalyticsContextSource {
  getSnapshot(): AnalyticsContextSnapshot | null;
}

class AnalyticsFacade implements Analytics {
  constructor(private readonly sink: { track(event: AnalyticsEvent): void }) {}

  trackJobCreated(payload: JobCreatedPayload): void {
    this.sink.track({ name: AnalyticsEventName.JOB_CREATED, payload });
  }
  trackJobSavedAsDraft(payload: JobSavedAsDraftPayload): void {
    this.sink.track({ name: AnalyticsEventName.JOB_SAVED_AS_DRAFT, payload });
  }
  trackDiagnosticValidated(payload: DiagnosticValidatedPayload): void {
    this.sink.track({ name: AnalyticsEventName.DIAGNOSTIC_VALIDATED, payload });
  }
  trackJobSubmittedForReview(payload: JobSubmittedForReviewPayload): void {
    this.sink.track({ name: AnalyticsEventName.JOB_SUBMITTED_FOR_REVIEW, payload });
  }
  trackJobApprovedForRepair(payload: JobApprovedForRepairPayload): void {
    this.sink.track({ name: AnalyticsEventName.JOB_APPROVED_FOR_REPAIR, payload });
  }
  trackRepairStarted(payload: RepairStartedPayload): void {
    this.sink.track({ name: AnalyticsEventName.REPAIR_STARTED, payload });
  }
  trackRepairFinished(payload: RepairFinishedPayload): void {
    this.sink.track({ name: AnalyticsEventName.REPAIR_FINISHED, payload });
  }
  trackJobCompleted(payload: JobCompletedPayload): void {
    this.sink.track({ name: AnalyticsEventName.JOB_COMPLETED, payload });
  }
  trackClaimReviewed(payload: ClaimReviewedPayload): void {
    this.sink.track({ name: AnalyticsEventName.CLAIM_REVIEWED, payload });
  }
  trackPreApprovalRequested(payload: PreApprovalRequestedPayload): void {
    this.sink.track({ name: AnalyticsEventName.PRE_APPROVAL_REQUESTED, payload });
  }
  trackPreApprovalReviewed(payload: PreApprovalReviewedPayload): void {
    this.sink.track({ name: AnalyticsEventName.PRE_APPROVAL_REVIEWED, payload });
  }
  trackNoteAdded(payload: NoteAddedPayload): void {
    this.sink.track({ name: AnalyticsEventName.NOTE_ADDED, payload });
  }
  trackHelpCenterClicked(payload: HelpCenterClickedPayload = {}): void {
    this.sink.track({ name: AnalyticsEventName.HELP_CENTER_CLICKED, payload });
  }
  trackVirtualPage(payload: VirtualPageViewPayload = {}): void {
    this.sink.track({ name: AnalyticsEventName.VIRTUAL_PAGE_VIEW, payload });
  }
}

export const createNoopAnalytics = (): Analytics =>
  Object.freeze({
    trackJobCreated: () => {},
    trackJobSavedAsDraft: () => {},
    trackDiagnosticValidated: () => {},
    trackJobSubmittedForReview: () => {},
    trackJobApprovedForRepair: () => {},
    trackRepairStarted: () => {},
    trackRepairFinished: () => {},
    trackJobCompleted: () => {},
    trackClaimReviewed: () => {},
    trackPreApprovalRequested: () => {},
    trackPreApprovalReviewed: () => {},
    trackNoteAdded: () => {},
    trackHelpCenterClicked: () => {},
    trackVirtualPage: () => {},
  });

interface AnalyticsTrackerDependencies {
  readonly config: AnalyticsConfig;
  readonly transport: AnalyticsTransport;
  readonly contextSource: AnalyticsContextSource;
  readonly enricher: AnalyticsContextEnricher;
  readonly validator: { validate(event: DataLayerEvent): ValidationResult };
  readonly logger: AnalyticsLogger;
}

/**
 * Orchestrates a single event: pulls context, enriches, serializes, validates and pushes.
 * Never throws into the caller (analytics must not break a business flow).
 */
export class AnalyticsTracker {
  constructor(private readonly deps: AnalyticsTrackerDependencies) {}

  track(event: AnalyticsEvent): void {
    if (!this.deps.config.enabled) {
      this.deps.logger.debug("Analytics disabled — skipping event", { event: event.name });
      return;
    }
    try {
      this.dispatch(event);
    } catch (error) {
      this.deps.logger.error("Unexpected error while tracking event", { event: event.name, error });
    }
  }

  private dispatch(event: AnalyticsEvent): void {
    const snapshot = this.deps.contextSource.getSnapshot();
    if (!snapshot) {
      this.deps.logger.warn("No analytics context available yet — skipping event", {
        event: event.name,
      });
      return;
    }

    const definition = EVENT_REGISTRY[event.name];
    const contextBag = this.deps.enricher.enrich(snapshot, {
      includePageDescriptor: definition.requiresPageDescriptor,
    });
    const dataLayerEvent = buildDataLayerEvent(
      event.name,
      contextBag,
      serializeEventPayload(event),
    );

    // Validation is a dev/QA contract guard — skipped entirely in SILENT (PROD).
    if (this.deps.config.validationMode !== ValidationMode.SILENT) {
      const { valid, issues } = this.deps.validator.validate(dataLayerEvent);
      for (const issue of issues) this.deps.logger.warn(`Validation — ${issue}`);
      if (!valid && this.deps.config.validationMode === ValidationMode.STRICT) {
        this.deps.logger.warn(`Dropped invalid "${event.name}" event (strict validation)`, {
          issues,
        });
        return;
      }
    }

    this.deps.logger.debug(`▶ ${event.name}`, { event: dataLayerEvent });
    this.deps.transport.push(dataLayerEvent);
  }
}

export interface CreateAnalyticsOptions {
  readonly contextSource: AnalyticsContextSource;
  readonly config?: AnalyticsConfig;
  readonly transport?: AnalyticsTransport;
  readonly clock?: AnalyticsClock;
  readonly logger?: AnalyticsLogger;
}

export const createAnalytics = (options: CreateAnalyticsOptions): Analytics => {
  const config = options.config ?? resolveAnalyticsConfig();
  const logger = options.logger ?? new ConsoleAnalyticsLogger({ verbose: config.debug });
  const clock = options.clock ?? new SystemClock();
  const transport = options.transport ?? new DataLayerTransport(logger);

  const tracker = new AnalyticsTracker({
    config,
    transport,
    contextSource: options.contextSource,
    enricher: new AnalyticsContextEnricher(clock),
    validator: new AnalyticsEventValidator(),
    logger,
  });
  return new AnalyticsFacade(tracker);
};
