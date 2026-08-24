import { describe, it, expect, vi } from "vitest";
import {
  resolveValue,
  mapDropdownOptions,
  formatDropdownOptions,
  getDropdownValue,
  translateStaticOptions,
  validateRequiredParams,
  findRawOption,
  resolveQueryParams,
} from "./DynamicDropdown.helper";

// Mock i18next to control language
vi.mock("i18next", () => ({
  default: { language: "en-US" },
}));

import type { TFunction } from "i18next";

const mockT = ((key: string) => key) as unknown as TFunction<"translation", "app">;

describe("resolveValue", () => {
  it("returns languageCode from i18n for 'languageCode' path", () => {
    const result = resolveValue("languageCode", undefined, "DE");
    expect(result).toBe("en");
  });

  it("returns empty string when jobData is undefined", () => {
    expect(resolveValue("some.path", undefined, "DE")).toBe("");
  });

  it("resolves nested path from jobData", () => {
    const jobData = { asset: { baretoolNumber: "BT-001" } };
    expect(resolveValue("asset.baretoolNumber", jobData, "DE")).toBe("BT-001");
  });

  it("returns countryCode fallback for path containing 'countryCode' when key missing", () => {
    const jobData = { someField: "value" };
    expect(resolveValue("asset.countryCode", jobData, "DE")).toBe("DE");
  });

  it("returns countryCode fallback for path containing 'countryCode' when resolved value is empty string", () => {
    const jobData = { asset: { countryCode: "" } };
    expect(resolveValue("asset.countryCode", jobData, "DE")).toBe("DE");
  });

  it("falls back to 'tr' when countryCode arg is not provided and path is missing", () => {
    const jobData = { someField: "value" };
    expect(resolveValue("asset.countryCode", jobData, "")).toBe("tr");
  });

  it("returns path value when non-string (e.g. number)", () => {
    expect(resolveValue(42, undefined, "DE")).toBe(42);
  });

  it("returns empty string for missing nested key", () => {
    const jobData = { asset: {} };
    expect(resolveValue("asset.missing", jobData, "DE")).toBe("");
  });
});

describe("mapDropdownOptions", () => {
  it("returns empty array for null/undefined apiResponse", () => {
    expect(mapDropdownOptions("field", undefined, null as any, mockT)).toEqual([]);
  });

  it("returns empty array for non-array apiResponse", () => {
    expect(mapDropdownOptions("field", undefined, {} as any, mockT)).toEqual([]);
  });

  it("maps generic options using name or code", () => {
    const result = mapDropdownOptions(
      "field",
      undefined,
      [{ name: "Option A", code: "OA" }, { code: "OB" }],
      mockT,
    );
    expect(result[0].value).toBe("Option A");
    expect(result[1].value).toBe("OB");
  });

  it("maps an array of plain strings", () => {
    const result = mapDropdownOptions("field", undefined, ["Option1", "Option2"], mockT);
    expect(result).toEqual([
      { value: "Option1", name: "Option1", key: "field-Option1" },
      { value: "Option2", name: "Option2", key: "field-Option2" },
    ]);
  });

  it("maps diagnosticFaultCode subtype using faultCode field", () => {
    const result = mapDropdownOptions(
      "faultCode",
      "diagnosticFaultCode",
      [{ faultCode: "E001", faultCodeDescription: "Short circuit", faultCodeLabourQuantity: 1 }],
      mockT,
    );
    expect(result[0].value).toBe("E001");
    expect(result[0].name).toBe("E001 - Short circuit");
  });

  it("maps accessoryDropdown subtype using item.name", () => {
    const result = mapDropdownOptions("acc", "accessoryDropdown", [{ name: "accessoryA" }], mockT);
    expect(result[0].value).toBe("accessoryA");
  });

  it("maps ascName field using item.ascId as value", () => {
    const result = mapDropdownOptions(
      "ascName",
      undefined,
      [{ ascId: "A1", name: "ASC One" }, { name: "No Id" }],
      mockT,
    );
    expect(result[0]).toEqual({ value: "A1", name: "ASC One", key: "ascName-A1" });
    // falls back to index in key when ascId missing
    expect(result[1]).toEqual({ value: "", name: "No Id", key: "ascName-1" });
  });

  it("maps ascDetails field using item.ascId as value", () => {
    const result = mapDropdownOptions(
      "ascDetails",
      undefined,
      [{ ascId: "A2", name: "ASC Two" }],
      mockT,
    );
    expect(result[0]).toEqual({ value: "A2", name: "ASC Two", key: "ascDetails-A2" });
  });

  it("maps accountRoles, filtering out restricted roles and translating names", () => {
    const t = ((key: string) => `translated-${key}`) as unknown as TFunction<"translation", "app">;
    const apiResponse = [
      { roleId: "APPLICATION_ADMINISTRATOR", name: "Admin", id: "1" },
      { roleId: "COUNTRY_MANAGER", name: "Country Manager", id: "2" },
      { roleId: "BOSCH_REGIONAL_MANAGER", name: "Regional Manager", id: "3" },
      { roleId: "TECHNICIAN", name: "Field Technician", id: "4" },
    ];
    const result = mapDropdownOptions("accountRoles", undefined, apiResponse, t);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      value: "TECHNICIAN",
      name: "translated-fieldtechnician",
      key: "4",
    });
  });

  describe("categoryId field", () => {
    it("returns empty array when response.categories is missing", () => {
      const result = mapDropdownOptions("categoryId", undefined, {} as any, mockT);
      expect(result).toEqual([]);
    });

    it("uses translated name, falling back to raw key when translation is untranslated ('app.' prefix)", () => {
      const t = ((key: string) =>
        key === "raw.key.two" ? "app.category.two" : `translated-${key}`) as unknown as TFunction<
        "translation",
        "app"
      >;
      const response = {
        categories: {
          "1": "raw.key.one",
          "2": "raw.key.two",
        },
      };
      const result = mapDropdownOptions("categoryId", undefined, response as any, t);
      expect(result).toEqual([
        { value: "1", name: "translated-raw.key.one", key: "1" },
        { value: "2", name: "raw.key.two", key: "2" },
      ]);
    });
  });
});

describe("formatDropdownOptions", () => {
  it("returns placeholder when options list is empty", () => {
    const result = formatDropdownOptions("field", [], "Select...");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Select...");
    expect(result[0].value).toBe("");
  });

  it("prepends select option when not already present", () => {
    const options = [{ value: "A", name: "Option A", key: "k1" }];
    const result = formatDropdownOptions("field", options, "Select...");
    expect(result[0].name).toBe("Select...");
    expect(result).toHaveLength(2);
  });

  it("does not duplicate select option when already present", () => {
    const options = [
      { value: "", name: "Select...", key: "k0" },
      { value: "A", name: "Option A", key: "k1" },
    ];
    const result = formatDropdownOptions("field", options, "Select...");
    expect(result.filter((o) => o.name === "Select...")).toHaveLength(1);
  });

  it("assigns key to empty-value option if missing", () => {
    const options = [{ value: "", name: "Select..." }];
    const result = formatDropdownOptions("field", options, "Select...");
    expect(result[0].key).toBeDefined();
    expect(result[0].key).toBe("field-empty-0");
  });

  it("assigns key to non-empty-value option if missing", () => {
    const options = [{ value: "A", name: "Option A" }];
    const result = formatDropdownOptions("field", options, "Select...");
    // index 1 because select option gets prepended at index 0
    const optionA = result.find((o) => o.value === "A");
    expect(optionA?.key).toBe("field-A-1");
  });

  it("preserves the disabled flag on options", () => {
    const options = [{ value: "A", name: "Option A", key: "k1", disabled: true }];
    const result = formatDropdownOptions("field", options, "Select...");
    expect(result.find((o) => o.value === "A")?.disabled).toBe(true);
  });
});

describe("getDropdownValue", () => {
  it("returns matching value string for diagnosticFaultCode subtype", () => {
    const opts = [{ value: "E001", name: "E001 - Short" }];
    expect(getDropdownValue("field", "diagnosticFaultCode", opts, "E001")).toBe("E001");
  });

  it("returns empty string when fault code not found", () => {
    expect(getDropdownValue("field", "diagnosticFaultCode", [], "E001")).toBe("");
  });

  it("returns stringified value for non-faultCode subtype", () => {
    expect(getDropdownValue("field", undefined, [], "REPAIR")).toBe("REPAIR");
  });

  it("returns empty string when value is falsy", () => {
    expect(getDropdownValue("field", undefined, [], undefined)).toBe("");
  });
});

describe("translateStaticOptions", () => {
  it("returns empty array when opts is falsy", () => {
    expect(translateStaticOptions("field", undefined as any, mockT)).toEqual([]);
  });

  it("prepends a translated 'SelectAnOption' placeholder by default", () => {
    const opts = [{ value: "A", name: "optionA" }];
    const result = translateStaticOptions("someDropdown", opts, mockT);
    expect(result[0]).toMatchObject({ value: "", name: "SelectAnOption" });
    expect(result).toHaveLength(2);
  });

  it("does not prepend a placeholder for reimbursementMethod dropdowns", () => {
    const opts = [{ value: "A", name: "optionA" }];
    const result = translateStaticOptions("reimbursementMethod", opts, mockT);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("A");
  });

  it("does not prepend a placeholder for reimbursementCreateOn dropdowns", () => {
    const opts = [{ value: "A", name: "optionA" }];
    const result = translateStaticOptions("reimbursementCreateOn", opts, mockT);
    expect(result).toHaveLength(1);
  });

  it("does not prepend a placeholder for reimbursementPeriodType dropdowns", () => {
    const opts = [{ value: "A", name: "optionA" }];
    const result = translateStaticOptions("reimbursementPeriodType", opts, mockT);
    expect(result).toHaveLength(1);
  });

  it("does not add a duplicate placeholder when caller already provided one", () => {
    const opts = [
      { value: "", name: "" },
      { value: "A", name: "optionA" },
    ];
    const result = translateStaticOptions("someDropdown", opts, mockT);
    expect(result).toHaveLength(2);
  });

  it("translates each option's name via t()", () => {
    const t = ((key: string) => `translated-${key}`) as unknown as TFunction;
    const opts = [{ value: "A", name: "optionA" }];
    const result = translateStaticOptions("someDropdown", opts, t);
    const optionA = result.find((o) => o.value === "A");
    expect(optionA?.name).toBe("translated-optionA");
  });

  it("keeps an empty name untranslated", () => {
    const opts = [{ value: "A", name: "" }];
    const result = translateStaticOptions("reimbursementMethod", opts, mockT);
    expect(result[0].name).toBe("");
  });

  it("generates a key for empty-value option when missing", () => {
    const opts = [{ value: "A", name: "optionA" }];
    const result = translateStaticOptions("someDropdown", opts, mockT);
    expect(result[0].key).toBe("someDropdown-empty-0");
  });

  it("generates a key for non-empty-value option when missing", () => {
    const opts = [{ value: "A", name: "optionA" }];
    const result = translateStaticOptions("reimbursementMethod", opts, mockT);
    expect(result[0].key).toBe("reimbursementMethod-A");
  });

  it("preserves an existing key when provided", () => {
    const opts = [{ value: "A", name: "optionA", key: "custom-key" }];
    const result = translateStaticOptions("reimbursementMethod", opts, mockT);
    expect(result[0].key).toBe("custom-key");
  });
});

describe("validateRequiredParams", () => {
  it("returns true when all params have values", () => {
    const params = [
      { key: "countryCode", value: "DE" },
      { key: "partNumber", value: "BT-001" },
    ];
    expect(validateRequiredParams(params)).toBe(true);
  });

  it("returns false when any param has empty string value", () => {
    const params = [
      { key: "countryCode", value: "" },
      { key: "partNumber", value: "BT-001" },
    ];
    expect(validateRequiredParams(params)).toBe(false);
  });

  it("returns false when any param has null value", () => {
    const params = [{ key: "countryCode", value: null as unknown as string }];
    expect(validateRequiredParams(params)).toBe(false);
  });

  it("returns false when any param has undefined value", () => {
    const params = [{ key: "countryCode", value: undefined as unknown as string }];
    expect(validateRequiredParams(params)).toBe(false);
  });

  it("returns true for empty params array", () => {
    expect(validateRequiredParams([])).toBe(true);
  });
});

describe("findRawOption", () => {
  it("returns undefined for empty response", () => {
    expect(findRawOption("field", undefined, [], "E001")).toBeUndefined();
  });

  it("returns undefined for non-array response", () => {
    expect(findRawOption("field", undefined, undefined as any, "E001")).toBeUndefined();
  });

  it("returns undefined when selectedValue is empty", () => {
    expect(findRawOption("field", undefined, [{ name: "A" }], "")).toBeUndefined();
  });

  it("finds option by ascId for ascName field", () => {
    const api = [
      { ascId: "A1", name: "ASC One" },
      { ascId: "A2", name: "ASC Two" },
    ];
    const result = findRawOption("ascName", undefined, api, "A2");
    expect(result?.name).toBe("ASC Two");
  });

  it("finds option by faultCode for diagnosticFaultCode subtype", () => {
    const api = [{ faultCode: "E001" }, { faultCode: "E002" }];
    const result = findRawOption("field", "diagnosticFaultCode", api, "E001");
    expect(result?.faultCode).toBe("E001");
  });

  it("finds option by name for accessoryDropdown subtype", () => {
    const api = [{ name: "BatteryPack" }, { name: "Charger" }];
    const result = findRawOption("field", "accessoryDropdown", api, "BatteryPack");
    expect(result?.name).toBe("BatteryPack");
  });

  it("finds option by name for categoryId field", () => {
    const api = [
      { name: "1", label: "Category One" },
      { name: "2", label: "Category Two" },
    ];
    const result = findRawOption("categoryId", undefined, api, "2");
    expect(result?.label).toBe("Category Two");
  });

  it("finds option by name for default subtype", () => {
    const api = [{ name: "WARRANTY" }, { name: "REPAIR" }];
    const result = findRawOption("field", undefined, api, "WARRANTY");
    expect(result?.name).toBe("WARRANTY");
  });

  it("finds option by code when name is absent", () => {
    const api = [{ code: "CODE1" }];
    const result = findRawOption("field", undefined, api, "CODE1");
    expect(result?.code).toBe("CODE1");
  });
});

describe("resolveQueryParams", () => {
  it("resolves each query param using resolveValue", () => {
    const jobData = { asset: { baretoolNumber: "BT-001" } };
    const endpoint = {
      url: "/api",
      method: "GET" as const,
      queryParams: [{ key: "partNumber", value: "asset.baretoolNumber" }],
    };
    const result = resolveQueryParams(endpoint, jobData, "DE");
    expect(result[0].key).toBe("partNumber");
    expect(result[0].value).toBe("BT-001");
  });

  it("resolves multiple query params, including languageCode and countryCode fallback", () => {
    const jobData = { asset: {} };
    const endpoint = {
      url: "/api",
      method: "GET" as const,
      queryParams: [
        { key: "language", value: "languageCode" },
        { key: "country", value: "asset.countryCode" },
      ],
    };
    const result = resolveQueryParams(endpoint, jobData, "DE");
    expect(result).toEqual([
      { key: "language", value: "en" },
      { key: "country", value: "DE" },
    ]);
  });

  it("falls back to 'tr' when neither the nested value nor countryCode arg is provided", () => {
    const jobData = { asset: {} };
    const endpoint = {
      url: "/api",
      method: "GET" as const,
      queryParams: [{ key: "country", value: "asset.countryCode" }],
    };
    const result = resolveQueryParams(endpoint, jobData, undefined);
    expect(result[0].value).toBe("tr");
  });
});
