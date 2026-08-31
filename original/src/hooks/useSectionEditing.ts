import { useState, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import Field from "components/generics/Field/GenericField.types";
import Section from "components/generics/Section/GenericSection.types";
import { Accessory } from "hooks/useAccessoriesManager";
import { toggleSectionFieldsDisabled, convertAPIDataToFormValues } from "components/generics/utils";

interface UseSectionEditingProps {
  tabs: Section[];
  allFields: Field[] | null;
  setAllFields: Dispatch<SetStateAction<Field[] | null>>;
  assetsAccessories: Accessory[];
  setAssetsAccessories: Dispatch<SetStateAction<Accessory[]>>;
  mergedJobData: unknown;
  setInitialFormValues: Dispatch<SetStateAction<Record<string, unknown>>>;
}

export const useSectionEditing = ({
  tabs,
  allFields,
  setAllFields,
  assetsAccessories,
  setAssetsAccessories,
  mergedJobData,
  setInitialFormValues,
}: UseSectionEditingProps) => {
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set());

  const enableSectionEditing = useCallback(
    (sectionName: string) => {
      const targetTab = tabs.find((tab) => tab.name === sectionName);
      if (!targetTab) return;

      setEditingSections((prev) => new Set(prev).add(sectionName));

      if (allFields) {
        const enabledFields = toggleSectionFieldsDisabled(allFields, targetTab, false);
        setAllFields(enabledFields);
      }

      if (assetsAccessories.length > 0) {
        const updatedAccessories = assetsAccessories.map((accessory) => ({
          ...accessory,
          fields: accessory.fields.map((field) => ({ ...field, isDisabled: false })),
        }));
        setAssetsAccessories(updatedAccessories);
      }
    },
    [tabs, allFields, setAllFields, assetsAccessories, setAssetsAccessories],
  );

  const disableSectionEditing = useCallback(
    (sectionName: string, reloadData = false) => {
      const targetTab = tabs.find((tab) => tab.name === sectionName);
      if (targetTab && allFields) {
        const disabledFields = toggleSectionFieldsDisabled(allFields, targetTab, true);
        setAllFields(disabledFields);
      }

      if (assetsAccessories.length > 0) {
        const updatedAccessories = assetsAccessories.map((accessory) => ({
          ...accessory,
          fields: accessory.fields.map((field) => ({ ...field, isDisabled: true })),
        }));
        setAssetsAccessories(updatedAccessories);
      }

      setEditingSections((prev) => {
        const updated = new Set(prev);
        updated.delete(sectionName);
        return updated;
      });

      if (reloadData && mergedJobData && allFields) {
        const dataMapped = convertAPIDataToFormValues(mergedJobData, allFields);
        setInitialFormValues(dataMapped);
      }
    },
    [
      tabs,
      allFields,
      setAllFields,
      assetsAccessories,
      setAssetsAccessories,
      mergedJobData,
      setInitialFormValues,
    ],
  );

  return { editingSections, setEditingSections, enableSectionEditing, disableSectionEditing };
};
