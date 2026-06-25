import {
  updatePositionDropdownOptions,
  updatePositionDropdownOptionsWithLimits,
  setDisabledAutomaticRow,
  countRowsByPosition,
  syncFieldsToTabs,
  isDependedAndVisible,
  isFieldVisible,
  getVisibleFields,
  mapAreaDependentFields,
  getAllAreasFromSection,
  getAllFieldsFromSection,
  getAllFieldsFromForm,
  setSectionDisabledState,
  toggleSectionFieldsDisabled,
  mapFieldToFieldMapping,
  getInitialFieldValues,
  mapValuesToAPI,
  mapValuesFromAPI,
  convertAPIDataToFormValues,
  havePositionDropdownOptionsChanged,
  haveFieldDisabledStatesChanged,
  getAreasByName,
  getAreasBySectionName,
  getFieldsBySectionName,
  getFieldsByAreaName,
  getFieldsBySectionAndAreaName,
} from "./utils";
import Field, { GenericOptionProps } from "./Field/GenericField.types";
import Section from "./Section/GenericSection.types";
import Area from "./Area/GenericArea.types";
import type GenericForm from "./Form/GenericForm.types";
import type { AllowedPosition } from "api/services/countryConfiguration/countryConfiguration";

const makeField = (overrides: Partial<Field>): Field => ({
  name: overrides.name || "field",
  label: overrides.label || "Field",
  type: overrides.type || "text",
  attributeMapping: overrides.attributeMapping,
  options: overrides.options,
  isDisabled: overrides.isDisabled ?? false,
  ...overrides,
});

const makeArea = (fields: Field[], overrides: Partial<Area> = {}): Area => ({
  name: "area",
  label: "Area",
  position: 1,
  fields,
  dependFieldCondition: "AND",
  dependentFields: [],
  isSubArea: false,
  actions: null,
  ...overrides,
});

const makeSection = (areas: Area[], overrides: Partial<Section> = {}): Section => ({
  name: "section",
  label: "Section",
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

describe("updatePositionDropdownOptions", () => {
  it("updates options on position fields matching diagnostic.materials#.position", () => {
    const fields: Field[] = [
      makeField({
        name: "0_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#0.position",
        options: [],
      }),
      makeField({
        name: "0_sparePartNumber",
        attributeMapping: "diagnostic.materials#0.partNumber",
      }),
      makeField({
        name: "1_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#1.position",
        options: [],
      }),
    ];

    const newOptions = [
      { value: "LA", name: "LA" },
      { value: "SP", name: "SP" },
    ];

    const result = updatePositionDropdownOptions(fields, newOptions);

    expect(result[0].options).toEqual(newOptions);
    expect(result[1].options).toBeUndefined(); // partNumber field unchanged
    expect(result[2].options).toEqual(newOptions);
  });

  it("does not modify fields without matching attribute mapping", () => {
    const fields: Field[] = [makeField({ name: "someField", attributeMapping: "job.asset.name" })];

    const result = updatePositionDropdownOptions(fields, [{ value: "LA", name: "LA" }]);
    expect(result[0]).toBe(fields[0]); // Same reference, not modified
  });

  it("handles empty fields array", () => {
    const result = updatePositionDropdownOptions([], [{ value: "LA", name: "LA" }]);
    expect(result).toEqual([]);
  });
});

describe("setDisabledAutomaticRow", () => {
  it("disables the position field when getIsDisabled returns true for its value", () => {
    const fields: Field[] = [
      makeField({
        name: "0_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#0.position",
        isDisabled: false,
      }),
      makeField({
        name: "0_unitPrice",
        attributeMapping: "diagnostic.materials#0.unitPrice",
        isDisabled: false,
      }),
    ];

    const formValues = { "0_position": "LA" };
    const getIsDisabled = (position: string) => position === "LA";

    const result = setDisabledAutomaticRow(fields, getIsDisabled, formValues);

    expect(result[0].isDisabled).toBe(true); // position field disabled for LA
    expect(result[1].isDisabled).toBe(false); // non-position field unchanged
  });

  it("enables the position field when getIsDisabled returns false for its value", () => {
    const fields: Field[] = [
      makeField({
        name: "0_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#0.position",
        isDisabled: true,
      }),
      makeField({
        name: "0_unitPrice",
        attributeMapping: "diagnostic.materials#0.unitPrice",
        isDisabled: true,
      }),
    ];

    const formValues = { "0_position": "SP" };
    const getIsDisabled = () => false;

    const result = setDisabledAutomaticRow(fields, getIsDisabled, formValues);

    expect(result[0].isDisabled).toBe(false); // position field enabled
    expect(result[1].isDisabled).toBe(true); // non-position field unchanged
  });
});

describe("countMaterialsByPosition", () => {
  it("counts materials by position value from form values", () => {
    const fields: Field[] = [
      makeField({
        name: "0_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#0.position",
      }),
      makeField({
        name: "1_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#1.position",
      }),
      makeField({
        name: "2_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#2.position",
      }),
      makeField({ name: "0_description", attributeMapping: "diagnostic.materials#0.description" }),
    ];

    const formValues: Record<string, unknown> = {
      "0_position": "LA",
      "1_position": "SP",
      "2_position": "LA",
      "0_description": "some part",
    };

    const counts = countRowsByPosition(fields, formValues);
    expect(counts).toEqual({ LA: 2, SP: 1 });
  });

  it("ignores empty position values", () => {
    const fields: Field[] = [
      makeField({
        name: "0_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#0.position",
      }),
      makeField({
        name: "1_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#1.position",
      }),
    ];

    const formValues: Record<string, unknown> = {
      "0_position": "LA",
      "1_position": "",
    };

    const counts = countRowsByPosition(fields, formValues);
    expect(counts).toEqual({ LA: 1 });
  });

  it("returns empty object when no position fields exist", () => {
    const counts = countRowsByPosition([], {});
    expect(counts).toEqual({});
  });
});

describe("syncFieldsToTabs", () => {
  it("propagates updated field options into tabs hierarchy", () => {
    const positionField = makeField({
      name: "0_position",
      attributeMapping: "diagnostic.materials#0.position",
      options: [],
    });
    const otherField = makeField({
      name: "0_sparePartNumber",
      attributeMapping: "diagnostic.materials#0.partNumber",
    });

    const tabs: Section[] = [
      {
        name: "diagnosticData",
        label: "Diagnostics",
        isHidden: false,
        dependFieldCondition: "AND",
        position: 1,
        areas: [
          {
            name: "diagnosticsSpareParts",
            label: "Spare Parts",
            position: 1,
            fields: [positionField, otherField],
            dependFieldCondition: "AND",
            dependentFields: [],
            isSubArea: false,
            actions: [],
          },
        ],
        actions: [],
        isSubSection: false,
        isAccordion: false,
        isTab: true,
      },
    ];

    const newOptions = [
      { value: "LA", name: "LA" },
      { value: "SP", name: "SP" },
    ];

    // Simulate the updated allFields array
    const updatedFields = [{ ...positionField, options: newOptions }, otherField];

    const result = syncFieldsToTabs(tabs, updatedFields);

    // The tab's area field should now have the new options
    expect(result[0].areas[0].fields[0].options).toEqual(newOptions);
    // The other field should remain unchanged
    expect(result[0].areas[0].fields[1]).toBe(otherField);
  });

  it("returns tabs unchanged when no fields match", () => {
    const field = makeField({ name: "someField" });
    const tabs: Section[] = [
      {
        name: "tab1",
        label: "Tab",
        isHidden: false,
        dependFieldCondition: "AND",
        position: 1,
        areas: [
          {
            name: "area1",
            label: "Area",
            position: 1,
            fields: [field],
            dependFieldCondition: "AND",
            dependentFields: [],
            isSubArea: false,
            actions: [],
          },
        ],
        actions: [],
        isSubSection: false,
        isAccordion: false,
        isTab: true,
      },
    ];

    const result = syncFieldsToTabs(tabs, []);
    // Field not in updatedFields map -> kept as-is
    expect(result[0].areas[0].fields[0]).toBe(field);
  });
});

describe("updatePositionDropdownOptionsWithLimits", () => {
  const makeAllowedPosition = (
    position: string,
    minCount: number,
    maxCount: number,
  ): AllowedPosition => ({
    position,
    minCount,
    maxCount,
    quantity: { quantitySource: "DEFAULT", defaultQuantity: 1 },
    unitPriceSource: "USER",
  });

  const baseOptions = [
    { value: "LA", name: "LA" },
    { value: "SP", name: "SP" },
    { value: "FL", name: "FL" },
  ];

  it("disables a position option when its maxCount is reached", () => {
    const fields: Field[] = [
      makeField({
        name: "0_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#0.position",
        options: [],
      }),
      makeField({
        name: "1_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#1.position",
        options: [],
      }),
    ];

    const allowedPositions = [
      makeAllowedPosition("LA", 0, 1),
      makeAllowedPosition("SP", 0, 5),
      makeAllowedPosition("FL", 0, 2),
    ];

    // Row 0 has "LA", Row 1 has "SP" → LA maxCount (1) is reached
    const formValues: Record<string, unknown> = {
      "0_position": "LA",
      "1_position": "SP",
    };

    const result = updatePositionDropdownOptionsWithLimits(
      fields,
      baseOptions,
      allowedPositions,
      formValues,
    );

    // Row 0 (has "LA"): LA should stay enabled (it's the current value)
    const row0Opts = result[0].options!;
    expect(row0Opts.find((o) => o.value === "LA")?.disabled).toBeUndefined();
    expect(row0Opts.find((o) => o.value === "SP")?.disabled).toBeUndefined();

    // Row 1 (has "SP"): LA should be disabled (maxed out, not current value)
    const row1Opts = result[1].options!;
    expect(row1Opts.find((o) => o.value === "LA")?.disabled).toBe(true);
    expect(row1Opts.find((o) => o.value === "SP")?.disabled).toBeUndefined();
  });

  it("keeps the currently selected position enabled even when maxed out", () => {
    const fields: Field[] = [
      makeField({
        name: "0_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#0.position",
      }),
    ];

    const allowedPositions = [makeAllowedPosition("LA", 0, 1), makeAllowedPosition("SP", 0, 5)];

    const formValues: Record<string, unknown> = {
      "0_position": "LA",
    };

    const result = updatePositionDropdownOptionsWithLimits(
      fields,
      baseOptions,
      allowedPositions,
      formValues,
    );

    // Row 0 has "LA" selected AND LA count (1) >= maxCount (1).
    // LA should remain enabled because it's the current field's value.
    const opts = result[0].options!;
    expect(opts.find((o) => o.value === "LA")?.disabled).toBeUndefined();
  });

  it("does not disable positions that have not reached maxCount", () => {
    const fields: Field[] = [
      makeField({
        name: "0_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#0.position",
      }),
      makeField({
        name: "1_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#1.position",
      }),
    ];

    const allowedPositions = [
      makeAllowedPosition("LA", 0, 5),
      makeAllowedPosition("SP", 0, 5),
      makeAllowedPosition("FL", 0, 5),
    ];

    const formValues: Record<string, unknown> = {
      "0_position": "LA",
      "1_position": "SP",
    };

    const result = updatePositionDropdownOptionsWithLimits(
      fields,
      baseOptions,
      allowedPositions,
      formValues,
    );

    // All positions have maxCount=5 and only 1 each → nothing disabled
    for (const field of result) {
      if (field.options) {
        for (const opt of field.options) {
          expect(opt.disabled).toBeUndefined();
        }
      }
    }
  });

  it("disables multiple positions when several hit maxCount", () => {
    const fields: Field[] = [
      makeField({
        name: "0_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#0.position",
      }),
      makeField({
        name: "1_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#1.position",
      }),
      makeField({
        name: "2_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#2.position",
      }),
    ];

    const allowedPositions = [
      makeAllowedPosition("LA", 0, 1),
      makeAllowedPosition("SP", 0, 1),
      makeAllowedPosition("FL", 0, 5),
    ];

    const formValues: Record<string, unknown> = {
      "0_position": "LA",
      "1_position": "SP",
      "2_position": "FL",
    };

    const result = updatePositionDropdownOptionsWithLimits(
      fields,
      baseOptions,
      allowedPositions,
      formValues,
    );

    // Row 2 (has "FL"): both LA and SP should be disabled
    const row2Opts = result[2].options!;
    expect(row2Opts.find((o) => o.value === "LA")?.disabled).toBe(true);
    expect(row2Opts.find((o) => o.value === "SP")?.disabled).toBe(true);
    expect(row2Opts.find((o) => o.value === "FL")?.disabled).toBeUndefined();
  });

  it("does not modify non-position fields", () => {
    const positionField = makeField({
      name: "0_position",
      subtype: "diagnosticPosition",
      attributeMapping: "diagnostic.materials#0.position",
    });
    const descriptionField = makeField({
      name: "0_description",
      attributeMapping: "diagnostic.materials#0.description",
    });

    const allowedPositions = [makeAllowedPosition("LA", 0, 1)];
    const formValues: Record<string, unknown> = { "0_position": "LA" };

    const result = updatePositionDropdownOptionsWithLimits(
      [positionField, descriptionField],
      baseOptions,
      allowedPositions,
      formValues,
    );

    // Description field should not be modified
    expect(result[1]).toBe(descriptionField);
  });

  it("handles empty fields array", () => {
    const result = updatePositionDropdownOptionsWithLimits(
      [],
      baseOptions,
      [makeAllowedPosition("LA", 0, 1)],
      {},
    );
    expect(result).toEqual([]);
  });

  it("preserves placeholder option without disabling it", () => {
    const fields: Field[] = [
      makeField({
        name: "0_position",
        subtype: "diagnosticPosition",
        attributeMapping: "diagnostic.materials#0.position",
      }),
    ];

    const optionsWithPlaceholder = [
      { value: "", name: "Select..." },
      { value: "LA", name: "LA" },
    ];

    const allowedPositions = [makeAllowedPosition("LA", 0, 1)];
    const formValues: Record<string, unknown> = { "0_position": "LA" };

    const result = updatePositionDropdownOptionsWithLimits(
      fields,
      optionsWithPlaceholder,
      allowedPositions,
      formValues,
    );

    const opts = result[0].options!;
    // Placeholder should be returned as-is (not disabled)
    expect(opts[0].value).toBe("");
    expect(opts[0].disabled).toBeUndefined();
  });
});

describe("isDependedAndVisible", () => {
  const formFields = [makeField({ name: "type" }), makeField({ name: "status" })];

  it("returns true when fields array is empty", () => {
    expect(isDependedAndVisible({}, [], [{ fieldName: "type", fieldValue: "X" }], "AND")).toBe(
      true,
    );
  });

  it("AND: returns true when all dependent conditions match", () => {
    const formValues = { type: "REPAIR", status: "ACTIVE" };
    const deps = [
      { fieldName: "type", fieldValue: "REPAIR" },
      { fieldName: "status", fieldValue: "ACTIVE" },
    ];
    expect(isDependedAndVisible(formValues, formFields, deps, "AND")).toBe(true);
  });

  it("AND: returns false when one dependent condition does not match", () => {
    const formValues = { type: "REPAIR", status: "INACTIVE" };
    const deps = [
      { fieldName: "type", fieldValue: "REPAIR" },
      { fieldName: "status", fieldValue: "ACTIVE" },
    ];
    expect(isDependedAndVisible(formValues, formFields, deps, "AND")).toBe(false);
  });

  it("OR: returns true when at least one condition matches", () => {
    const formValues = { type: "WARRANTY", status: "ACTIVE" };
    const deps = [
      { fieldName: "type", fieldValue: "REPAIR" },
      { fieldName: "status", fieldValue: "ACTIVE" },
    ];
    expect(isDependedAndVisible(formValues, formFields, deps, "OR")).toBe(true);
  });

  it("OR: returns false when no condition matches", () => {
    const formValues = { type: "WARRANTY", status: "INACTIVE" };
    const deps = [
      { fieldName: "type", fieldValue: "REPAIR" },
      { fieldName: "status", fieldValue: "ACTIVE" },
    ];
    expect(isDependedAndVisible(formValues, formFields, deps, "OR")).toBe(false);
  });

  it('treats "-" as wildcard matching any truthy value', () => {
    const formValues = { type: "ANYTHING" };
    const deps = [{ fieldName: "type", fieldValue: "-" }];
    expect(isDependedAndVisible(formValues, [makeField({ name: "type" })], deps, "AND")).toBe(true);
  });

  it("returns false when dependent field name is not in the fields list", () => {
    const formValues = { type: "REPAIR" };
    const deps = [{ fieldName: "unknown", fieldValue: "REPAIR" }];
    expect(isDependedAndVisible(formValues, formFields, deps, "AND")).toBe(false);
  });
});

describe("isFieldVisible", () => {
  it("returns true for a non-subfield regardless of form values", () => {
    const field = makeField({ name: "f1", isSubField: false });
    expect(isFieldVisible(field, [field], {})).toBe(true);
  });

  it("returns true for a subfield with no dependentFields", () => {
    const field = makeField({ name: "f1", isSubField: true, dependentFields: [] });
    expect(isFieldVisible(field, [field], {})).toBe(true);
  });

  it("returns true when subfield AND conditions are satisfied", () => {
    const parent = makeField({ name: "type" });
    const sub = makeField({
      name: "sub",
      isSubField: true,
      dependentFields: [{ fieldName: "type", fieldValue: "REPAIR" }],
      dependFieldCondition: "AND",
    });
    expect(isFieldVisible(sub, [parent, sub], { type: "REPAIR" })).toBe(true);
  });

  it("returns false when subfield AND conditions are not satisfied", () => {
    const parent = makeField({ name: "type" });
    const sub = makeField({
      name: "sub",
      isSubField: true,
      dependentFields: [{ fieldName: "type", fieldValue: "REPAIR" }],
      dependFieldCondition: "AND",
    });
    expect(isFieldVisible(sub, [parent, sub], { type: "WARRANTY" })).toBe(false);
  });
});

describe("getVisibleFields", () => {
  it("includes all non-subfields", () => {
    const f1 = makeField({ name: "f1", isSubField: false });
    const f2 = makeField({ name: "f2", isSubField: false });
    expect(getVisibleFields([f1, f2], {})).toHaveLength(2);
  });

  it("excludes subfields whose conditions are not met", () => {
    const parent = makeField({ name: "type" });
    const sub = makeField({
      name: "sub",
      isSubField: true,
      dependentFields: [{ fieldName: "type", fieldValue: "REPAIR" }],
      dependFieldCondition: "AND",
    });
    const result = getVisibleFields([parent, sub], { type: "WARRANTY" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("type");
  });

  it("includes subfields whose conditions are met", () => {
    const parent = makeField({ name: "type" });
    const sub = makeField({
      name: "sub",
      isSubField: true,
      dependentFields: [{ fieldName: "type", fieldValue: "REPAIR" }],
      dependFieldCondition: "AND",
    });
    expect(getVisibleFields([parent, sub], { type: "REPAIR" })).toHaveLength(2);
  });
});

describe("mapAreaDependentFields", () => {
  it("returns fields unchanged for a non-subArea", () => {
    const field = makeField({ name: "f1" });
    const area = makeArea([field], { isSubArea: false });
    const result = mapAreaDependentFields(area);
    expect(result).toHaveLength(1);
    expect(result[0].isSubField).toBeUndefined();
  });

  it("marks fields as subfields with area dependentFields for a subArea", () => {
    const field = makeField({ name: "f1" });
    const deps = [{ fieldName: "type", fieldValue: "REPAIR" }];
    const area = makeArea([field], {
      isSubArea: true,
      dependentFields: deps,
      dependFieldCondition: "OR",
    });
    const result = mapAreaDependentFields(area);
    expect(result[0].isSubField).toBe(true);
    expect(result[0].dependentFields).toEqual(deps);
    expect(result[0].dependFieldCondition).toBe("OR");
  });
});

describe("getAllAreasFromSection", () => {
  it("returns all areas from all sections flattened", () => {
    const a1 = makeArea([], { name: "a1" });
    const a2 = makeArea([], { name: "a2" });
    const a3 = makeArea([], { name: "a3" });
    const sections = [makeSection([a1, a2]), makeSection([a3])];
    const result = getAllAreasFromSection(sections);
    expect(result).toHaveLength(3);
    expect(result.map((a) => a.name)).toEqual(["a1", "a2", "a3"]);
  });
});

describe("getAllFieldsFromSection", () => {
  it("returns all fields from all areas of a section", () => {
    const f1 = makeField({ name: "f1" });
    const f2 = makeField({ name: "f2" });
    const f3 = makeField({ name: "f3" });
    const section = makeSection([
      makeArea([f1, f2], { name: "a1", isSubArea: false }),
      makeArea([f3], { name: "a2", isSubArea: false }),
    ]);
    expect(getAllFieldsFromSection(section)).toHaveLength(3);
  });

  it("returns empty array when section has no areas", () => {
    expect(getAllFieldsFromSection(makeSection([]))).toEqual([]);
  });
});

describe("getAllFieldsFromForm", () => {
  it("returns all fields across all sections and areas", () => {
    const f1 = makeField({ name: "f1" });
    const f2 = makeField({ name: "f2" });
    const form: GenericForm = {
      name: "testForm",
      formGroup: "test",
      position: 1,
      actions: null,
      sections: [
        makeSection([makeArea([f1], { isSubArea: false })], { name: "s1" }),
        makeSection([makeArea([f2], { isSubArea: false })], { name: "s2" }),
      ],
    };
    expect(getAllFieldsFromForm(form)).toHaveLength(2);
  });
});

describe("setSectionDisabledState", () => {
  it("sets isDisabled=true on section, all areas, and all fields when passed true", () => {
    const f1 = makeField({ name: "f1", isDisabled: false });
    const section = makeSection([makeArea([f1], { isSubArea: false })]);
    const result = setSectionDisabledState(section, true);
    expect(result.isDisabled).toBe(true);
    expect(result.areas[0].isDisabled).toBe(true);
    expect(result.areas[0].fields[0].isDisabled).toBe(true);
  });

  it("sets isDisabled=false on section, areas, and fields when passed false", () => {
    const f1 = makeField({ name: "f1", isDisabled: true });
    const section = makeSection([makeArea([f1], { isSubArea: false })]);
    const result = setSectionDisabledState(section, false);
    expect(result.isDisabled).toBe(false);
    expect(result.areas[0].fields[0].isDisabled).toBe(false);
  });

  it("infers isDisabled=true when all fields are disabled", () => {
    const section = makeSection([
      makeArea(
        [makeField({ name: "f1", isDisabled: true }), makeField({ name: "f2", isDisabled: true })],
        { isSubArea: false },
      ),
    ]);
    const result = setSectionDisabledState(section);
    expect(result.isDisabled).toBe(true);
    expect(result.areas[0].isDisabled).toBe(true);
  });

  it("infers isDisabled=false when at least one field is enabled", () => {
    const section = makeSection([
      makeArea(
        [makeField({ name: "f1", isDisabled: true }), makeField({ name: "f2", isDisabled: false })],
        { isSubArea: false },
      ),
    ]);
    const result = setSectionDisabledState(section);
    expect(result.isDisabled).toBe(false);
  });
});

describe("toggleSectionFieldsDisabled", () => {
  it("disables only fields belonging to the given section", () => {
    const section = makeSection([
      makeArea([makeField({ name: "f1" }), makeField({ name: "f2" })], { isSubArea: false }),
    ]);
    const allFields = [
      makeField({ name: "f1", isDisabled: false }),
      makeField({ name: "f2", isDisabled: false }),
      makeField({ name: "f3", isDisabled: false }),
    ];
    const result = toggleSectionFieldsDisabled(allFields, section, true);
    expect(result.find((f) => f.name === "f1")?.isDisabled).toBe(true);
    expect(result.find((f) => f.name === "f2")?.isDisabled).toBe(true);
    expect(result.find((f) => f.name === "f3")?.isDisabled).toBe(false);
  });

  it("enables section fields when isDisabled=false", () => {
    const section = makeSection([makeArea([makeField({ name: "f1" })], { isSubArea: false })]);
    const allFields = [makeField({ name: "f1", isDisabled: true })];
    const result = toggleSectionFieldsDisabled(allFields, section, false);
    expect(result[0].isDisabled).toBe(false);
  });
});

describe("mapFieldToFieldMapping", () => {
  it("parses simple field name and single-parent attributeMapping", () => {
    const field = { ...makeField({ name: "jobType", attributeMapping: "job.type" }) };
    const result = mapFieldToFieldMapping(field);
    expect(result.fieldMapping).toEqual({
      originalName: "jobType",
      prefixes: [],
      parentMap: ["job"],
      map: "type",
      nameStartsWith: "",
    });
  });

  it("parses prefixed name (numeric prefix, no # segments)", () => {
    const field = { ...makeField({ name: "0_status", attributeMapping: "job.status" }) };
    const result = mapFieldToFieldMapping(field);
    expect(result.fieldMapping?.originalName).toBe("status");
    expect(result.fieldMapping?.nameStartsWith).toBe("0_");
    expect(result.fieldMapping?.prefixes).toEqual([]);
    expect(result.fieldMapping?.map).toBe("status");
  });

  it("extracts prefix into prefixes array when field name segment contains #", () => {
    const field = {
      ...makeField({ name: "section#0_fieldName", attributeMapping: "section#.fieldName" }),
    };
    const result = mapFieldToFieldMapping(field);
    expect(result.fieldMapping?.prefixes).toEqual(["section#"]);
    expect(result.fieldMapping?.originalName).toBe("fieldName");
  });

  it("parses multi-level attributeMapping into parentMap", () => {
    const field = {
      ...makeField({ name: "value", attributeMapping: "level1.level2.value" }),
    };
    const result = mapFieldToFieldMapping(field);
    expect(result.fieldMapping?.parentMap).toEqual(["level1", "level2"]);
    expect(result.fieldMapping?.map).toBe("value");
  });

  it("handles missing attributeMapping gracefully", () => {
    const field = { ...makeField({ name: "standalone" }) };
    delete field.attributeMapping;
    const result = mapFieldToFieldMapping(field);
    expect(result.fieldMapping?.map).toBeUndefined();
    expect(result.fieldMapping?.parentMap).toEqual([]);
  });
});

describe("getInitialFieldValues", () => {
  it("returns the defaultValue for each field", () => {
    const fields = [
      makeField({ name: "type", defaultValue: "REPAIR" }),
      makeField({ name: "count", defaultValue: 5 }),
      makeField({ name: "active", defaultValue: false }),
    ];
    const result = getInitialFieldValues(fields);
    expect(result.type).toBe("REPAIR");
    expect(result.count).toBe(5);
    expect(result.active).toBe(false);
  });

  it("returns empty string when field has no defaultValue", () => {
    const result = getInitialFieldValues([makeField({ name: "f1" })]);
    expect(result.f1).toBe("");
  });

  it("returns empty string for a null defaultValue", () => {
    const result = getInitialFieldValues([makeField({ name: "f1", defaultValue: null })]);
    expect(result.f1).toBe("");
  });
});

describe("mapValuesToAPI", () => {
  const makeApiField = (name: string, attributeMapping: string): Field =>
    mapFieldToFieldMapping({ ...makeField({ name, attributeMapping }) });

  it("maps flat form values into a nested API structure", () => {
    const result = mapValuesToAPI({ jobType: "REPAIR" }, [makeApiField("jobType", "job.type")]);
    expect(result).toEqual({ job: { type: "REPAIR" } });
  });

  it("maps multiple fields under the same parent object", () => {
    const fields = [makeApiField("jobType", "job.type"), makeApiField("jobStatus", "job.status")];
    const result = mapValuesToAPI({ jobType: "REPAIR", jobStatus: "ACTIVE" }, fields);
    expect(result).toEqual({ job: { type: "REPAIR", status: "ACTIVE" } });
  });

  it("removes empty string values at the top level", () => {
    const result = mapValuesToAPI({ topLevel: "" }, [makeApiField("topLevel", "topLevel")]);
    expect(result).not.toHaveProperty("topLevel");
  });

  it("preserves boolean false values", () => {
    const result = mapValuesToAPI({ active: false }, [makeApiField("active", "job.active")]);
    expect(result.job).toEqual({ active: false });
  });
});

describe("mapValuesFromAPI", () => {
  const makeApiField = (name: string, attributeMapping: string, defaultValue?: string): Field =>
    mapFieldToFieldMapping({ ...makeField({ name, attributeMapping, defaultValue }) });

  it("maps a nested API structure to flat form values", () => {
    const result = mapValuesFromAPI({ job: { type: "REPAIR" } }, [
      makeApiField("jobType", "job.type"),
    ]);
    expect(result.jobType).toBe("REPAIR");
  });

  it("maps multiple fields from the same parent object", () => {
    const fields = [makeApiField("jobType", "job.type"), makeApiField("jobStatus", "job.status")];
    const result = mapValuesFromAPI({ job: { type: "WARRANTY", status: "OPEN" } }, fields);
    expect(result.jobType).toBe("WARRANTY");
    expect(result.jobStatus).toBe("OPEN");
  });

  it("falls back to defaultValue when the API field is missing", () => {
    const result = mapValuesFromAPI({ job: {} }, [makeApiField("jobType", "job.type", "REPAIR")]);
    expect(result.jobType).toBe("REPAIR");
  });

  it("returns empty string when field is missing and has no defaultValue", () => {
    const result = mapValuesFromAPI({ job: {} }, [makeApiField("jobType", "job.type")]);
    expect(result.jobType).toBe("");
  });
});

describe("convertAPIDataToFormValues", () => {
  it("converts API data to form values using field mappings", () => {
    const field = mapFieldToFieldMapping({
      ...makeField({ name: "status", attributeMapping: "job.status" }),
    });
    const result = convertAPIDataToFormValues({ job: { status: "ACTIVE" } }, [field]);
    expect(result.status).toBe("ACTIVE");
  });
});

describe("havePositionDropdownOptionsChanged", () => {
  const makePositionField = (options: GenericOptionProps[]): Field =>
    makeField({ name: "pos", subtype: "diagnosticPosition", options });

  it("returns false when the same field array reference is compared to itself", () => {
    const fields = [makePositionField([{ value: "LA", name: "LA" }])];
    expect(havePositionDropdownOptionsChanged(fields, fields)).toBe(false);
  });

  it("returns true when a disabled flag is added to an option", () => {
    const old = [makePositionField([{ value: "LA", name: "LA" }])];
    const updated = [makePositionField([{ value: "LA", name: "LA", disabled: true }])];
    expect(havePositionDropdownOptionsChanged(old, updated)).toBe(true);
  });

  it("returns true when option count changes", () => {
    const old = [makePositionField([{ value: "LA", name: "LA" }])];
    const updated = [
      makePositionField([
        { value: "LA", name: "LA" },
        { value: "SP", name: "SP" },
      ]),
    ];
    expect(havePositionDropdownOptionsChanged(old, updated)).toBe(true);
  });

  it("returns false for non-position fields even when options differ", () => {
    const old = [makeField({ name: "other", options: [{ value: "A", name: "A" }] })];
    const updated = [makeField({ name: "other", options: [{ value: "B", name: "B" }] })];
    expect(havePositionDropdownOptionsChanged(old, updated)).toBe(false);
  });

  it("returns true when options change from undefined to a defined array", () => {
    const old = [makePositionField(undefined as unknown as GenericOptionProps[])];
    const updated = [makePositionField([{ value: "LA", name: "LA" }])];
    expect(havePositionDropdownOptionsChanged(old, updated)).toBe(true);
  });
});

describe("haveFieldDisabledStatesChanged", () => {
  it("returns false when all isDisabled states are identical", () => {
    const fields = [
      makeField({ name: "f1", isDisabled: true }),
      makeField({ name: "f2", isDisabled: false }),
    ];
    expect(haveFieldDisabledStatesChanged(fields, [...fields])).toBe(false);
  });

  it("returns true when a field's isDisabled changes from false to true", () => {
    const old = [makeField({ name: "f1", isDisabled: false })];
    const updated = [makeField({ name: "f1", isDisabled: true })];
    expect(haveFieldDisabledStatesChanged(old, updated)).toBe(true);
  });

  it("returns true when a field's isDisabled changes from true to false", () => {
    const old = [makeField({ name: "f1", isDisabled: true })];
    const updated = [makeField({ name: "f1", isDisabled: false })];
    expect(haveFieldDisabledStatesChanged(old, updated)).toBe(true);
  });

  it("returns false for empty arrays", () => {
    expect(haveFieldDisabledStatesChanged([], [])).toBe(false);
  });
});

// ── Lookup helpers ───────────────────────────────────────────────────────────

describe("getAreasByName", () => {
  it("returns areas matching the given name across all sections", () => {
    const field = makeField({ name: "f1" });
    const area1 = makeArea([field], { name: "target" });
    const area2 = makeArea([field], { name: "other" });
    const sections = [
      makeSection([area1, area2]),
      makeSection([makeArea([field], { name: "target" })]),
    ];
    const result = getAreasByName(sections, "target");
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.name === "target")).toBe(true);
  });

  it("returns empty array when no areas match", () => {
    const sections = [makeSection([makeArea([makeField({ name: "f1" })], { name: "other" })])];
    expect(getAreasByName(sections, "missing")).toHaveLength(0);
  });
});

describe("getAreasBySectionName", () => {
  it("returns areas of the matching section", () => {
    const area1 = makeArea([makeField({ name: "f1" })], { name: "a1" });
    const area2 = makeArea([makeField({ name: "f2" })], { name: "a2" });
    const sections = [
      makeSection([area1, area2], { name: "sectionA" }),
      makeSection([makeArea([makeField({ name: "f3" })])], { name: "sectionB" }),
    ];
    const result = getAreasBySectionName(sections, "sectionA");
    expect(result).toHaveLength(2);
  });

  it("returns empty array when section not found", () => {
    expect(getAreasBySectionName([], "missing")).toHaveLength(0);
  });
});

describe("getFieldsBySectionName", () => {
  it("returns all fields from the matching section", () => {
    const f1 = makeField({ name: "f1" });
    const f2 = makeField({ name: "f2" });
    const sections = [
      makeSection([makeArea([f1, f2])], { name: "sec1" }),
      makeSection([makeArea([makeField({ name: "f3" })])], { name: "sec2" }),
    ];
    const result = getFieldsBySectionName(sections, "sec1");
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.name)).toContain("f1");
    expect(result.map((f) => f.name)).toContain("f2");
  });

  it("returns empty array when section not found", () => {
    expect(getFieldsBySectionName([], "missing")).toHaveLength(0);
  });
});

describe("getFieldsByAreaName", () => {
  it("returns all fields from areas matching the given name", () => {
    const f1 = makeField({ name: "f1" });
    const f2 = makeField({ name: "f2" });
    const sections = [
      makeSection([makeArea([f1], { name: "myArea" }), makeArea([f2], { name: "otherArea" })]),
    ];
    const result = getFieldsByAreaName(sections, "myArea");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("f1");
  });

  it("returns empty array when area not found", () => {
    expect(getFieldsByAreaName([], "missing")).toHaveLength(0);
  });
});

describe("getFieldsBySectionAndAreaName", () => {
  it("returns fields from the specific section + area combination", () => {
    const f1 = makeField({ name: "f1" });
    const f2 = makeField({ name: "f2" });
    const sections = [
      makeSection([makeArea([f1], { name: "areaA" }), makeArea([f2], { name: "areaB" })], {
        name: "sectionX",
      }),
    ];
    const result = getFieldsBySectionAndAreaName(sections, "sectionX", "areaA");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("f1");
  });

  it("returns empty array when section does not exist", () => {
    expect(getFieldsBySectionAndAreaName([], "missing", "area")).toHaveLength(0);
  });

  it("returns empty array when area name does not match", () => {
    const sections = [
      makeSection([makeArea([makeField({ name: "f1" })], { name: "areaA" })], { name: "sec1" }),
    ];
    expect(getFieldsBySectionAndAreaName(sections, "sec1", "wrongArea")).toHaveLength(0);
  });
});
