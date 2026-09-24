import { useEffect, useRef } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import Area from "components/generics/Area/GenericArea.types";
import Field from "components/generics/Field/GenericField.types";
import Section from "components/generics/Section/GenericSection.types";
import {
  getMultipleAreaRows,
  growMultipleAreaRows,
  shrinkMultipleAreaRows,
  replaceMultipleAreaRows,
} from "components/generics/multipleArea";

export interface BuildRowValuesParams<T> {
  list: T[];
  rows: Area[];
  /** How many of `rows` already existed before this sync (the rest were just grown). */
  previousCount: number;
}

export interface UseMultipleAreaProps<T> {
  /** Source-of-truth list driving the row count — one row per item. */
  list: T[];
  /** Substring identifying the isMultiple area's base name, e.g. "diagnosticsSpareParts". */
  areaName: string;
  /** Name of the Section (tab) that owns the area. */
  sectionName: string;
  tabs: Section[];
  setTabs: Dispatch<SetStateAction<Section[]>>;
  setAllFields: Dispatch<SetStateAction<Field[] | null>>;
  setInitialFormValues: Dispatch<SetStateAction<Record<string, unknown>>>;
  skipFormResetRef: RefObject<boolean>;
  /** Computes the row values to write into Formik's initial values for the current rows. */
  buildRowValues: (params: BuildRowValuesParams<T>) => Record<string, unknown>;
  /** Never shrink below this many rows, so the #0 template stays visible with an empty list. Default 1. */
  minRows?: number;
}

export interface UseMultipleAreaReturn {
  /** The area's current rows, index order, reflecting the latest committed `tabs`. */
  rows: Area[];
}

/**
 * Keeps an isMultiple GenericArea's rows in sync with `list`: clones the
 * template area to grow, truncates from the end to shrink (never below
 * `minRows`), and writes the resulting fields/areas/initial values back via
 * the setters given. Centralizes what used to be five separate, near-identical
 * implementations (accessories, spare parts, archived spare parts, claim
 * materials, claim archived materials).
 */
export const useMultipleArea = <T>({
  list,
  areaName,
  sectionName,
  tabs,
  setTabs,
  setAllFields,
  setInitialFormValues,
  skipFormResetRef,
  buildRowValues,
  minRows = 1,
}: UseMultipleAreaProps<T>): UseMultipleAreaReturn => {
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const templateRef = useRef<Area | null>(null);

  useEffect(() => {
    const currentSection = tabsRef.current.find((t) => t.name === sectionName);
    const currentRows = getMultipleAreaRows(currentSection, areaName);

    if (currentRows.length > 0) {
      templateRef.current ??= structuredClone(currentRows[0]);
    }
    const template = currentRows[0] ?? templateRef.current;
    if (!template) return;

    const currentCount = currentRows.length;
    const targetCount = Math.max(list.length, minRows);
    const needed = targetCount - currentCount;

    let finalRows = currentRows;
    let addedFields: Field[] = [];
    let removedFieldNames = new Set<string>();

    if (needed > 0) {
      const maxIndex = currentRows.reduce((max, a) => Math.max(max, a.index ?? -1), -1);
      const grown = growMultipleAreaRows(
        structuredClone(template),
        sectionName,
        maxIndex + 1,
        needed,
      );
      finalRows = [...currentRows, ...grown.addedAreas];
      addedFields = grown.addedFields;
    } else if (needed < 0) {
      const shrunk = shrinkMultipleAreaRows(currentRows, targetCount);
      finalRows = shrunk.keptAreas;
      removedFieldNames = shrunk.removedFieldNames;
    }

    const rowValues = buildRowValues({ list, rows: finalRows, previousCount: currentCount });

    if (needed !== 0) {
      skipFormResetRef.current = true;
      if (needed > 0) {
        setAllFields((prev) => [...(prev ?? []), ...addedFields]);
      } else {
        setAllFields((prev) => (prev ?? []).filter((f) => !removedFieldNames.has(f.name)));
      }
      setTabs((prev) =>
        prev.map((t) =>
          t.name === sectionName
            ? { ...t, areas: replaceMultipleAreaRows(t.areas, areaName, finalRows) }
            : t,
        ),
      );
    }

    setInitialFormValues((prev) => {
      const withoutStaleRowValues = Object.fromEntries(
        Object.entries(prev).filter(([key]) => !key.includes(areaName) || key in rowValues),
      );
      return { ...withoutStaleRowValues, ...rowValues };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    list,
    areaName,
    sectionName,
    setAllFields,
    setTabs,
    setInitialFormValues,
    skipFormResetRef,
    buildRowValues,
    minRows,
  ]);

  const section = tabs.find((t) => t.name === sectionName);
  return { rows: getMultipleAreaRows(section, areaName) };
};
