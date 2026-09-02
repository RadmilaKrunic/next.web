import type { ItemSurface } from "utils/itemRulesResolver";

// Phase 5 unification (items-and-prices-refactor.md §15 step 7) — every field here names a
// real, traced divergence between ArchivedSparePartsRow.tsx (job) and the inlined
// ClaimArchivedSparePartsRow function in ClaimArchivedSparePartsArea.tsx (claim).

export interface ShowRevertButtonContext {
  /** Job only — no claim equivalent lock mechanism (see items-and-prices-refactor.md §15). */
  jobStatus: string | undefined;
  /** Job only. */
  isRepairAnswerLocked: boolean | undefined;
  /** Claim only. */
  canDeleteRows: boolean;
}

export interface ArchivedItemRowSurfaceConfig {
  surface: ItemSurface;
  resolveShowRevertButton: (ctx: ShowRevertButtonContext) => boolean;
  /** Job: renders nothing in the action slot when the revert button is hidden. Claim: renders
   *  an empty `.spare-part-action` placeholder div instead, to keep the row's layout grid
   *  stable regardless of whether the button is shown. */
  renderPlaceholderWhenHidden: boolean;
}
