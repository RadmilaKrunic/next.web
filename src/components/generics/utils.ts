import Area from "./Area/GenericArea.types";
import Field, { GenericOptionProps } from "./Field/GenericField.types";
import GenericForm from "./Form/GenericForm.types";
import Section from "./Section/GenericSection.types";
import type { AllowedPosition } from "api/services/countryConfiguration/countryConfiguration";

export type ToRecord<T> = Record<keyof T, unknown>;

export const isDependedAndVisible = (
  formValues: unknown,
  fields: Field[],
  dependentFields: { fieldName: string; fieldValue: unknown }[],
  dependFieldCondition: string,
) => {
  if (!fields || fields.length === 0) {
    return true;
  }
  const values = formValues as Record<string, unknown>;

  const compareValues = (value: unknown, expectedValue: unknown): boolean => {
    if (value === expectedValue) return true;
    if (value == null || expectedValue == null) return false;
    if (value && expectedValue === "-") return true; // Special case to treat "-" as a wildcard value
    if (typeof value === "object" || typeof expectedValue === "object") return false;
    if (typeof value === "function" || typeof expectedValue === "function") return false;
    // Safe to convert primitives (string, number, boolean, bigint) to string
    const primitiveValue = value as string | number | boolean | bigint;
    const primitiveExpected = expectedValue as string | number | boolean | bigint;
    return String(primitiveValue) === String(primitiveExpected);
  };

  if (dependFieldCondition === "AND") {
    return dependentFields.every((dep) => {
      const name = fields.find((f) => f.name === dep.fieldName)?.name;
      if (!name) return false;
      return compareValues(values[name], dep.fieldValue);
    });
  }
  // Default to "OR" logic
  return dependentFields.some((dep) => {
    const name = fields.find((f) => f.name === dep.fieldName)?.name;
    if (!name) return false;
    return compareValues(values[name], dep.fieldValue);
  });
};

export const isFieldVisible = (
  field: Field,
  fields: Field[],
  values: Record<string, unknown>,
): boolean => {
  if (field.isHidden) return false;
  if (!field.isSubField) return true;
  if (!field.dependentFields || field.dependentFields.length === 0) return true;
  const condition = field.dependFieldCondition || "AND";
  return isDependedAndVisible(values, fields, field.dependentFields, condition);
};

export const mapAreaDependentFields = (area: Area): Field[] => {
  if (area.isSubArea) {
    area.fields = area.fields.map((field) => {
      field.isSubField = area.isSubArea;
      field.dependentFields = [...(field.dependentFields || []), ...(area.dependentFields || [])];
      field.dependFieldCondition = area.dependFieldCondition;
      return field;
    });
  }
  return area.fields;
};

export const mapFieldsFromMultipleArea = (area: Area): Field[] => {
  if (!area.isMultiple) {
    return area.fields;
  }

  area.index ??= 0;
  if (area.isMultiple) {
    area.fields = area.fields.map((field) => {
      field.name = `${area.index}_${field.name}`;
      field.attributeMapping = `${area.name}_${area.index}.${field.attributeMapping}`;
      return field;
    });
  }
  return area.fields;
};

export const getAllAreasFromSection = (sections: Section[]): Area[] =>
  sections.flatMap((section) => section.areas);

export const getAllFieldsFromSection = (section: Section): Field[] => {
  if (!section?.areas) {
    return [];
  }
  return section.areas.flatMap((area) => mapAreaDependentFields(area));
};

export const getAllFieldsFromForm = (form: GenericForm): Field[] => {
  if (!form?.sections) {
    return [];
  }
  return form.sections.flatMap((section: Section) => getAllFieldsFromSection(section));
};

export const setSectionDisabledState = (section: Section, isDisabled?: boolean): Section => {
  if (isDisabled !== undefined) {
    return {
      ...section,
      isDisabled,
      areas: section.areas.map((area) => ({
        ...area,
        isDisabled,
        fields: area.fields.map((field) => ({
          ...field,
          isDisabled: field.alwaysDisabled ? true : isDisabled,
        })),
      })),
    };
  }

  const allSectionFields = getAllFieldsFromSection(section);
  const allDisabled =
    allSectionFields.length > 0 && allSectionFields.every((field) => field.isDisabled);

  return {
    ...section,
    isDisabled: allDisabled,
    areas: section.areas.map((area) => ({
      ...area,
      isDisabled: area.fields.length > 0 && area.fields.every((field) => field.isDisabled),
    })),
  };
};

export const toggleSectionFieldsDisabled = (
  allFields: Field[],
  section: Section,
  isDisabled: boolean,
): Field[] => {
  const sectionFieldNames = new Set(getAllFieldsFromSection(section).map((f) => f.name));

  return allFields.map((field) => {
    if (sectionFieldNames.has(field.name)) {
      return { ...field, isDisabled: field.alwaysDisabled ? true : isDisabled };
    }
    return field;
  });
};

const getFieldsDependentOfField = (oldName: string, allFields: Field[]): Field[] => {
  return allFields.filter((f) => f.dependentFields?.some((dep) => dep.fieldName === oldName));
};
const getAreasDependentOfField = (oldName: string, allAreas: Area[]): Area[] => {
  return allAreas.filter((a) => a.dependentFields?.some((dep) => dep.fieldName === oldName));
};

const renameDependentFieldsinFields = (name: string, oldName: string, allFields: Field[]): void => {
  const depFieldsOfField = getFieldsDependentOfField(oldName, allFields);
  if (depFieldsOfField?.length > 0) {
    depFieldsOfField.forEach((depField) => {
      depField.dependentFields?.forEach((d) => (d.fieldName = name));
    });
  }
};
const renameDependentFieldsinAreas = (name: string, oldName: string, allAreas: Area[]): void => {
  const depAreasOfField = getAreasDependentOfField(oldName, allAreas);
  if (depAreasOfField?.length > 0) {
    depAreasOfField.forEach((depArea) => {
      depArea.dependentFields?.forEach((d) => (d.fieldName = name));
    });
  }
};

const renameRequiredFields = (name: string, oldName: string, allFields: Field[]): void => {
  const fieldsWithRequiredDep = allFields.filter(
    (f) => f.requiredDependentFields && Object.keys(f.requiredDependentFields).length > 0,
  );
  fieldsWithRequiredDep.flatMap((field) => {
    const requiredDep = field.requiredDependentFields;
    if (requiredDep) {
      if (requiredDep.byValueAnd) {
        requiredDep.byValueAnd.flatMap((d) => {
          if (d.fieldName === oldName) {
            d.fieldName = name;
          }
        });
      }
      if (requiredDep.byValueOr) {
        requiredDep.byValueOr.flatMap((d) => {
          if (d.fieldName === oldName) {
            d.fieldName = name;
          }
        });
      }
      if (requiredDep.allEmpty) {
        requiredDep.allEmpty = requiredDep.allEmpty.map((fieldName) =>
          fieldName === oldName ? name : fieldName,
        );
      }
    }
  });
};

const renameRequiredDocumentFields = (name: string, oldName: string, allFields: Field[]): void => {
  allFields
    .filter((f) => f.requiredDocuments && f.requiredDocuments.length > 0)
    .forEach((field) => {
      field.requiredDocuments?.forEach((reqDoc) => {
        reqDoc.requiredForFields.forEach((reqForField) => {
          if (reqForField.fieldName === oldName) {
            reqForField.fieldName = name;
          }
        });
      });
    });
};

const renameSameValueFields = (name: string, oldName: string, allFields: Field[]): void => {
  const fieldsWithSameDataFieldAs = allFields.filter((f) => f.sameDataFieldAs === oldName);
  fieldsWithSameDataFieldAs.flatMap((field) => {
    field.sameDataFieldAs = name;
  });
};

const preRenameField = (
  newName: string,
  oldName: string,
  allFields: Field[],
  allAreas: Area[],
): void => {
  renameDependentFieldsinAreas(newName, oldName, allAreas);
  renameDependentFieldsinFields(newName, oldName, allFields);
  renameRequiredFields(newName, oldName, allFields);
  renameRequiredDocumentFields(newName, oldName, allFields);
  renameSameValueFields(newName, oldName, allFields);
};

export const setDuplicatedSection = (section: Section, index: number): Section => {
  const allFields = section.areas.flatMap((area) => area.fields);
  const allAreas = section.areas;
  const oldSectionName = section.name;
  const newSectionName = section.name.replace("#0", `#${index}`);
  section.areas = section.areas.flatMap((area) => {
    area.fields.flatMap((field) => {
      const oldName = field.name;
      const newName = field.name.replace(oldSectionName, newSectionName);
      preRenameField(newName, oldName, allFields, allAreas);
      field.name = newName;
      return field;
    });
    area.name = area.name.replace(oldSectionName, newSectionName);
    return area;
  });
  section.index = index;
  section.name = newSectionName;
  return section;
};

export const setInitalSectionsAreasFields = (form: GenericForm): Section[] => {
  const allFields = form.sections.flatMap((section) =>
    section.areas.flatMap((area) => area.fields),
  );
  const allAreas = form.sections.flatMap((section) => section.areas);
  return form.sections.map((section) => {
    if (section.isMultiple && section.index === undefined) {
      section.index = 0;
      section.name = `${section.name}#0`;
    }
    section.areas = section.areas.map((area) => {
      if ((section.isMultiple || area.isMultiple) && !area.name.includes(`${section.name}_`)) {
        area.name = `${section.name}_${area.name}`;
      }
      if (area.isMultiple && area.index === undefined) {
        area.index = 0;
        area.name = `${area.name}#0`;
      }
      if (section.isMultiple || area.isMultiple) {
        area.fields = area.fields.map((field) => {
          if (!field.name.includes(`${area.name}_`)) {
            const oldName = field.name;
            const newName = `${area.name}_${field.name}`;
            preRenameField(newName, oldName, allFields, allAreas);
            field.name = newName;
          }
          return field;
        });
      }
      return area;
    });
    return section;
  });
};

export const setDuplicatedArea = (area: Area, index: number, sectionName: string): Area => {
  const allFields = area.fields;
  const allAreas = [area];
  const oldAreaName = area.name;
  const oldAreaNameWOSection = area.name.replace(`${sectionName}_`, "");
  const newAreaNameWOSection = oldAreaNameWOSection.replace("#0", `#${index}`);
  const newAreaName = `${sectionName}_${newAreaNameWOSection}`;

  area.fields.flatMap((field) => {
    const oldName = field.name;
    const newName = field.name.replace(oldAreaName, newAreaName);
    preRenameField(newName, oldName, allFields, allAreas);
    field.name = newName;
    return field;
  });
  area.index = index;
  area.name = newAreaName;
  return area;
};

export const mapFieldToFieldMapping = (field: Field): Field => {
  const splitName = field.name.split("_");
  let originalName = field.name;
  let nameStartsWith = "";

  const prefixes: string[] = [];
  if (splitName?.length > 0) {
    originalName = splitName.at(-1) ?? field.name;
    for (let i = 0; i < splitName.length - 1; i++) {
      if (splitName[i].includes("#")) {
        const prefix = splitName[i].split("#")[0];
        prefixes.push(`${prefix}#`);
      }
    }
    nameStartsWith = field.name.replace(originalName, "");
  }

  const parentAttributeMapping: string[] = [];
  let map: string | undefined = undefined;
  const splitAttributeMapping = field.attributeMapping?.split(".");
  if (splitAttributeMapping?.length && splitAttributeMapping?.length > 0) {
    for (let i = 0; i <= splitAttributeMapping.length - 1; i++) {
      if (i == splitAttributeMapping.length - 1) {
        map = splitAttributeMapping[i];
      } else {
        parentAttributeMapping.push(splitAttributeMapping[i]);
      }
    }
  }
  field.fieldMapping = {
    originalName,
    prefixes,
    parentMap: parentAttributeMapping,
    map,
    nameStartsWith,
  };
  return field;
};

export const getVisibleFields = (fields: Field[], values: Record<string, unknown>): Field[] => {
  return fields.filter((field) => isFieldVisible(field, fields, values));
};

export const getInitialFieldValues = (fields: Field[]) => {
  const acc: Record<string, unknown> = {};
  for (const field of fields) {
    const name = field.name || "";
    const value = field?.defaultValue ?? "";
    acc[name] = value;
  }
  return acc;
};

const ensureArrayPath = (current: any, key: string, index: number): any => {
  if (!(key in current && key)) {
    current[key] = [];
  }
  if (!current[key][index]) {
    current[key][index] = {};
  }
  return current[key][index];
};

const ensureObjectPath = (current: any, key: string): any => {
  if (!(key in current) && key) {
    current[key] = {};
  }
  return current[key];
};

const setValue = (
  obj: Record<string, unknown>,
  config: {
    map: string;
    name: string;
    parentMap: string[];
    prefixes: string[];
  },
  value: unknown,
): void => {
  let current: any = obj;
  let prefixIndex = 0;

  for (const parent of config.parentMap) {
    const isArray = parent.endsWith("#");
    const key = isArray ? parent.slice(0, -1) : parent;

    if (isArray) {
      const prefix = config.prefixes[prefixIndex];
      const index = extractIndexFromName(config.name, prefix);
      current = ensureArrayPath(current, key, index);
      prefixIndex++;
    } else {
      current = ensureObjectPath(current, key);
    }
  }
  current[config.map] = value;
};

function extractIndexFromName(name: string, prefix: string): number {
  const indexString = String.raw`(\d+)`;
  const regex = new RegExp(`${escapeRegex(prefix)}${indexString}`);
  const match = regex.exec(name);

  if (match?.[1]) {
    return Number.parseInt(match[1], 10);
  }

  return 0;
}

function escapeRegex(str: string): string {
  return str?.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export const mapValuesToAPI = (values: Record<string, unknown>, fields: Field[]) => {
  const apiStructure: any = {};
  for (const field of fields) {
    let value = values[field.name || ""];
    const fieldData = field.sameDataFieldAs;

    if (!value && fieldData && values[fieldData]) value = values[fieldData];

    const config = {
      map: field.fieldMapping?.map || "",
      name: field.name || "",
      parentMap: field.fieldMapping?.parentMap || [],
      prefixes: field.fieldMapping?.prefixes || [],
    };

    setValue(apiStructure, config, value === false ? false : value || null);
  }
  // Remove empty values
  Object.keys(apiStructure).forEach((key) => {
    if (apiStructure[key] === "" || apiStructure[key] === null || apiStructure[key] === undefined) {
      delete apiStructure[key];
    }
  });
  return apiStructure;
};

const navigateArrayPath = (current: any, key: string, fieldName: string, prefix: string): any => {
  const index = extractIndexFromName(fieldName, prefix);
  if (!current[key] || !Array.isArray(current[key])) {
    return undefined;
  }
  if (index >= current[key].length || !current[key][index]) {
    return undefined;
  }
  return current[key][index];
};

const navigateObjectPath = (current: any, key: string): any => {
  if (!(key in current)) {
    return undefined;
  }
  return current[key];
};

const processParentPath = (
  current: any,
  parent: string,
  fieldName: string,
  prefixes: string[],
  prefixIndex: number,
): { current: any; prefixIndex: number } | undefined => {
  if (!current || typeof current !== "object") {
    return undefined;
  }

  const isArray = parent.endsWith("#");
  const key = isArray ? parent.slice(0, -1) : parent;

  if (isArray) {
    const prefix = prefixes[prefixIndex];
    const nextCurrent = navigateArrayPath(current, key, fieldName, prefix);
    if (nextCurrent === undefined) {
      return undefined;
    }
    return { current: nextCurrent, prefixIndex: prefixIndex + 1 };
  }

  const nextCurrent = navigateObjectPath(current, key);
  if (nextCurrent === undefined) {
    return undefined;
  }
  return { current: nextCurrent, prefixIndex };
};

const extractFinalValue = (current: any, map: string): unknown => {
  if (!current || typeof current !== "object" || !(map in current)) {
    return undefined;
  }

  const value = current[map];
  return value === null ? undefined : value;
};

const getValue = (
  obj: Record<string, unknown>,
  config: {
    map: string;
    name: string;
    parentMap: string[];
    prefixes: string[];
  },
): unknown => {
  let current: any = obj;
  let prefixIndex = 0;

  for (const parent of config.parentMap) {
    const result = processParentPath(current, parent, config.name, config.prefixes, prefixIndex);
    if (!result) {
      return undefined;
    }
    current = result.current;
    prefixIndex = result.prefixIndex;
  }

  return extractFinalValue(current, config.map);
};

const convertDateToFullISO = (value: unknown, field: Field): unknown => {
  if (field.type !== "datepicker" || typeof value !== "string" || !value) {
    return value;
  }

  // Already ISO
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [year, month, day] = value.split("-").map(Number);
  const now = new Date();

  const localDate = new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );

  return localDate.toISOString();
};

export const mapValuesFromAPI = (
  apiData: Record<string, unknown>,
  fields: Field[],
): Record<string, unknown> => {
  const formValues: Record<string, unknown> = {};

  for (const field of fields) {
    const config = {
      map: field.fieldMapping?.map || "",
      name: field.name || "",
      parentMap: field.fieldMapping?.parentMap || [],
      prefixes: field.fieldMapping?.prefixes || [],
    };

    const value = getValue(apiData, config);
    const finalValue = value ?? field.defaultValue ?? "";
    formValues[field.name || ""] = convertDateToFullISO(finalValue, field);
  }

  return formValues;
};

export const convertAPIDataToFormValues = (
  data: unknown,
  fields: Field[],
): Record<string, unknown> => {
  const dataAsRecord: Record<string, unknown> = data as Record<string, unknown>;
  return mapValuesFromAPI(dataAsRecord, fields);
};

export const updatePositionDropdownOptions = (
  allFields: Field[],
  positionOptions: GenericOptionProps[],
): Field[] => {
  return allFields.map((field) => {
    if (field.subtype === "diagnosticPosition") {
      return { ...field, options: positionOptions };
    }
    return field;
  });
};

export const setDisabledAutomaticRow = (
  allFields: Field[],
  getIsDisabledForPosition: (position: string, formValues: Record<string, unknown>) => boolean,
  formValues: Record<string, unknown>,
): Field[] => {
  return allFields.map((field) => {
    if (field.subtype === "diagnosticPosition") {
      const positionValue = (formValues[field.name] as string) || "";
      const shouldDisable = getIsDisabledForPosition(positionValue, formValues);
      return { ...field, isDisabled: shouldDisable };
    }
    return field;
  });
};

/**
 * Propagates updated fields from the flat `allFields` array back into
 * the `tabs` (Section[]) hierarchy so that rendered components see the changes.
 * Matches fields by `name` and replaces the reference in tabs → areas → fields.
 */
export const syncFieldsToTabs = (tabs: Section[], updatedFields: Field[]): Section[] => {
  const fieldMap = new Map(updatedFields.map((f) => [f.name, f]));
  return tabs.map((tab) => ({
    ...tab,
    areas: tab.areas.map((area) => ({
      ...area,
      fields: area.fields.map((field) => fieldMap.get(field.name) ?? field),
    })),
  }));
};

/**
 * Counts how many spare parts rows exist for each position value.
 * Returns a map: { "LA": 2, "SP": 1, ... }
 */
export const countRowsByPosition = (
  allFields: Field[],
  formValues: Record<string, unknown>,
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const field of allFields) {
    if (field.subtype === "diagnosticPosition") {
      const positionValue = (formValues[field.name] as string) || "";
      if (positionValue) {
        counts[positionValue] = (counts[positionValue] || 0) + 1;
      }
    }
  }
  return counts;
};

/**
 * Returns true when any position-dropdown field has options that differ from the
 * fields in `oldFields` (compares value, name and disabled flag per option).
 * Used to guard against infinite re-render loops when recalculating dropdown options.
 */
export const havePositionDropdownOptionsChanged = (
  oldFields: Field[],
  updatedFields: Field[],
): boolean =>
  updatedFields.some((f, i) => {
    if (f.subtype !== "diagnosticPosition") return false;
    const oldOpts = oldFields[i]?.options;
    const newOpts = f.options;
    if (oldOpts === newOpts) return false;
    if (!oldOpts || !newOpts) return true;
    if (oldOpts.length !== newOpts.length) return true;
    return newOpts.some((opt, j) => {
      const prev = oldOpts[j];
      return (
        opt.value !== prev?.value || opt.name !== prev?.name || opt.disabled !== prev?.disabled
      );
    });
  });

/**
 * Returns true when any field's `isDisabled` state differs between
 * `oldFields` and `updatedFields`. Used to avoid redundant state updates.
 */
export const haveFieldDisabledStatesChanged = (
  oldFields: Field[],
  updatedFields: Field[],
): boolean => updatedFields.some((f, i) => f.isDisabled !== oldFields[i]?.isDisabled);

export const updatePositionDropdownOptionsWithLimits = (
  allFields: Field[],
  positionOptions: GenericOptionProps[],
  allowedPositions: AllowedPosition[],
  formValues: Record<string, unknown>,
  disabledPositions: string[] = [],
): Field[] => {
  const maxCountMap = new Map(allowedPositions.map((p) => [p.position, p.maxCount]));
  const positionCounts = countRowsByPosition(allFields, formValues);

  return allFields.map((field) => {
    if (field.subtype === "diagnosticPosition") {
      const currentValue = (formValues[field.name] as string) || "";

      const updatedOptions: GenericOptionProps[] = positionOptions.map((opt) => {
        const optValue = (opt.value as string) || "";
        if (!optValue) return opt; // Keep placeholder "Select..." option as-is

        const isCurrentFieldValue = optValue === currentValue;

        if (disabledPositions.includes(optValue) && !isCurrentFieldValue) {
          return { ...opt, disabled: true };
        }

        const maxCount = maxCountMap.get(optValue);
        const currentCount = positionCounts[optValue] || 0;
        const isMaxedOut = maxCount !== undefined && currentCount >= maxCount;

        if (isMaxedOut && !isCurrentFieldValue) {
          return { ...opt, disabled: true };
        }
        return { ...opt, disabled: undefined };
      });

      return { ...field, options: updatedOptions };
    }
    return field;
  });
};

export const getAreasByName = (sections: Section[], areaName: string): Area[] => {
  return sections.flatMap((s) => s.areas.filter((a) => a.name === areaName));
};

export const getAreasBySectionName = (sections: Section[], sectionName: string): Area[] => {
  const section = sections.find((s) => s.name === sectionName);
  return section ? section.areas : [];
};

export const getFieldsBySectionName = (sections: Section[], sectionName: string): Field[] => {
  return sections
    .filter((s) => s.name === sectionName)
    .flatMap((s) => s.areas)
    .flatMap((a) => a.fields);
};
export const getFieldsByAreaName = (sections: Section[], areaName: string): Field[] => {
  return sections
    .flatMap((s) => s.areas)
    .filter((a) => a.name === areaName)
    .flatMap((a) => a.fields);
};
export const getFieldsBySectionAndAreaName = (
  sections: Section[],
  sectionName: string,
  areaName: string,
): Field[] => {
  return sections
    .filter((s) => s.name === sectionName)
    .flatMap((s) => s.areas)
    .filter((a) => a.name === areaName)
    .flatMap((a) => a.fields);
};
