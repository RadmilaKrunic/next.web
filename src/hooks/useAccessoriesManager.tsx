import { useState, useCallback, useEffect } from "react";
import Field from "../components/generics/Field/GenericField.types";
import { mapFieldToFieldMapping } from "../components/generics/utils";

export interface Accessory {
  assetIndex: string;
  accessoriesIndex: string;
  fields: Field[];
}

interface JobAccessories {
  jobIndex?: number; // undefined for single job, defined for multi-job
  accessories: unknown[];
}

interface UseAccessoriesManagerProps {
  mode: "create" | "view" | "edit";
  allFields: Field[] | null;
  setAllFields: (fields: Field[] | null | ((prev: Field[] | null) => Field[] | null)) => void;
  setInitialFormValues: (
    values: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>),
  ) => void;
  // Unified parameter for both single and multi-job scenarios
  // Single job: [{ accessories: [...] }] (jobIndex is undefined)
  // Multi job: [{ jobIndex: 0, accessories: [...] }, { jobIndex: 1, accessories: [...] }]
  apiJobsAccessories?: JobAccessories[];
  convertAPIDataToFormValues?: (apiData: unknown, fields: Field[]) => Record<string, unknown>;
  apiData?: unknown;
}

const ACCESSORY_TEMPLATE_PREFIX = "accessory#0_";
const ASSET_TEMPLATE_PREFIX_MULTI = "assetData#0_"; // Multi-job: assetData#0_accessory#0_
const ASSET_TEMPLATE_PREFIX_SINGLE = "assetData_"; // Single job: assetData_accessory#0_

/**
 * Gets the appropriate asset prefix based on job scenario
 */
const getAssetPrefix = (isSingleJob: boolean): string =>
  isSingleJob ? ASSET_TEMPLATE_PREFIX_SINGLE : ASSET_TEMPLATE_PREFIX_MULTI;

/**
 * Extracts accessory template fields from all fields
 * For multi-job: Only returns fields from the first job (assetData#0) to use as template
 * For single job: Returns fields that start with assetData_accessory#0_ (no job index)
 */
export const getAccessoryTemplateFields = (allFields: Field[], isSingleJob = false): Field[] => {
  const assetPrefix = getAssetPrefix(isSingleJob);

  return allFields.filter(
    (field) =>
      field.name.includes(ACCESSORY_TEMPLATE_PREFIX) &&
      field.name.startsWith(assetPrefix) &&
      // For single job, exclude multi-job patterns
      (!isSingleJob || !field.name.includes("assetData#")),
  );
};

/**
 * Creates a new accessory field set by duplicating template fields with a new index
 */
export const createAccessoryFieldSet = (
  templateFields: Field[],
  assetIndex: string,
  accessoryIndex: number,
  isSingleJob = false,
): Accessory => {
  const fields = templateFields.map((field) => {
    const newField = { ...field };

    // Replace accessory index: accessory#0_ -> accessory#N_
    newField.name = field.name.replace(ACCESSORY_TEMPLATE_PREFIX, `accessory#${accessoryIndex}_`);

    // For multi-job scenarios, also replace asset index
    if (!isSingleJob && assetIndex !== "0") {
      // Replace asset index: assetData#0_ -> assetData#N_
      newField.name = newField.name.replace(/assetData#0_/, `assetData#${assetIndex}_`);
    }

    delete newField.fieldMapping;

    const mappedField = mapFieldToFieldMapping(newField);
    return mappedField;
  });

  return {
    assetIndex,
    accessoriesIndex: `${accessoryIndex}`,
    fields,
  };
};

function shouldSkipForMissingJobSections(
  isSingleJob: boolean,
  normalizedJobsAccessories: { jobIndex: number; accessories: unknown[] }[],
  allFields: Field[],
): boolean {
  if (isSingleJob || normalizedJobsAccessories.length === 0) return false;
  const maxJobIndex = Math.max(...normalizedJobsAccessories.map((j) => j.jobIndex));
  const hasAllJobSections = allFields.some((field) =>
    field.name.startsWith(`assetData#${maxJobIndex}_`),
  );
  return !hasAllJobSections && maxJobIndex > 0;
}

/**
 * Unified hook for managing accessories in both create and view modes
 * Supports both single job (JobOverview) and multiple jobs (CreateJob)
 */
export const useAccessoriesManager = ({
  mode,
  allFields,
  setAllFields,
  setInitialFormValues,
  apiJobsAccessories = [],
  convertAPIDataToFormValues,
  apiData,
}: UseAccessoriesManagerProps) => {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [previousJobsState, setPreviousJobsState] = useState<string>("");

  // Normalize: ensure jobIndex exists for processing (default to 0 for single job)
  const normalizedJobsAccessories = apiJobsAccessories.map((job) => ({
    jobIndex: job.jobIndex ?? 0,
    accessories: job.accessories,
  }));

  // Calculate current state for comparison
  const currentJobsState = JSON.stringify(
    normalizedJobsAccessories.map((j) => ({ jobIndex: j.jobIndex, count: j.accessories.length })),
  );

  // Initialize accessories from API data (view mode)
  useEffect(() => {
    const isValidMode = mode === "view" || mode === "create" || mode === "edit";
    if (!isValidMode || !allFields) return;

    // Check if anything changed
    if (previousJobsState === currentJobsState) {
      return;
    }

    // Auto-detect single job based on field naming pattern (more reliable than API structure)
    const isSingleJob = allFields.some(
      (f) => f.name.startsWith("assetData_accessory") && !f.name.includes("assetData#"),
    );

    // Handle empty accessories
    if (normalizedJobsAccessories.length === 0) {
      setAccessories([]);
      setPreviousJobsState(currentJobsState);
      return;
    }

    // Wait for all job sections to be created before processing accessories (multi-job only)
    if (shouldSkipForMissingJobSections(isSingleJob, normalizedJobsAccessories, allFields)) {
      return;
    }

    const accessoryTemplateFields = getAccessoryTemplateFields(allFields, isSingleJob);

    if (accessoryTemplateFields.length === 0) {
      setPreviousJobsState(currentJobsState);
      // Map data even if no accessory template fields found
      if (convertAPIDataToFormValues && apiData) {
        const dataMapped = convertAPIDataToFormValues(apiData, allFields);
        setInitialFormValues(dataMapped);
      }
      return;
    }

    // Create field sets for all jobs' accessories (unified logic)
    const allAccessoryFieldSets: Accessory[] = [];

    for (const jobAccessories of normalizedJobsAccessories) {
      const { jobIndex, accessories: jobAccessoriesList } = jobAccessories;

      // Create fields for ALL accessories (0, 1, 2, ...)
      for (let accIndex = 0; accIndex < jobAccessoriesList.length; accIndex++) {
        const accessoryFieldSet = createAccessoryFieldSet(
          accessoryTemplateFields,
          `${jobIndex}`,
          accIndex,
          isSingleJob,
        );
        allAccessoryFieldSets.push(accessoryFieldSet);
      }
    }

    setAccessories(allAccessoryFieldSets);

    // Add new fields to allFields
    const newFields = allAccessoryFieldSets.flatMap((acc) => acc.fields);

    // Filter out template fields based on job type
    const newFieldsFiltered = isSingleJob
      ? newFields // In single job mode, keep all generated fields
      : newFields.filter(
          (nf) =>
            !(
              nf.name.includes(ACCESSORY_TEMPLATE_PREFIX) &&
              nf.name.startsWith(getAssetPrefix(false))
            ),
        );

    setAllFields((prevFields) => {
      if (!prevFields) return newFieldsFiltered;

      // Deduplicate: only add fields that don't already exist
      const existingFieldNames = new Set(prevFields.map((f) => f.name));
      const fieldsToAdd = newFieldsFiltered.filter((f) => !existingFieldNames.has(f.name));

      const updatedFields = [...prevFields, ...fieldsToAdd];

      // After fields are added, map API data to the new fields
      if (convertAPIDataToFormValues && apiData) {
        const dataMapped = convertAPIDataToFormValues(apiData, updatedFields);
        setInitialFormValues(dataMapped);
      }

      return updatedFields;
    });

    setPreviousJobsState(currentJobsState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, apiJobsAccessories.length, allFields, currentJobsState, previousJobsState]);

  // Map accessories fields to allFields (create mode)
  const mapAccessoriesFields = useCallback(() => {
    if (accessories.length === 0) return allFields;

    const assetAccessoriesFields: Field[] = accessories.flatMap((a) => a.fields);

    const newFieldMapping = assetAccessoriesFields.map((field: Field) => {
      return field.fieldMapping ? field : mapFieldToFieldMapping(field);
    });

    const newFieldNames = assetAccessoriesFields.map((field: Field) => field.name);
    const newValues = newFieldNames.reduce(
      (acc, name) => {
        acc[name] = "";
        return acc;
      },
      {} as Record<string, unknown>,
    );

    setInitialFormValues((prev) => ({ ...prev, ...newValues }));

    const updatedFields = (() => {
      if (!allFields) return newFieldMapping;

      const newFieldNames = new Set(newFieldMapping.map((field) => field.name));
      const filteredPrevFields = allFields.filter((field) => !newFieldNames.has(field.name));

      return [...filteredPrevFields, ...newFieldMapping];
    })();

    setAllFields(updatedFields);

    return updatedFields;
  }, [accessories, setAllFields, setInitialFormValues, allFields]);

  const isInitialized = previousJobsState !== "" || apiJobsAccessories.length === 0;

  return {
    assetsAccessories: accessories,
    setAssetsAccessories: setAccessories,
    mapAccessoriesFields,
    getAccessoryTemplateFields,
    isInitialized,
  };
};
