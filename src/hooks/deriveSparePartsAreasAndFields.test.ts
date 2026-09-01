import { describe, it, expect } from "vitest";
import { deriveSparePartsAreasAndFields } from "./useDiagnosticsManager";
import type Field from "components/generics/Field/GenericField.types";
import type Area from "components/generics/Area/GenericArea.types";

// Deliberately does NOT mock components/generics/utils — this exercises the real
// setDuplicatedArea/mapFieldToFieldMapping renaming logic, unlike useDiagnosticsManager.test.ts
// (which mocks them as no-ops to isolate the hook's own orchestration). This is the test that
// actually proves the full-derivation reconciliation (items-and-prices-refactor.md §7.2)
// produces correctly-named, correctly-shaped rows — not just that the hook calls the right
// functions.

const makeField = (name: string, subtype?: string): Field => ({
  name,
  label: name,
  type: "text",
  subtype,
  sameDataFieldAs: "",
  pattern: "",
  maxLength: 0,
  minLength: 0,
  minValue: 0,
  maxValue: 0,
  position: 0,
  size: "3",
  infoText: "",
  patternText: "",
  extensions: [""],
  attributeMapping: `diagnosticData_diagnosticsSpareParts#0.${name.split("_").pop()}`,
  dependFieldCondition: "AND",
  dependentFields: [],
  defaultValue: "",
  isDisabled: false,
  isHidden: false,
  isInfoIcon: false,
  isSubField: false,
  autoFillFields: [],
});

const templateArea: Area = {
  name: "diagnosticData_diagnosticsSpareParts#0",
  label: "Spare Parts",
  position: 0,
  fields: [
    makeField("diagnosticData_diagnosticsSpareParts#0_position", "diagnosticPosition"),
    makeField("diagnosticData_diagnosticsSpareParts#0_partNumber", "diagnosticPartNumber"),
    makeField("diagnosticData_diagnosticsSpareParts#0_quantity", "diagnosticQuantity"),
  ],
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: false,
  isMultiple: true,
  index: 0,
};

describe("deriveSparePartsAreasAndFields", () => {
  it("derives one correctly-named area per row, index-suffixed", () => {
    const { areas, fields } = deriveSparePartsAreasAndFields(templateArea, 3, "diagnosticData");

    expect(areas).toHaveLength(3);
    expect(areas.map((a) => a.name)).toEqual([
      "diagnosticData_diagnosticsSpareParts#0",
      "diagnosticData_diagnosticsSpareParts#1",
      "diagnosticData_diagnosticsSpareParts#2",
    ]);
    expect(areas.map((a) => a.index)).toEqual([0, 1, 2]);

    expect(fields).toHaveLength(9); // 3 fields per row × 3 rows
    expect(fields.map((f) => f.name)).toEqual([
      "diagnosticData_diagnosticsSpareParts#0_position",
      "diagnosticData_diagnosticsSpareParts#0_partNumber",
      "diagnosticData_diagnosticsSpareParts#0_quantity",
      "diagnosticData_diagnosticsSpareParts#1_position",
      "diagnosticData_diagnosticsSpareParts#1_partNumber",
      "diagnosticData_diagnosticsSpareParts#1_quantity",
      "diagnosticData_diagnosticsSpareParts#2_position",
      "diagnosticData_diagnosticsSpareParts#2_partNumber",
      "diagnosticData_diagnosticsSpareParts#2_quantity",
    ]);
  });

  it("computes fieldMapping.nameStartsWith per row, so SparePartsRow's areaIndex parsing still works", () => {
    const { fields } = deriveSparePartsAreasAndFields(templateArea, 2, "diagnosticData");

    const row1PositionField = fields.find(
      (f) => f.name === "diagnosticData_diagnosticsSpareParts#1_position",
    );
    // SparePartsRow.tsx derives its own areaIndex via /#(\d+)_/.exec(nameStartsWith) — this
    // is the exact input that regex parses, so it must still contain "#1_".
    expect(row1PositionField?.fieldMapping?.nameStartsWith).toContain("#1_");
  });

  it("only the first row (#0) keeps the template's label — matches SparePartsArea's showAreaTitle check", () => {
    const { areas } = deriveSparePartsAreasAndFields(templateArea, 3, "diagnosticData");

    expect(areas[0].label).toBe("Spare Parts");
    expect(areas[1].label).toBe("");
    expect(areas[2].label).toBe("");
  });

  it("re-deriving for a smaller count produces exactly the rows that would exist after a delete, with no leftover higher-index rows", () => {
    const before = deriveSparePartsAreasAndFields(templateArea, 3, "diagnosticData");
    expect(before.areas).toHaveLength(3);

    // Simulates "row 0 deleted, materials now has 2 items" — full re-derivation from the
    // pristine template, not a patch of `before`.
    const after = deriveSparePartsAreasAndFields(templateArea, 2, "diagnosticData");

    expect(after.areas).toHaveLength(2);
    expect(after.areas.map((a) => a.name)).toEqual([
      "diagnosticData_diagnosticsSpareParts#0",
      "diagnosticData_diagnosticsSpareParts#1",
    ]);
    // No area named "#2" survives — this is what onDeleteRow used to have to guarantee via
    // shiftSparePartsArea/shiftSparePartsKey; full derivation gets it for free.
    expect(after.areas.some((a) => a.name.includes("#2"))).toBe(false);
  });

  it("does not mutate the template area across repeated calls", () => {
    deriveSparePartsAreasAndFields(templateArea, 5, "diagnosticData");
    // If structuredClone were missing anywhere, the template itself would have been renamed
    // in place, and this second call would derive from the wrong base name.
    const { areas } = deriveSparePartsAreasAndFields(templateArea, 1, "diagnosticData");
    expect(areas[0].name).toBe("diagnosticData_diagnosticsSpareParts#0");
    expect(templateArea.name).toBe("diagnosticData_diagnosticsSpareParts#0");
  });
});
