import { useEffect, useRef } from "react";

type UseFieldVisibilityResetOptions = {
  isVisible: boolean;
  name: string;
  formValues: Record<string, unknown>;
  setFieldValue: (field: string, value: unknown) => void;
  sameDataFieldAs?: string;
  defaultValue?: unknown;
};

type CachedValueRef = { current: unknown };
type SetFieldFn = (field: string, value: unknown) => void;

interface ApplyBecomingInvisibleParams {
  sameDataFieldAs?: string;
  currentValue: unknown;
  targetValue: unknown;
  isExplicitFalse: boolean;
  defaultValue: unknown;
  name: string;
  cachedValueRef: CachedValueRef;
  setFieldValue: SetFieldFn;
}

function applyBecomingInvisible({
  sameDataFieldAs,
  currentValue,
  targetValue,
  isExplicitFalse,
  defaultValue,
  name,
  cachedValueRef,
  setFieldValue,
}: ApplyBecomingInvisibleParams): void {
  if (sameDataFieldAs && currentValue && currentValue !== "") {
    if (!targetValue || targetValue === "") {
      setFieldValue(sameDataFieldAs, currentValue);
    }
  }
  if (
    !isExplicitFalse &&
    currentValue !== "" &&
    currentValue !== undefined &&
    currentValue !== null
  ) {
    if (!sameDataFieldAs) {
      cachedValueRef.current = currentValue;
    }
    setFieldValue(name, defaultValue ?? "");
  }
}

function applyBecomingVisible(
  name: string,
  sameDataFieldAs: string | undefined,
  latestValue: unknown,
  defaultValue: unknown,
  cachedValueRef: CachedValueRef,
  setFieldValue: SetFieldFn,
): void {
  if (!sameDataFieldAs && cachedValueRef.current !== null) {
    if (!latestValue || latestValue === "" || latestValue === (defaultValue ?? "")) {
      setFieldValue(name, cachedValueRef.current);
    }
    cachedValueRef.current = null;
  }
}

/**
 * Handles field value cleanup and data migration when a field transitions
 * from visible to invisible:
 * - Copies the field's value to `sameDataFieldAs` target (if configured and target is empty)
 * - Resets the field to `defaultValue` (or `""`) when it becomes hidden
 * - For fields without `sameDataFieldAs`, caches the value before resetting so it can be
 *   restored when the field becomes visible again (e.g. when the user changes typeOfUser
 *   back to a type that shows this field)
 */
function useFieldVisibilityReset({
  isVisible,
  name,
  formValues,
  setFieldValue,
  sameDataFieldAs,
  defaultValue,
}: UseFieldVisibilityResetOptions): void {
  const prevIsVisibleRef = useRef(isVisible);
  const cachedValueRef = useRef<unknown>(null);

  useEffect(() => {
    const currentValue = formValues[name];
    const targetValue = formValues[sameDataFieldAs || ""];
    const isBecomingInvisible = prevIsVisibleRef.current === true && isVisible === false;
    const isBecomingVisible = prevIsVisibleRef.current === false && isVisible === true;
    const isExplicitFalse = currentValue === false;

    if (isBecomingInvisible) {
      applyBecomingInvisible({
        sameDataFieldAs,
        currentValue,
        targetValue,
        isExplicitFalse,
        defaultValue,
        name,
        cachedValueRef,
        setFieldValue,
      });
    }

    if (isBecomingVisible) {
      applyBecomingVisible(
        name,
        sameDataFieldAs,
        formValues[name],
        defaultValue,
        cachedValueRef,
        setFieldValue,
      );
    }

    prevIsVisibleRef.current = isVisible;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, name, sameDataFieldAs]);
}

export default useFieldVisibilityReset;
