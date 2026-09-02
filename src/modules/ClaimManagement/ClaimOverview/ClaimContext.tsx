import { createContext, useContext } from "react";
import { createDefaultItemsContextValue, type ItemsContextValue } from "hooks/itemsManager/ItemsContext";

// ClaimContextValue is now just ItemsContextValue (Phase 5 unification,
// items-and-prices-refactor.md §15 step 5) — every existing field/import here is unchanged,
// the shape only widened with job-only fields (claim passes inert defaults for those, see
// below). Kept as its own React.Context object — see DiagnosticsContext.tsx's docstring for
// why the two stay separate rather than merging into one shared context.
export type ClaimContextValue = ItemsContextValue;

const defaultClaimContextValue: ClaimContextValue = createDefaultItemsContextValue({
  // Claim's original default had a real noop here (onDeleteArchivedRow was a required field
  // on the pre-merge ClaimContextValue); the merged ItemsContextValue makes it optional
  // (job genuinely has no equivalent), so restore claim's own default behavior explicitly
  // rather than leaving it undefined only for claim's default context value.
  onDeleteArchivedRow: () => {},
});

export const ClaimContext = createContext<ClaimContextValue>(defaultClaimContextValue);
export const useClaimContext = () => useContext(ClaimContext);
