import Area from "./Area/GenericArea.types";
import Field from "./Field/GenericField.types";
import Section from "./Section/GenericSection.types";
import { setDuplicatedArea, mapFieldToFieldMapping } from "./utils";

/** True when two flat, primitive-valued row-value maps have the same keys and values. */
export const shallowEqualValues = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean => {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every((key) => Object.is(a[key], b[key]));
};

/** All isMultiple rows for `areaName` currently present in `section`, in index order. */
export const getMultipleAreaRows = (section: Section | undefined, areaName: string): Area[] =>
  (section?.areas ?? [])
    .filter((area) => area.isMultiple && area.name.includes(areaName))
    .toSorted((a, b) => (a.index ?? 0) - (b.index ?? 0));

export interface GrowMultipleAreaResult {
  addedAreas: Area[];
  addedFields: Field[];
}

/**
 * Clones `template` `count` times, indexed from `fromIndex`, renamed for `sectionName`.
 * `sectionName` must be the template's immediate parent section name exactly as it
 * appears in the area's own name (e.g. "assetData#1", not just "assetData"), since
 * setDuplicatedArea only renumbers the first "#N" left after stripping that prefix.
 */
export const growMultipleAreaRows = (
  template: Area,
  sectionName: string,
  fromIndex: number,
  count: number,
): GrowMultipleAreaResult => {
  const addedAreas: Area[] = [];
  const addedFields: Field[] = [];

  for (let i = 0; i < count; i++) {
    const index = fromIndex + i;
    const cloned = structuredClone(template);
    if (index !== 0) cloned.label = "";
    const area = setDuplicatedArea(cloned, index, sectionName);
    area.fields = area.fields.map((field) => mapFieldToFieldMapping(field));
    addedAreas.push(area);
    addedFields.push(...area.fields);
  }

  return { addedAreas, addedFields };
};

export interface ShrinkMultipleAreaResult {
  keptAreas: Area[];
  removedAreaNames: Set<string>;
  removedFieldNames: Set<string>;
}

/** Truncates `rows` (already in index order) down to `targetCount`, dropping the excess from the end. */
export const shrinkMultipleAreaRows = (
  rows: Area[],
  targetCount: number,
): ShrinkMultipleAreaResult => {
  const keptAreas = rows.slice(0, targetCount);
  const removed = rows.slice(targetCount);
  return {
    keptAreas,
    removedAreaNames: new Set(removed.map((a) => a.name)),
    removedFieldNames: new Set(removed.flatMap((a) => a.fields.map((f) => f.name))),
  };
};

export interface FieldRename {
  oldName: string;
  newName: string;
}

export interface RemoveRowResult {
  /** Remaining rows, re-indexed to stay contiguous from 0. */
  areas: Area[];
  removedFieldNames: Set<string>;
  renamedFields: FieldRename[];
}

/**
 * Removes one row by name from anywhere in `rows` and re-indexes the rest so
 * indices stay contiguous (0..n-1) — generalizes the shift-on-delete logic that
 * used to be reimplemented separately for spare parts and for accessories.
 */
export const removeMultipleAreaRow = (
  rows: Area[],
  areaNameToRemove: string,
  sectionName: string,
): RemoveRowResult => {
  const removedRow = rows.find((a) => a.name === areaNameToRemove);
  const remaining = rows.filter((a) => a.name !== areaNameToRemove);
  const renamedFields: FieldRename[] = [];

  const areas = remaining.map((area, newIndex) => {
    if (area.index === newIndex) return area;
    const oldFieldNames = area.fields.map((f) => f.name);
    const reindexed = setDuplicatedArea(structuredClone(area), newIndex, sectionName);
    reindexed.fields = reindexed.fields.map((field, i) => {
      const oldName = oldFieldNames[i];
      if (oldName && oldName !== field.name) renamedFields.push({ oldName, newName: field.name });
      return mapFieldToFieldMapping(field);
    });
    return reindexed;
  });

  return {
    areas,
    removedFieldNames: new Set(removedRow?.fields.map((f) => f.name) ?? []),
    renamedFields,
  };
};

/**
 * Replaces a section's current rows for `areaName` with `finalRows`, keeping every
 * other area exactly where it was. New rows land at the position of the first old
 * row (or the end, if there were none yet) — GenericSection's stable sort by
 * `position` means insertion order is what keeps same-position rows grouped.
 */
export const replaceMultipleAreaRows = (areas: Area[], areaName: string, finalRows: Area[]): Area[] => {
  const isOldRow = (area: Area) => area.isMultiple && area.name.includes(areaName);
  const firstMatchIndex = areas.findIndex(isOldRow);
  const withoutOldRows = areas.filter((area) => !isOldRow(area));
  const insertAt = firstMatchIndex === -1 ? withoutOldRows.length : firstMatchIndex;
  return [...withoutOldRows.slice(0, insertAt), ...finalRows, ...withoutOldRows.slice(insertAt)];
};

/** Applies field removals + renames from removeMultipleAreaRow to a Formik-style values map. */
export const applyRowChangesToValues = (
  values: Record<string, unknown>,
  removedFieldNames: Set<string>,
  renamedFields: FieldRename[],
): Record<string, unknown> => {
  const next = { ...values };
  removedFieldNames.forEach((name) => delete next[name]);
  renamedFields.forEach(({ oldName, newName }) => {
    if (!(oldName in next)) return;
    next[newName] = next[oldName];
    if (oldName !== newName) delete next[oldName];
  });
  return next;
};

// ── Field-set rows ───────────────────────────────────────────────────────
// A handful of consumers (accessories) track isMultiple rows as a plain Field[]
// scraped from allFields rather than as full Area objects living in a Section —
// there's no Area to run setDuplicatedArea against. These cover the same
// grow/reindex-on-delete pattern at the field-name level instead.

/**
 * Renames every field whose name contains `${prefix}${oldIndex}` to
 * `${prefix}${newIndex}` instead, and recomputes its fieldMapping.
 */
export const reindexFieldSet = (
  fields: Field[],
  prefix: string,
  oldIndex: number,
  newIndex: number,
): Field[] => {
  const oldToken = `${prefix}${oldIndex}`;
  const newToken = `${prefix}${newIndex}`;
  return fields.map((field) => {
    if (!field.name.includes(oldToken)) return field;
    return mapFieldToFieldMapping({ ...field, name: field.name.replace(oldToken, newToken) });
  });
};

export interface FieldSetRow {
  index: number;
  fields: Field[];
}

/** Clones `templateFields` `count` times, indexed from `fromIndex`, via reindexFieldSet. */
export const growFieldSetRows = (
  templateFields: Field[],
  prefix: string,
  fromIndex: number,
  count: number,
): FieldSetRow[] =>
  Array.from({ length: count }, (_, i) => {
    const index = fromIndex + i;
    return { index, fields: reindexFieldSet(templateFields, prefix, 0, index) };
  });

/** Removes the row at `indexToRemove` and shifts every later row's index down by one. */
export const removeFieldSetRow = (
  rows: FieldSetRow[],
  indexToRemove: number,
  prefix: string,
): FieldSetRow[] =>
  rows
    .filter((row) => row.index !== indexToRemove)
    .map((row) => {
      if (row.index < indexToRemove) return row;
      const newIndex = row.index - 1;
      return { index: newIndex, fields: reindexFieldSet(row.fields, prefix, row.index, newIndex) };
    });
