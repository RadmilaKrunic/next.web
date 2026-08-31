import { useEffect } from "react";
import type { RefObject } from "react";
import Field from "components/generics/Field/GenericField.types";
import Section from "components/generics/Section/GenericSection.types";
import type { AllowedPosition } from "api/services/countryConfiguration/countryConfiguration";
import {
  setDisabledAutomaticRow,
  syncFieldsToTabs,
  haveFieldDisabledStatesChanged,
} from "components/generics/utils";

interface UsePositionDropdownSyncProps {
  allFields: Field[] | null;
  setAllFields: React.Dispatch<React.SetStateAction<Field[] | null>>;
  setTabs: React.Dispatch<React.SetStateAction<Section[]>>;
  allowedPositions: AllowedPosition[];
  getPositionConfig: (position: string) => AllowedPosition | undefined;
  formValuesRef: RefObject<Record<string, unknown>>;
  skipFormResetRef: RefObject<boolean>;
}

/** Disables fields on rows whose position has unitPriceSource === "SYSTEM". */
export const usePositionDropdownSync = ({
  allFields,
  setAllFields,
  setTabs,
  allowedPositions,
  getPositionConfig,
  formValuesRef,
  skipFormResetRef,
}: UsePositionDropdownSyncProps) => {
  useEffect(() => {
    if (!allFields || allowedPositions.length === 0) return;

    const getIsDisabled = (positionValue: string) => {
      const posConfig = getPositionConfig(positionValue);
      return posConfig?.unitPriceSource === "SYSTEM";
    };

    const updated = setDisabledAutomaticRow(allFields, getIsDisabled, formValuesRef.current);
    if (!haveFieldDisabledStatesChanged(allFields, updated)) return;

    skipFormResetRef.current = true;
    setAllFields(updated);
    setTabs((prev) => syncFieldsToTabs(prev, updated));
  }, [
    allowedPositions,
    allFields,
    setAllFields,
    setTabs,
    getPositionConfig,
    formValuesRef,
    skipFormResetRef,
  ]);
};
