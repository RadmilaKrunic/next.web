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
    return rows
      .map((row) =>
        PRICE_INPUT_SUBTYPES.map((subtype) => {
          const name = row.bySubtype[subtype];
          const value = name ? values[name] : undefined;
          return value === null || value === undefined
            ? ""
            : String(value as string | number | boolean);
        }).join("|"),
      )
      .join("~");
  }, [enabled, rows, values]);

  const debouncedSignature = useDebouncedValue(signature, 500);
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !debouncedSignature) return;
    // First settled signature is the state loaded from the backend — nothing to recalculate.
    if (lastSignatureRef.current === null) {
      lastSignatureRef.current = debouncedSignature;
      return;
    }
    if (lastSignatureRef.current === debouncedSignature) return;
    lastSignatureRef.current = debouncedSignature;
    recalculate("load");
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
