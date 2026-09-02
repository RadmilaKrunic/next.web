import type {
  ArchivedItemRowSurfaceConfig,
  ShowRevertButtonContext,
} from "./ArchivedItemRowSurfaceConfig";

// Ported verbatim from ArchivedSparePartsRow.tsx's own STATUSES_DISABLING_ROW — a
// deliberately different set from ItemRow.tsx/jobItemRowSurfaceConfig.ts's
// STATUSES_DISABLING_ROW (which gates the *live* row instead). Do not merge the two.
const STATUSES_DISABLING_ROW = new Set([
  "RETURN_UNASSEMBLY",
  "RETURN_ASSEMBLY",
  "REPAIR_DONE",
  "IN_REPAIR",
  "READY_FOR_REPAIR",
  "EXCHANGE",
  "SCRAP_TOOL",
  "DELIVERED",
]);

function resolveShowRevertButton(ctx: ShowRevertButtonContext): boolean {
  return !STATUSES_DISABLING_ROW.has(ctx.jobStatus ?? "") && !ctx.isRepairAnswerLocked;
}

export const jobArchivedItemRowSurfaceConfig: ArchivedItemRowSurfaceConfig = {
  surface: "jobDiagnostics",
  resolveShowRevertButton,
  renderPlaceholderWhenHidden: false,
};
