import { createContext, useContext } from "react";
import { createDefaultItemsContextValue, type ItemsContextValue } from "hooks/itemsManager/ItemsContext";

// DiagnosticsContextValue is now just ItemsContextValue (Phase 5 unification,
// items-and-prices-refactor.md §15 step 5) — every existing field/import here is unchanged,
// the shape only widened with claim-only fields (job passes inert defaults for those, see
// below). Kept as its own React.Context object (not merged with ClaimContext) because
// ClaimOverview.tsx provides two different values simultaneously in the same tree: this
// stubbed read-only value for the embedded job-diagnostic mirror, and ClaimContext's real
// claim value for the editable claims tab.
export type DiagnosticsContextValue = ItemsContextValue;

const defaultDiagnosticsContextValue: DiagnosticsContextValue = createDefaultItemsContextValue();

export const DiagnosticsContext = createContext<DiagnosticsContextValue>(
  defaultDiagnosticsContextValue,
);

export const useDiagnosticsContext = () => useContext(DiagnosticsContext);
