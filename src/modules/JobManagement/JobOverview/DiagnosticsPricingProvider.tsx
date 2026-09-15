import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFormikContext } from "formik";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { useDiagnosticPricing } from "api/services/diagnosticPricing/hooks";
import type {
  DiagnosticPricingChange,
  DiagnosticPricingResponse,
} from "api/services/diagnosticPricing/diagnosticPricing.types";
import { buildPricingLines, findRowChange, groupRowFields, type RowFieldGroup } from "utils/diagnosticsFormSync";
import { useDebouncedValue } from "hooks/useDebouncedValue";
import {
  DiagnosticsPricingContext,
  type DiagnosticsPricingContextValue,
} from "./DiagnosticsPricingContext";

interface DiagnosticsPricingProviderProps {
  enabled: boolean;
  jobId: string;
  actionType: string;
  jobType: string;
  country: string;
  ascId: string;
  /** Substring identifying the spare-parts row areas, e.g. "diagnosticsSpareParts". */
  areaNameContains: string;
  /** Called with the full diagnostic-shaped response after a successful recalculation, so the
   * caller can refresh materials/archivedMaterials/summary the same way a fresh load would. */
  onApplyResponse?: (response: DiagnosticPricingResponse) => void;
  children: React.ReactNode;
}

const PRICING_SCALE = 2;

type ValueSnapshot = Map<string, string>;

const PRICE_INPUT_SUBTYPES = [
  "diagnosticQuantity",
  "diagnosticUnitPrice",
  "diagnosticDiscount",
  "diagnosticNetAmount",
  "diagnosticGrossAmount",
  "diagnosticTotalAmount",
];

const buildValueSnapshot = (
  rows: RowFieldGroup[],
  values: Record<string, unknown>,
): ValueSnapshot => {
  const snapshot: ValueSnapshot = new Map();
  for (const row of rows) {
    for (const subtype of PRICE_INPUT_SUBTYPES) {
      const name = row.bySubtype[subtype];
      const value = name ? values[name] : undefined;
      snapshot.set(
        `${row.order}:${subtype}`,
        value === null || value === undefined ? "" : String(value as string | number | boolean),
      );
    }
  }
  return snapshot;
};

export function DiagnosticsPricingProvider({
  enabled,
  jobId,
  actionType,
  jobType,
  country,
  ascId,
  areaNameContains,
  onApplyResponse,
  children,
}: Readonly<DiagnosticsPricingProviderProps>) {
  const { allFields } = useContext(GenericFormContext);
  const { values } = useFormikContext<Record<string, unknown>>();
  const [pricing, setPricing] = useState<DiagnosticPricingResponse | null>(null);

  const rows = useMemo(
    () => groupRowFields(allFields, areaNameContains),
    [allFields, areaNameContains],
  );

  const valuesRef = useRef(values);
  valuesRef.current = values;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const onApplyResponseRef = useRef(onApplyResponse);
  onApplyResponseRef.current = onApplyResponse;

  const onPricingSuccess = useCallback((data: DiagnosticPricingResponse) => {
    setPricing(data);
    onApplyResponseRef.current?.(data);
  }, []);

  const pricingMutation = useDiagnosticPricing(jobId, onPricingSuccess);
  const mutateRef = useRef(pricingMutation.mutate);
  mutateRef.current = pricingMutation.mutate;

  const recalculate = useCallback(
    (change: DiagnosticPricingChange) => {
      if (!enabled || !jobId || rowsRef.current.length === 0) return;
      mutateRef.current({
        pricingContext: { country, ascId, scale: PRICING_SCALE },
        lines: buildPricingLines(rowsRef.current, valuesRef.current),
        changes: change,
      });
    },
    [enabled, jobId, country, ascId],
  );

  // Serialized price inputs — recalculation is requested once the user stops editing.
  const signature = useMemo(() => {
    if (!enabled) return "";
    return [...buildValueSnapshot(rows, values).values()].join("|");
  }, [enabled, rows, values]);

  const debouncedSignature = useDebouncedValue(signature, 500);
  const lastSignatureRef = useRef<string | null>(null);
  const lastSnapshotRef = useRef<ValueSnapshot | null>(null);

  // Capture the as-loaded baseline synchronously on the render where pricing first becomes
  // enabled and rows exist — before any user edit can occur — rather than inside the
  // debounce-settle effect below, which would race the first settle against a possible
  // earlier edit. Rows can still be empty on the very first render (UIConfiguration hasn't
  // populated the spare-parts area yet), so wait for real row data before latching.
  if (lastSnapshotRef.current === null && enabled && rows.length > 0) {
    lastSnapshotRef.current = buildValueSnapshot(rows, values);
    lastSignatureRef.current = signature;
  }

  useEffect(() => {
    if (!enabled || !debouncedSignature) return;
    if (lastSignatureRef.current === debouncedSignature) return;
    const nextSnapshot = buildValueSnapshot(rowsRef.current, valuesRef.current);
    const change = findRowChange(rowsRef.current, valuesRef.current, lastSnapshotRef.current, nextSnapshot);
    lastSignatureRef.current = debouncedSignature;
    lastSnapshotRef.current = nextSnapshot;
    // Position/partNumber/type edits archive-and-recreate the row instead of recalculating —
    // findRowChange returns null for those (and for any row that only touched non-price fields).
    if (change) recalculate(change);
  }, [enabled, debouncedSignature, recalculate]);

  const contextValue = useMemo<DiagnosticsPricingContextValue>(
    () => ({ enabled, pricing, isPricing: pricingMutation.isPending, recalculate }),
    [enabled, pricing, pricingMutation.isPending, recalculate],
  );

  return (
    <DiagnosticsPricingContext.Provider value={contextValue}>
      {children}
    </DiagnosticsPricingContext.Provider>
  );
}
