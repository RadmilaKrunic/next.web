import { describe, it, expect, vi } from "vitest";
import {
  resolveValue,
  mapDropdownOptions,
  formatDropdownOptions,
  getDropdownValue,
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

  it("returns countryCode fallback for path containing 'countryCode' when missing", () => {
    const jobData = { someField: "value" };
    expect(resolveValue("asset.countryCode", jobData, "DE")).toBe("DE");
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

  it("returns true for empty params array", () => {
    expect(validateRequiredParams([])).toBe(true);
  });
});

describe("findRawOption", () => {
  it("returns undefined for empty response", () => {
    expect(findRawOption("field", undefined, [], "E001")).toBeUndefined();
  });

  it("returns undefined when selectedValue is empty", () => {
    expect(findRawOption("field", undefined, [{ name: "A" }], "")).toBeUndefined();
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
});
