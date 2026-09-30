import { useContext, useEffect, useMemo, useRef } from "react";
import Area from "./GenericArea.types";
import GenericArea from "./GenericArea";
import {
  GenericFormContext,
  type MultipleAreaConfig,
} from "../Form/GenericForm.context";
import {
  getMultipleAreaPrefix,
  growMultipleAreaRows,
  shallowEqualValues,
} from "../multipleArea";

const sectionNameOf = (area: Area): string => {
  const separator = area.name.indexOf("_");
  return separator === -1 ? "" : area.name.slice(0, separator);
};

/**
 * Renders one row per item of a parent-owned list from a single template area.
 * Owns cloning/renaming the row areas and registering their fields, so the parent
 * only maintains the list (see MultipleAreaConfig).
 */
function GenericMultipleArea({
  area,
  config,
}: Readonly<{ area: Area; config: MultipleAreaConfig }>) {
  const { allFields, syncMultipleAreaRows } = useContext(GenericFormContext);
  const { items, minRows = 0 } = config;
  const sectionName = config.sectionName ?? sectionNameOf(area);
  const count = Math.max(items.length, minRows);

  const rowsCacheRef = useRef<{ template: Area; sectionName: string; rows: Area[] } | null>(null);
  const rows = useMemo(() => {
    const cache = rowsCacheRef.current;
    const reusable =
      cache?.template === area && cache.sectionName === sectionName ? cache.rows : [];
    const next = reusable.slice(0, count);
    if (next.length < count) {
      next.push(...growMultipleAreaRows(area, sectionName, next.length, count - next.length).addedAreas);
    }
    rowsCacheRef.current = { template: area, sectionName, rows: next };
    return next;
  }, [area, sectionName, count]);

  // Read through refs so a parent that doesn't memoize these can't re-trigger the sync effect.
  const toRowValuesRef = useRef(config.toRowValues);
  toRowValuesRef.current = config.toRowValues;
  const allFieldsRef = useRef(allFields);
  allFieldsRef.current = allFields;
  const lastValuesRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!syncMultipleAreaRows) return;

    const prefix = getMultipleAreaPrefix(area);
    const registered = new Set(
      (allFieldsRef.current ?? []).filter((f) => f.name.startsWith(prefix)).map((f) => f.name),
    );
    const rowFields = rows.flatMap((row) => row.fields);
    const currentNames = new Set(rowFields.map((f) => f.name));
    const addedFields = rowFields.filter((f) => !registered.has(f.name));
    const removedFieldNames = new Set([...registered].filter((name) => !currentNames.has(name)));

    let values: Record<string, unknown> = {};
    rows.forEach((row, i) => {
      if (i < items.length) values = { ...values, ...toRowValuesRef.current(items[i], row.fields) };
    });

    const fieldsChanged = addedFields.length > 0 || removedFieldNames.size > 0;
    if (
      !fieldsChanged &&
      lastValuesRef.current &&
      shallowEqualValues(lastValuesRef.current, values)
    ) {
      return;
    }
    lastValuesRef.current = values;
    syncMultipleAreaRows({ addedFields, removedFieldNames, values });
  }, [area, rows, items, syncMultipleAreaRows]);

  if (rows.length === 0) return null;

  const Row = config.rowComponent;
  const body = rows.map((row, i) => {
    const key = config.getKey?.(items[i], i) ?? row.name;
    return Row ? (
      <Row key={key} area={row} index={i} item={items[i]} />
    ) : (
      <GenericArea key={key} area={{ ...row, isMultiple: false }} />
    );
  });

  const Wrapper = config.wrapper;
  return Wrapper ? (
    <Wrapper area={area} count={rows.length}>
      {body}
    </Wrapper>
  ) : (
    <>{body}</>
  );
}

export default GenericMultipleArea;
