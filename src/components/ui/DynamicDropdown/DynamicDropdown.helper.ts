import { DropdownOption } from "./DynamicDropdown.types";
import {
  FieldValueType,
  GenericOptionProps,
  OptionsEndpointProps,
} from "../../generics/Field/GenericField.types";
import i18n, { TFunction } from "i18next";
import { JobList } from "@/modules/JobManagement/JobList/JobList.types";

export const resolveValue = (
  path: FieldValueType,
  jobData: Record<string, any> | undefined,
  countryCode: string,
): FieldValueType => {
  if (typeof path !== "string") return path;

  if (path === "languageCode") {
    return (i18n.language || "en-US").split("-")[0];
  }

  if (!jobData) return "";

  const keys = path.split(".");
  let value: unknown = jobData;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return path.includes("countryCode") ? countryCode || "tr" : "";
    }
  }

  const resolvedValue = (value as FieldValueType) || "";

  return resolvedValue || (path.includes("countryCode") ? countryCode || "tr" : "");
};

export const mapDropdownOptions = (
  fieldName: string,
  fieldSubtype: string | undefined,
  apiResponse: any[],
  t: TFunction<"translation", "app">,
): DropdownOption[] => {
  if (fieldName === "categoryId") {
    const response = apiResponse as unknown as JobList;
    if (!response?.categories) return [];

    const categories: Record<string, string> = response.categories;
    const values = Object.values(categories);
    const keys = Object.keys(categories);
    const dropdownOptions = [];
    for (let i = 0; i < keys.length; i++) {
      const translated = t(values[i]);
      const name = translated.includes("app.") ? values[i] : translated;
      dropdownOptions.push({
        value: keys[i],
        name,
        key: keys[i],
      });
    }
    return dropdownOptions;
  }

  if (!apiResponse || !Array.isArray(apiResponse)) {
    return [];
  }

  if (typeof apiResponse[0] === "string") {
    return apiResponse.map((str) => ({
      value: str,
      name: str,
      key: `${fieldName}-${str}`,
    }));
  }

  if (fieldName === "ascName") {
    return apiResponse.map((item, index) => ({
      value: item.ascId || "",
      name: item.name || "",
      key: `${fieldName}-${item.ascId || index}`,
    }));
  }

  if (fieldName === "ascDetails") {
    return apiResponse.map((item, index) => ({
      value: item.ascId || "",
      name: `${item.name || ""}`,
      key: `${fieldName}-${item.ascId || index}`,
    }));
  }

  if (fieldSubtype === "diagnosticFaultCode") {
    return apiResponse.map((item, index) => ({
      value: `${item.faultCode ?? ""}`,
      name: `${item.faultCode || ""} - ${item.faultCodeDescription || ""}`,
      key: `${fieldName}-${item.faultCode}-${item.faultCodeLabourQuantity ?? index}`,
    }));
  }

  if (fieldSubtype === "accessoryDropdown") {
    const mapped = apiResponse.map((item, index) => {
      const option = {
        value: item.name || "",
        name: t(item.name) || "",
        key: `${fieldName}-${item.name || index}`,
      };
      return option;
    });
    return mapped;
  }

  if (fieldName === "accountRoles") {
    const mapped = apiResponse
      .filter(
        (item) =>
          item.roleId !== "APPLICATION_ADMINISTRATOR" &&
          item.roleId !== "COUNTRY_MANAGER" &&
          item.roleId !== "BOSCH_REGIONAL_MANAGER",
      )
      .map((item) => {
        const option = {
          value: item.roleId || "",
          name: t(item.name.toLowerCase().split(" ").join("")) || "",
          key: item.id,
        };
        return option;
      });

    return mapped;
  }

  return apiResponse.map((item, index) => ({
    value: item.name || item.code || "",
    name: item.name || item.label || "",
    key: `${fieldName}-${item.value || item.code || index}`,
  }));
};

export const formatDropdownOptions = (
  fieldName: string,
  options: DropdownOption[],
  selectText: string,
): DropdownOption[] => {
  if (!options || options.length === 0) {
    return [{ value: "", name: selectText }];
  }

  const hasSelectOption = options.some((option) => option.name === selectText);
  const optionsWithSelect = hasSelectOption
    ? options
    : [{ value: "", name: selectText }, ...options];

  return optionsWithSelect.map((option, index) => {
    if (option.value === "") {
      return {
        value: option.value,
        name: option.name,
        disabled: option.disabled,
        key: option.key ?? `${fieldName}-empty-${index}`,
      };
    }

    return {
      value: option.value,
      name: option.name,
      disabled: option.disabled,
      key: option.key ?? `${fieldName}-${option.value}-${index}`,
    };
  });
};

export const getDropdownValue = (
  name: string,
  subtype: string | undefined,
  options: DropdownOption[] | GenericOptionProps[],
  value: Exclude<FieldValueType, string[]> | undefined,
): string => {
  if (subtype === "diagnosticFaultCode") {
    const option = options.find((opt) => opt.value === value);
    return option ? `${option.value as string}` : "";
  }
  return value ? `${value}` : "";
};

export const translateStaticOptions = (
  dropDownName: string,
  opts: GenericOptionProps[],
  t: TFunction,
): GenericOptionProps[] => {
  const shouldDisplaySelectOption =
    !dropDownName.includes("reimbursementMethod") &&
    !dropDownName.includes("reimbursementCreateOn") &&
    !dropDownName.includes("reimbursementPeriodType");

  if (!opts) return [];
  // Some callers (e.g. ClaimSparePartsRow/SparePartsRow position fields) already
  // prepend their own empty-value placeholder option. Avoid adding a second one,
  // which would create two options with the same value/key and trigger a
  // "duplicate key" React warning.
  const hasPlaceholder = opts.some((option) => (option.value ?? "") === "");
  const options =
    shouldDisplaySelectOption && !hasPlaceholder
      ? [{ value: "", name: "SelectAnOption" }, ...opts]
      : opts;

  return options?.map((option, index) => ({
    ...option,
    name: option.name === "" ? "" : t(option.name),
    key:
      option.key ??
      (option.value === ""
        ? `${dropDownName}-empty-${index}`
        : `${dropDownName}-${option.value as string}`),
  }));
};

export const resolveQueryParams = (
  optionsEndpoint: OptionsEndpointProps,
  jobData: Record<string, any> | undefined,
  countryCode: string | undefined,
) => {
  return optionsEndpoint.queryParams.map((param) => ({
    key: param.key,
    value: resolveValue(param.value, jobData, countryCode || ""),
  }));
};

export const validateRequiredParams = (
  params: { key: string; value: FieldValueType }[],
): boolean => {
  return params.every((param) => {
    const value = param.value;
    return value !== "" && value !== null && value !== undefined;
  });
};

export const findRawOption = (
  fieldName: string,
  fieldSubtype: string | undefined,
  apiResponse: any[],
  selectedValue: string,
): Record<string, unknown> | undefined => {
  if (!apiResponse || !Array.isArray(apiResponse) || !selectedValue) return undefined;

  if (fieldName === "ascName") {
    return apiResponse.find((item) => (item.ascId || "") === selectedValue);
  }

  if (fieldSubtype === "diagnosticFaultCode") {
    return apiResponse.find((item) => `${item.faultCode ?? ""}` === selectedValue);
  }

  if (fieldSubtype === "accessoryDropdown") {
    return apiResponse.find((item) => (item.name || "") === selectedValue);
  }

  if (fieldName === "categoryId") {
    return apiResponse.find((item) => (item.name || "") === selectedValue);
  }

  return apiResponse.find((item) => (item.name || item.code || "") === selectedValue);
};
