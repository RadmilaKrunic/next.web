import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFormikContext } from "formik";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { useDiagnosticPricing } from "api/services/diagnosticPricing/hooks";
import type {
  DiagnosticPricingResponse,
  DiagnosticPricingTrigger,
} from "api/services/diagnosticPricing/diagnosticPricing.types";
import {
  applyPricePatch,
  buildMaterialPricePatch,
  buildPricingMaterials,
  groupRowFields,
  type RowFieldGroup,
} from "utils/diagnosticsFormSync";
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
  /** Substring identifying the spare-parts row areas, e.g. "diagnosticsSpareParts". */
  areaNameContains: string;
  children: React.ReactNode;
}

const PRICE_INPUT_SUBTYPES = [
  "diagnosticQuantity",
  "diagnosticUnitPrice",
  "diagnosticDiscount",
  "diagnosticNetAmount",
  "diagnosticGrossAmount",
  "diagnosticTotalAmount",
  "diagnosticPosition",
  "diagnosticPartNumber",
  "diagnosticType",
];

/** Only these subtypes tell the backend which direction to back-calculate; the rest (position/partNumber/type) fall back to "load". */
const SUBTYPE_TO_TRIGGER: Partial<Record<string, DiagnosticPricingTrigger>> = {
  diagnosticQuantity: "quantity",
  diagnosticUnitPrice: "unitPrice",
  diagnosticDiscount: "discount",
  diagnosticNetAmount: "netAmount",
  diagnosticGrossAmount: "grossAmount",
  diagnosticTotalAmount: "totalAmount",
};

type ValueSnapshot = Map<string, string>;

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

/** Finds the first row/field that changed since the last settled snapshot, in field priority order. */
const findChangeTrigger = (
  rows: RowFieldGroup[],
  prev: ValueSnapshot | null,
  next: ValueSnapshot,
): { trigger: DiagnosticPricingTrigger; triggeredByOrder?: number } => {
  if (!prev) return { trigger: "load" };
  for (const row of rows) {
    for (const subtype of PRICE_INPUT_SUBTYPES) {
      const key = `${row.order}:${subtype}`;
      if (prev.get(key) === next.get(key)) continue;
      const trigger = SUBTYPE_TO_TRIGGER[subtype];
      return trigger ? { trigger, triggeredByOrder: row.order } : { trigger: "load" };
    }
  }
  return { trigger: "load" };
};

export function DiagnosticsPricingProvider({
  enabled,
  jobId,
  actionType,
  jobType,
  areaNameContains,
  children,
}: Readonly<DiagnosticsPricingProviderProps>) {
  const { allFields } = useContext(GenericFormContext);
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const [pricing, setPricing] = useState<DiagnosticPricingResponse | null>(null);

  const rows = useMemo(
    () => groupRowFields(allFields, areaNameContains),
    [allFields, areaNameContains],
  );

  const valuesRef = useRef(values);
  valuesRef.current = values;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const setFieldValueRef = useRef(setFieldValue);
  setFieldValueRef.current = setFieldValue;

  const onPricingSuccess = useCallback((data: DiagnosticPricingResponse) => {
    setPricing(data);
    const patch = buildMaterialPricePatch(rowsRef.current, data);
    applyPricePatch(patch, valuesRef.current, (field, value) => {
      void setFieldValueRef.current(field, value);
    });
  }, []);

  const pricingMutation = useDiagnosticPricing(jobId, onPricingSuccess);
  const mutateRef = useRef(pricingMutation.mutate);
  mutateRef.current = pricingMutation.mutate;

  const recalculate = useCallback(
    (trigger: DiagnosticPricingTrigger, triggeredByOrder?: number) => {
      if (!enabled || !jobId || rowsRef.current.length === 0) return;
      mutateRef.current({
        actionType,
        jobType,
        trigger,
        triggeredByOrder,
        materials: buildPricingMaterials(rowsRef.current, valuesRef.current),
      });
    },
    [enabled, jobId, actionType, jobType],
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
    const { trigger, triggeredByOrder } = findChangeTrigger(
      rowsRef.current,
      lastSnapshotRef.current,
      nextSnapshot,
    );
    lastSignatureRef.current = debouncedSignature;
    lastSnapshotRef.current = nextSnapshot;
    recalculate(trigger, triggeredByOrder);
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
