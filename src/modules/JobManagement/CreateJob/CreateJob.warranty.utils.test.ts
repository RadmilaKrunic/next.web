import { describe, it, expect } from "vitest";
import Field from "../../../components/generics/Field/GenericField.types";
import Section from "../../../components/generics/Section/GenericSection.types";
import Area from "../../../components/generics/Area/GenericArea.types";
import { WarrantyCheckResponse } from "../../../api/services/orders/orders.types";
import {
  WARRANTY_AREA_NAME_REGEX,
  getSectionScopedFieldName,
  normalizePurchaseDate,
  buildWarrantyCheckPayload,
  buildWarrantyCheckPayloadFromFieldNames,
  getAllowedWarrantyTypes,
  updateWarrantyFields,
  updateWarrantySections,
} from "./CreateJob.warranty.utils";

const buildField = (overrides: Partial<Field> = {}): Field => ({
  name: "field",
  label: "Field",
  type: "text",
  ...overrides,
});

const buildArea = (overrides: Partial<Area> = {}): Area => ({
  name: "area",
  label: "Area",
  position: 0,
  fields: [],
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: false,
  ...overrides,
});

const buildSection = (overrides: Partial<Section> = {}): Section => ({
  name: "assetData#0",
  isHidden: false,
  label: "Section",
  dependFieldCondition: "AND",
  position: 0,
  areas: [],
  actions: null,
  isSubSection: false,
  isAccordion: false,
  isTab: false,
  ...overrides,
});

describe("getSectionScopedFieldName", () => {
  it("builds a scoped field name", () => {
    expect(getSectionScopedFieldName(0, "asset", "brand")).toBe("assetData#0_asset_brand");
    expect(getSectionScopedFieldName(2, "assetData", "purchaseDate")).toBe(
      "assetData#2_assetData_purchaseDate",
    );
  });
});

describe("buildWarrantyCheckPayload", () => {
  const values = {
    "assetData#0_asset_brand": "Bosch",
    "assetData#0_asset_baretoolNumber": "BT123",
    "assetData#0_asset_serialNumber": "SN123",
    "assetData#0_asset_purchaseDate": "2024-05-10",
  };

  it("returns payload when all fields present", () => {
    expect(buildWarrantyCheckPayload(values, 0, "US")).toEqual({
      brand: "Bosch",
      country: "US",
      bareToolNumber: "BT123",
      serialNumber: "SN123",
      purchaseDate: "2024-05-10",
    });
  });

  it("normalizes ISO date strings to yyyy-mm-dd", () => {
    const result = buildWarrantyCheckPayload(
      { ...values, "assetData#0_asset_purchaseDate": "2024-05-10T12:00:00.000Z" },
      0,
      "US",
    );
    expect(result?.purchaseDate).toBe("2024-05-10");
  });

  it("returns null when purchase date is invalid", () => {
    const result = buildWarrantyCheckPayload(
      { ...values, "assetData#0_asset_purchaseDate": "not-a-date" },
      0,
      "US",
    );
    expect(result).toBeNull();
  });

  it("returns null when purchase date is not a string", () => {
    const result = buildWarrantyCheckPayload(
      { ...values, "assetData#0_asset_purchaseDate": 12345 },
      0,
      "US",
    );
    expect(result).toBeNull();
  });

  it("returns null when brand is missing", () => {
    const result = buildWarrantyCheckPayload({ ...values, "assetData#0_asset_brand": "" }, 0, "US");
    expect(result).toBeNull();
  });

  it("returns null when countryCode is missing", () => {
    expect(buildWarrantyCheckPayload(values, 0)).toBeNull();
  });

  it("uses the correct section index when scoping field names", () => {
    const scopedValues = {
      "assetData#3_asset_brand": "Bosch",
      "assetData#3_asset_baretoolNumber": "BT123",
      "assetData#3_asset_serialNumber": "SN123",
      "assetData#3_asset_purchaseDate": "2024-05-10",
    };
    expect(buildWarrantyCheckPayload(scopedValues, 3, "US")).not.toBeNull();
    expect(buildWarrantyCheckPayload(scopedValues, 0, "US")).toBeNull();
  });

  it("builds payload from explicit field names", () => {
    const values = {
      brand: "Bosch",
      bareTool: "BT-1",
      serial: "SN-1",
      purchaseDateValue: "2024-06-01",
    };

    const result = buildWarrantyCheckPayloadFromFieldNames(
      values,
      {
        brandFieldName: "brand",
        bareToolNumberFieldName: "bareTool",
        serialNumberFieldName: "serial",
        purchaseDateFieldName: "purchaseDateValue",
      },
      "US",
    );

    expect(result).toEqual({
      brand: "Bosch",
      country: "US",
      bareToolNumber: "BT-1",
      serialNumber: "SN-1",
      purchaseDate: "2024-06-01",
    });
  });

  it("returns null from explicit field names when a required field is missing", () => {
    const values = {
      brand: "Bosch",
      bareTool: "",
      serial: "SN-1",
      purchaseDateValue: "2024-06-01",
    };

    const result = buildWarrantyCheckPayloadFromFieldNames(
      values,
      {
        brandFieldName: "brand",
        bareToolNumberFieldName: "bareTool",
        serialNumberFieldName: "serial",
        purchaseDateFieldName: "purchaseDateValue",
      },
      "US",
    );

    expect(result).toBeNull();
  });
});

describe("getAllowedWarrantyTypes", () => {
  it("adds supportedWarrantyType to the set", () => {
    const result = getAllowedWarrantyTypes({
      supportedWarrantyType: "STANDARD_WARRANTY",
    } as WarrantyCheckResponse);
    expect(result.has("STANDARD_WARRANTY")).toBe(true);
  });

  it("adds BOSCH_PRO_SERVICE when supportedWarrantyType is BOSCH_PRO_SERVICE", () => {
    const result = getAllowedWarrantyTypes({
      supportedWarrantyType: "BOSCH_PRO_SERVICE",
    } as WarrantyCheckResponse);
    expect(result.has("BOSCH_PRO_SERVICE")).toBe(true);
    expect(result.size).toBe(1);
  });

  it("adds BOSCH_PRO_SERVICE when proServiceType is non-empty", () => {
    const result = getAllowedWarrantyTypes({
      supportedWarrantyType: "STANDARD_WARRANTY",
      proServiceType: "TYPE_A",
    } as WarrantyCheckResponse);
    expect(result.has("STANDARD_WARRANTY")).toBe(true);
    expect(result.has("BOSCH_PRO_SERVICE")).toBe(true);
  });

  it("does not add BOSCH_PRO_SERVICE when proServiceType is blank", () => {
    const result = getAllowedWarrantyTypes({
      supportedWarrantyType: "STANDARD_WARRANTY",
      proServiceType: "   ",
    } as WarrantyCheckResponse);
    expect(result.has("BOSCH_PRO_SERVICE")).toBe(false);
  });

  it("returns empty set when no supportedWarrantyType or proServiceType", () => {
    const result = getAllowedWarrantyTypes({} as WarrantyCheckResponse);
    expect(result.size).toBe(0);
  });
});

describe("updateWarrantySections", () => {
  const evaluationStatus = "ELIGIBLE" as WarrantyCheckResponse["evaluationStatus"];

  it("leaves sections unrelated to targetSectionName unchanged", () => {
    const sections = [buildSection({ name: "assetData#1" })];
    const result = updateWarrantySections(
      sections,
      0,
      { evaluationStatus } as WarrantyCheckResponse,
      null,
    );
    expect(result[0]).toBe(sections[0]);
  });

  it("updates customerWish radio options - disables WARRANTY when INELIGIBLE", () => {
    const customerWishField = buildField({
      name: "customerWish",
      fieldMapping: { originalName: "customerWish" },
      radioButtons: [
        { label: "warranty", value: "WARRANTY" },
        { label: "chargeable", value: "CHARGEABLE" },
      ],
    });
    const sections = [
      buildSection({
        name: "assetData#0",
        areas: [
          buildArea({
            name: "assetData#0_customerWish",
            fields: [customerWishField],
          }),
        ],
      }),
    ];

    const result = updateWarrantySections(
      sections,
      0,
      { evaluationStatus: "INELIGIBLE" } as WarrantyCheckResponse,
      { fallbackMessage: "blocked" },
    );

    const updatedField = result[0].areas[0].fields[0];
    const warrantyOption = updatedField.radioButtons?.find((o) => o.value === "WARRANTY");
    expect(warrantyOption?.disabled).toBe(true);
    expect(warrantyOption?.infoPayload).toEqual({ fallbackMessage: "blocked" });

    const chargeableOption = updatedField.radioButtons?.find((o) => o.value === "CHARGEABLE");
    expect(chargeableOption?.infoText).toBeUndefined();
  });

  it("uses default customerWish options when field has none", () => {
    const customerWishField = buildField({
      name: "customerWish",
      fieldMapping: { originalName: "customerWish" },
    });
    const sections = [
      buildSection({
        areas: [buildArea({ name: "assetData#0_customerWish", fields: [customerWishField] })],
      }),
    ];

    const result = updateWarrantySections(
      sections,
      0,
      { evaluationStatus: "ELIGIBLE" } as WarrantyCheckResponse,
      null,
    );
    const updatedField = result[0].areas[0].fields[0];
    expect(updatedField.radioButtons?.length).toBe(2);
  });

  it("uses fallback infoPayload when warrantyInfoPayload is null and INELIGIBLE", () => {
    const customerWishField = buildField({
      name: "customerWish",
      fieldMapping: { originalName: "customerWish" },
      radioButtons: [{ label: "warranty", value: "WARRANTY" }],
    });
    const sections = [
      buildSection({
        areas: [buildArea({ name: "assetData#0_customerWish", fields: [customerWishField] })],
      }),
    ];

    const result = updateWarrantySections(
      sections,
      0,
      { evaluationStatus: "INELIGIBLE" } as WarrantyCheckResponse,
      null,
    );
    const warrantyOption = result[0].areas[0].fields[0].radioButtons?.[0];
    expect(warrantyOption?.infoPayload).toEqual({
      fallbackMessage: "Warranty customer wish is blocked for this tool.",
    });
  });

  it("updates warrantyType field options - SKIPPED enables all options", () => {
    const warrantyTypeField = buildField({
      name: "warrantyType",
      fieldMapping: { originalName: "warrantyType" },
      options: [{ name: "STANDARD_WARRANTY", value: "STANDARD_WARRANTY" }],
    });
    const sections = [
      buildSection({
        areas: [buildArea({ name: "assetData#0_warrantyDetails", fields: [warrantyTypeField] })],
      }),
    ];

    const result = updateWarrantySections(
      sections,
      0,
      { evaluationStatus: "SKIPPED" } as WarrantyCheckResponse,
      null,
    );
    const updatedField = result[0].areas[0].fields[0];
    expect(updatedField.isDisabled).toBe(false);
    expect(updatedField.options?.[0].disabled).toBeUndefined();
  });

  it("updates warrantyType field - INELIGIBLE disables the whole field", () => {
    const warrantyTypeField = buildField({
      name: "warrantyType",
      fieldMapping: { originalName: "warrantyType" },
    });
    const sections = [
      buildSection({
        areas: [buildArea({ name: "assetData#0_warrantyDetails", fields: [warrantyTypeField] })],
      }),
    ];

    const result = updateWarrantySections(
      sections,
      0,
      { evaluationStatus: "INELIGIBLE" } as WarrantyCheckResponse,
      null,
    );
    const updatedField = result[0].areas[0].fields[0];
    expect(updatedField.isDisabled).toBe(true);
    expect(updatedField.options?.length).toBeGreaterThan(0);
  });

  it("updates warrantyType field - ELIGIBLE disables options not in allowedWarrantyTypes", () => {
    const warrantyTypeField = buildField({
      name: "warrantyType",
      fieldMapping: { originalName: "warrantyType" },
      options: [
        { name: "STANDARD_WARRANTY", value: "STANDARD_WARRANTY" },
        { name: "EXTENDED_WARRANTY", value: "EXTENDED_WARRANTY" },
      ],
    });
    const sections = [
      buildSection({
        areas: [buildArea({ name: "assetData#0_warrantyDetails", fields: [warrantyTypeField] })],
      }),
    ];

    const result = updateWarrantySections(
      sections,
      0,
      {
        evaluationStatus: "ELIGIBLE",
        supportedWarrantyType: "STANDARD_WARRANTY",
      } as WarrantyCheckResponse,
      null,
    );
    const updatedField = result[0].areas[0].fields[0];
    expect(updatedField.options?.find((o) => o.value === "STANDARD_WARRANTY")?.disabled).toBe(
      false,
    );
    expect(updatedField.options?.find((o) => o.value === "EXTENDED_WARRANTY")?.disabled).toBe(true);
  });

  it("does not change fields in an area that is not customerWish or warrantyDetails", () => {
    const otherField = buildField({ name: "other" });
    const sections = [
      buildSection({
        areas: [buildArea({ name: "assetData#0_other", fields: [otherField] })],
      }),
    ];

    const result = updateWarrantySections(
      sections,
      0,
      { evaluationStatus: "ELIGIBLE" } as WarrantyCheckResponse,
      null,
    );
    expect(result[0].areas[0].fields[0]).toBe(otherField);
  });

  it("leaves non-matching fields inside customerWish/warrantyDetails areas unchanged", () => {
    const otherField = buildField({ name: "unrelated" });
    const sections = [
      buildSection({
        areas: [buildArea({ name: "assetData#0_customerWish", fields: [otherField] })],
      }),
    ];

    const result = updateWarrantySections(
      sections,
      0,
      { evaluationStatus: "ELIGIBLE" } as WarrantyCheckResponse,
      null,
    );
    expect(result[0].areas[0].fields[0]).toBe(otherField);
  });
});

describe("updateWarrantyFields", () => {
  it("returns null when fields is null", () => {
    const result = updateWarrantyFields(null, { evaluationStatus: "ELIGIBLE" } as never, null);
    expect(result).toBeNull();
  });

  it("updates customerWish and warrantyType field visibility/disabled state", () => {
    const fields = [
      buildField({
        name: "customerWish",
        fieldMapping: { originalName: "customerWish" },
        radioButtons: [
          { label: "warranty", value: "WARRANTY" },
          { label: "chargeable", value: "CHARGEABLE" },
        ],
      }),
      buildField({
        name: "warrantyType",
        fieldMapping: { originalName: "warrantyType" },
        options: [
          { name: "STANDARD_WARRANTY", value: "STANDARD_WARRANTY" },
          { name: "EXTENDED_WARRANTY", value: "EXTENDED_WARRANTY" },
        ],
      }),
    ];

    const result = updateWarrantyFields(
      fields,
      {
        evaluationStatus: "INELIGIBLE",
        supportedWarrantyType: "STANDARD_WARRANTY",
      } as never,
      { fallbackMessage: "blocked" },
    );

    const updatedCustomerWish = result?.[0];
    const warrantyOption = updatedCustomerWish?.radioButtons?.find((o) => o.value === "WARRANTY");
    expect(warrantyOption?.disabled).toBe(true);

    const updatedWarrantyType = result?.[1];
    expect(updatedWarrantyType?.isDisabled).toBe(true);
  });

  it("passes unrelated fields (not customerWish or warrantyType) through unchanged", () => {
    const unrelatedField = buildField({
      name: "unrelated",
      fieldMapping: { originalName: "unrelated" },
    });

    const result = updateWarrantyFields(
      [unrelatedField],
      { evaluationStatus: "ELIGIBLE" } as never,
      null,
    );

    expect(result?.[0]).toBe(unrelatedField);
  });

  it("enables all warrantyType options when ELIGIBLE and supportedWarrantyType matches", () => {
    const fields = [
      buildField({
        name: "warrantyType",
        fieldMapping: { originalName: "warrantyType" },
        options: [
          { name: "STANDARD_WARRANTY", value: "STANDARD_WARRANTY" },
          { name: "EXTENDED_WARRANTY", value: "EXTENDED_WARRANTY" },
        ],
      }),
    ];

    const result = updateWarrantyFields(
      fields,
      {
        evaluationStatus: "ELIGIBLE",
        supportedWarrantyType: "STANDARD_WARRANTY",
      } as never,
      null,
    );

    const standardOption = result?.[0].options?.find((o) => o.value === "STANDARD_WARRANTY");
    const extendedOption = result?.[0].options?.find((o) => o.value === "EXTENDED_WARRANTY");
    expect(standardOption?.disabled).toBe(false);
    expect(extendedOption?.disabled).toBe(true);
  });
});

describe("WARRANTY_AREA_NAME_REGEX", () => {
  it("matches assetData#N_asset area names", () => {
    expect(WARRANTY_AREA_NAME_REGEX.test("assetData#0_asset")).toBe(true);
    expect(WARRANTY_AREA_NAME_REGEX.test("assetData#3_asset")).toBe(true);
    expect(WARRANTY_AREA_NAME_REGEX.test("assetData#10_asset")).toBe(true);
  });

  it("matches assetData#N_assetData area names", () => {
    expect(WARRANTY_AREA_NAME_REGEX.test("assetData#0_assetData")).toBe(true);
    expect(WARRANTY_AREA_NAME_REGEX.test("assetData#2_assetData")).toBe(true);
  });

  it("does not match unrelated area names", () => {
    expect(WARRANTY_AREA_NAME_REGEX.test("customerWish")).toBe(false);
    expect(WARRANTY_AREA_NAME_REGEX.test("assetData#0_otherArea")).toBe(false);
    expect(WARRANTY_AREA_NAME_REGEX.test("assetData_asset")).toBe(false);
  });

  it("extracts the section index from the match", () => {
    const match = WARRANTY_AREA_NAME_REGEX.exec("assetData#5_asset");
    expect(match?.[1]).toBe("5");
  });
});

describe("normalizePurchaseDate", () => {
  it("returns already-normalized date unchanged", () => {
    expect(normalizePurchaseDate("2024-05-10")).toBe("2024-05-10");
  });

  it("converts ISO datetime string to yyyy-mm-dd", () => {
    const result = normalizePurchaseDate("2024-05-10T12:00:00.000Z");
    expect(result).toMatch(/^2024-05-\d{2}$/);
  });

  it("returns empty string for invalid date string", () => {
    expect(normalizePurchaseDate("not-a-date")).toBe("");
  });

  it("returns empty string for non-string values", () => {
    expect(normalizePurchaseDate(12345)).toBe("");
    expect(normalizePurchaseDate(null)).toBe("");
    expect(normalizePurchaseDate(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(normalizePurchaseDate("")).toBe("");
  });
});

describe("buildWarrantyCheckPayloadFromFieldNames - additional branches", () => {
  it("returns null when purchaseDate is an invalid date string", () => {
    const result = buildWarrantyCheckPayloadFromFieldNames(
      {
        brand: "Bosch",
        bareTool: "BT-1",
        serial: "SN-1",
        purchaseDateValue: "not-a-date",
      },
      {
        brandFieldName: "brand",
        bareToolNumberFieldName: "bareTool",
        serialNumberFieldName: "serial",
        purchaseDateFieldName: "purchaseDateValue",
      },
      "US",
    );
    expect(result).toBeNull();
  });

  it("returns null when serialNumber is missing", () => {
    const result = buildWarrantyCheckPayloadFromFieldNames(
      {
        brand: "Bosch",
        bareTool: "BT-1",
        serial: "",
        purchaseDateValue: "2024-06-01",
      },
      {
        brandFieldName: "brand",
        bareToolNumberFieldName: "bareTool",
        serialNumberFieldName: "serial",
        purchaseDateFieldName: "purchaseDateValue",
      },
      "US",
    );
    expect(result).toBeNull();
  });
});
