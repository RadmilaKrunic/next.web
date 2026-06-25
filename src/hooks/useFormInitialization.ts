import { useState, useEffect, useCallback } from "react";
import GenericForm, { ActionMandatoryFields } from "components/generics/Form/GenericForm.types";
import Field from "components/generics/Field/GenericField.types";
import Section from "components/generics/Section/GenericSection.types";
import Area from "components/generics/Area/GenericArea.types";
import {
  setInitalSectionsAreasFields,
  getAllFieldsFromSection,
  mapFieldToFieldMapping,
  getInitialFieldValues,
  getAreasByName,
} from "components/generics/utils";
import { getMandatoryFields } from "components/generics/Form/formValidation";

export const useFormInitialization = (formConfig: GenericForm | null) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [tabs, setTabs] = useState<Section[]>([]);
  const [initialFormValues, setInitialFormValues] = useState<Record<string, unknown>>({});
  const [allFields, setAllFields] = useState<Field[] | null>(null);
  const [mandatoryFields, setMandatoryFields] = useState<Record<
    string,
    ActionMandatoryFields
  > | null>(null);
  const [patternDiagnosticArea, setPatternDiagnosticArea] = useState<Area | null>(null);

  useEffect(() => {
    if (!formConfig) {
      setIsInitialized(false);
      return;
    }
    setSections(setInitalSectionsAreasFields(formConfig));
    setIsInitialized(false);
  }, [formConfig]);

  useEffect(() => {
    if (isInitialized || !formConfig || sections.length === 0) return;

    let processedFields = sections.flatMap((section) => getAllFieldsFromSection(section));
    processedFields = processedFields.map((field) => mapFieldToFieldMapping(field));

    const initialValues = getInitialFieldValues(processedFields);
    const mandatory = getMandatoryFields(formConfig);

    setAllFields(processedFields);
    setInitialFormValues(initialValues);
    setMandatoryFields(mandatory);
    setTabs(sections.filter((section) => section.isTab));
    setPatternDiagnosticArea(getAreasByName(sections, "diagnosticData")?.[0] || null);
    setIsInitialized(true);
  }, [isInitialized, sections, formConfig]);

  const reset = useCallback(() => {
    if (formConfig) {
      setSections(setInitalSectionsAreasFields(formConfig));
    }
    setIsInitialized(false);
  }, [formConfig]);

  return {
    sections,
    setSections,
    initialFormValues,
    setInitialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    patternDiagnosticArea,
    tabs,
    setTabs,
    isInitialized,
    reset,
  };
};
