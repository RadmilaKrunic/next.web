import {
  getMultipleAreaRows,
  growMultipleAreaRows,
  shrinkMultipleAreaRows,
  removeMultipleAreaRow,
  replaceMultipleAreaRows,
  applyRowChangesToValues,
  reindexFieldSet,
  growFieldSetRows,
  removeFieldSetRow,
} from "./multipleArea";
import Field from "./Field/GenericField.types";
import Section from "./Section/GenericSection.types";
import Area from "./Area/GenericArea.types";

const makeField = (overrides: Partial<Field>): Field => ({
  name: overrides.name || "field",
  label: overrides.label || "Field",
  type: overrides.type || "text",
  isDisabled: overrides.isDisabled ?? false,
  ...overrides,
});

const makeArea = (fields: Field[], overrides: Partial<Area> = {}): Area => ({
  name: "row#0",
  label: "Row",
  position: 1,
  fields,
  dependFieldCondition: "AND",
  dependentFields: [],
  isSubArea: false,
  actions: null,
  isMultiple: true,
  index: 0,
  ...overrides,
});

const makeSection = (areas: Area[], overrides: Partial<Section> = {}): Section => ({
  name: "tab",
  label: "Tab",
  isHidden: false,
  dependFieldCondition: "AND",
  position: 1,
  areas,
  actions: null,
  isSubSection: false,
  isAccordion: false,
  isTab: false,
  ...overrides,
});

describe("getMultipleAreaRows", () => {
  it("returns only isMultiple areas whose name includes areaName, sorted by index", () => {
    const row1 = makeArea([], { name: "tab_row#1", index: 1 });
    const row0 = makeArea([], { name: "tab_row#0", index: 0 });
    const other = makeArea([], { name: "tab_other#0", index: 0 });
    const notMultiple = makeArea([], { name: "tab_row#2", index: 2, isMultiple: false });
    const section = makeSection([row1, other, row0, notMultiple]);

    expect(getMultipleAreaRows(section, "row")).toEqual([row0, row1]);
  });

  it("returns an empty array when the section is undefined", () => {
    expect(getMultipleAreaRows(undefined, "row")).toEqual([]);
  });
});

describe("growMultipleAreaRows", () => {
  it("clones the template count times, indexed from fromIndex, scoped under sectionName", () => {
    const template = makeArea([makeField({ name: "tab_row#0_partNumber" })], {
      name: "tab_row#0",
      label: "Row",
      index: 0,
    });

    const { addedAreas, addedFields } = growMultipleAreaRows(template, "tab", 1, 2);

    expect(addedAreas.map((a) => a.name)).toEqual(["tab_row#1", "tab_row#2"]);
    expect(addedAreas.map((a) => a.index)).toEqual([1, 2]);
    expect(addedFields.map((f) => f.name)).toEqual(["tab_row#1_partNumber", "tab_row#2_partNumber"]);
  });

  it("clears the label on every added row except index 0", () => {
    const template = makeArea([], { name: "tab_row#0", label: "Spare part", index: 0 });

    const { addedAreas } = growMultipleAreaRows(template, "tab", 0, 2);

    expect(addedAreas[0].label).toBe("Spare part");
    expect(addedAreas[1].label).toBe("");
  });

  it("stamps fieldMapping on every added field so mapValuesToAPI/FromAPI can use it", () => {
    const template = makeArea([makeField({ name: "tab_row#0_position", attributeMapping: "materials#.position" })], {
      name: "tab_row#0",
      index: 0,
    });

    const { addedFields } = growMultipleAreaRows(template, "tab", 1, 1);

    expect(addedFields[0].fieldMapping).toEqual(
      expect.objectContaining({ map: "position", parentMap: ["materials#"] }),
    );
  });

  it("does not mutate the template it was given", () => {
    const template = makeArea([makeField({ name: "tab_row#0_partNumber" })], {
      name: "tab_row#0",
      index: 0,
    });

    growMultipleAreaRows(template, "tab", 1, 1);

    expect(template.name).toBe("tab_row#0");
    expect(template.fields[0].name).toBe("tab_row#0_partNumber");
  });
});

describe("shrinkMultipleAreaRows", () => {
  it("keeps the first targetCount rows and reports the rest as removed", () => {
    const rows = [
      makeArea([makeField({ name: "tab_row#0_f" })], { name: "tab_row#0", index: 0 }),
      makeArea([makeField({ name: "tab_row#1_f" })], { name: "tab_row#1", index: 1 }),
      makeArea([makeField({ name: "tab_row#2_f" })], { name: "tab_row#2", index: 2 }),
    ];

    const result = shrinkMultipleAreaRows(rows, 1);

    expect(result.keptAreas.map((a) => a.name)).toEqual(["tab_row#0"]);
    expect(result.removedAreaNames).toEqual(new Set(["tab_row#1", "tab_row#2"]));
    expect(result.removedFieldNames).toEqual(new Set(["tab_row#1_f", "tab_row#2_f"]));
  });

  it("removes nothing when targetCount is not smaller than the current row count", () => {
    const rows = [makeArea([], { name: "tab_row#0", index: 0 })];
    const result = shrinkMultipleAreaRows(rows, 5);
    expect(result.keptAreas).toEqual(rows);
    expect(result.removedAreaNames.size).toBe(0);
  });
});

describe("removeMultipleAreaRow", () => {
  it("drops the named row and re-indexes the remaining rows contiguously", () => {
    const rows = [
      makeArea([makeField({ name: "tab_row#0_partNumber" })], { name: "tab_row#0", index: 0 }),
      makeArea([makeField({ name: "tab_row#1_partNumber" })], { name: "tab_row#1", index: 1 }),
      makeArea([makeField({ name: "tab_row#2_partNumber" })], { name: "tab_row#2", index: 2 }),
    ];

    const result = removeMultipleAreaRow(rows, "tab_row#0", "tab");

    expect(result.areas.map((a) => a.name)).toEqual(["tab_row#0", "tab_row#1"]);
    expect(result.areas.map((a) => a.index)).toEqual([0, 1]);
    expect(result.removedFieldNames).toEqual(new Set(["tab_row#0_partNumber"]));
    expect(result.renamedFields).toEqual([
      { oldName: "tab_row#1_partNumber", newName: "tab_row#0_partNumber" },
      { oldName: "tab_row#2_partNumber", newName: "tab_row#1_partNumber" },
    ]);
  });

  it("leaves a row untouched (no rename) when its index doesn't change", () => {
    const rows = [
      makeArea([makeField({ name: "tab_row#0_partNumber" })], { name: "tab_row#0", index: 0 }),
      makeArea([makeField({ name: "tab_row#1_partNumber" })], { name: "tab_row#1", index: 1 }),
    ];

    const result = removeMultipleAreaRow(rows, "tab_row#1", "tab");

    expect(result.areas).toEqual([rows[0]]);
    expect(result.renamedFields).toEqual([]);
  });

  it("is a no-op removal when the named row isn't found", () => {
    const rows = [makeArea([makeField({ name: "tab_row#0_f" })], { name: "tab_row#0", index: 0 })];
    const result = removeMultipleAreaRow(rows, "tab_row#9", "tab");
    expect(result.areas).toEqual(rows);
    expect(result.removedFieldNames.size).toBe(0);
  });
});

describe("replaceMultipleAreaRows", () => {
  it("swaps the old rows for the new ones at the position of the first old row", () => {
    const other = makeArea([], { name: "tab_other#0", index: 0 });
    const oldRow0 = makeArea([], { name: "tab_row#0", index: 0 });
    const oldRow1 = makeArea([], { name: "tab_row#1", index: 1 });
    const tail = makeArea([], { name: "tab_tail#0", index: 0 });
    const newRows = [
      makeArea([], { name: "tab_row#0", index: 0 }),
      makeArea([], { name: "tab_row#1", index: 1 }),
      makeArea([], { name: "tab_row#2", index: 2 }),
    ];

    const result = replaceMultipleAreaRows([other, oldRow0, oldRow1, tail], "row", newRows);

    expect(result.map((a) => a.name)).toEqual([
      "tab_other#0",
      "tab_row#0",
      "tab_row#1",
      "tab_row#2",
      "tab_tail#0",
    ]);
  });

  it("does not disturb areas belonging to a different isMultiple group", () => {
    const archived = makeArea([], { name: "tab_archived#0", index: 0 });
    const active = makeArea([], { name: "tab_active#0", index: 0 });

    const result = replaceMultipleAreaRows([archived, active], "active", [
      makeArea([], { name: "tab_active#0", index: 0 }),
      makeArea([], { name: "tab_active#1", index: 1 }),
    ]);

    expect(result.map((a) => a.name)).toEqual(["tab_archived#0", "tab_active#0", "tab_active#1"]);
  });

  it("appends at the end when no matching row exists yet", () => {
    const other = makeArea([], { name: "tab_other#0", index: 0 });
    const result = replaceMultipleAreaRows([other], "row", [
      makeArea([], { name: "tab_row#0", index: 0 }),
    ]);
    expect(result.map((a) => a.name)).toEqual(["tab_other#0", "tab_row#0"]);
  });
});

describe("applyRowChangesToValues", () => {
  it("deletes removed field keys and moves renamed field keys to their new name", () => {
    const values = {
      tab_row_0_partNumber: "REMOVED",
      tab_row_1_partNumber: "A100",
      tab_row_2_partNumber: "A200",
      untouched: "keep-me",
    };

    const result = applyRowChangesToValues(
      values,
      new Set(["tab_row_0_partNumber"]),
      [
        { oldName: "tab_row_1_partNumber", newName: "tab_row_0_partNumber" },
        { oldName: "tab_row_2_partNumber", newName: "tab_row_1_partNumber" },
      ],
    );

    expect(result).toEqual({
      tab_row_0_partNumber: "A100",
      tab_row_1_partNumber: "A200",
      untouched: "keep-me",
    });
  });

  it("does not throw and leaves values untouched when a renamed key was never set", () => {
    const values = { untouched: "keep-me" };
    const result = applyRowChangesToValues(values, new Set(), [
      { oldName: "missing", newName: "alsoMissing" },
    ]);
    expect(result).toEqual({ untouched: "keep-me" });
  });

  it("does not mutate the input values object", () => {
    const values = { a: 1 };
    applyRowChangesToValues(values, new Set(["a"]), []);
    expect(values).toEqual({ a: 1 });
  });
});

describe("reindexFieldSet", () => {
  it("renames only fields containing the old index token, recomputing fieldMapping", () => {
    const fields = [
      makeField({ name: "assetData#0_accessory#0_selectAccessory", attributeMapping: "accessories#.accessoryName" }),
      makeField({ name: "unrelated_field" }),
    ];

    const result = reindexFieldSet(fields, "accessory#", 0, 2);

    expect(result[0].name).toBe("assetData#0_accessory#2_selectAccessory");
    expect(result[0].fieldMapping).toBeDefined();
    expect(result[1]).toBe(fields[1]);
  });

  it("is a no-op when no field name contains the old index token", () => {
    const fields = [makeField({ name: "accessory#5_quantity" })];
    const result = reindexFieldSet(fields, "accessory#", 0, 1);
    expect(result).toEqual(fields);
  });
});

describe("growFieldSetRows", () => {
  it("clones the template fields count times, indexed from fromIndex", () => {
    const templateFields = [makeField({ name: "assetData#0_accessory#0_quantity" })];

    const rows = growFieldSetRows(templateFields, "accessory#", 1, 2);

    expect(rows).toEqual([
      { index: 1, fields: [expect.objectContaining({ name: "assetData#0_accessory#1_quantity" })] },
      { index: 2, fields: [expect.objectContaining({ name: "assetData#0_accessory#2_quantity" })] },
    ]);
  });
});

describe("removeFieldSetRow", () => {
  it("drops the row at indexToRemove and shifts later rows down by one", () => {
    const rows = [
      { index: 0, fields: [makeField({ name: "accessory#0_quantity" })] },
      { index: 1, fields: [makeField({ name: "accessory#1_quantity" })] },
      { index: 2, fields: [makeField({ name: "accessory#2_quantity" })] },
    ];

    const result = removeFieldSetRow(rows, 0, "accessory#");

    expect(result.map((r) => r.index)).toEqual([0, 1]);
    expect(result[0].fields[0].name).toBe("accessory#0_quantity");
    expect(result[1].fields[0].name).toBe("accessory#1_quantity");
  });

  it("leaves rows before indexToRemove untouched", () => {
    const rows = [
      { index: 0, fields: [makeField({ name: "accessory#0_quantity" })] },
      { index: 1, fields: [makeField({ name: "accessory#1_quantity" })] },
    ];

    const result = removeFieldSetRow(rows, 1, "accessory#");

    expect(result).toEqual([rows[0]]);
  });
});
