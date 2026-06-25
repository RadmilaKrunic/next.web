import { FormikErrors } from "formik";
import {
  getCustomerByCompanyName,
  getCustomerByDealershipName,
  getCustomerByFirstName,
  getCustomerByLastName,
} from "../../../api/services/customers/customers";
import { Customer } from "../../../api/services/customers/customers.types";
import { AutoCompleteOption } from "./OptionItem/OptionItem";
import { getSparePartsSearch } from "../../../api/services/orders/orders";
import { BareToolOption } from "../../../api/services/orders/orders.types";
import Field from "../../generics/Field/GenericField.types";

/**
 * Resolves a value from a nested object using parentMap + map from fieldMapping.
 * Tries from each start index in parentMap so that a Customer object
 * (which lacks leading path segments like "order" or "customer") still resolves.
 */
export const getValueByPath = (obj: unknown, parentMap: string[], map: string): string => {
  if (!obj || !map) return "";

  let node: Record<string, unknown> = obj as Record<string, unknown>;
  if (map in node) {
    return node[map] as string;
  }

  for (let i = parentMap.length - 1; i >= 0; i--) {
    const parentMapSegment = parentMap[i];
    node = (obj as Record<string, unknown>)[parentMapSegment] as Record<string, unknown>;
    if (node && map in node) {
      return node[map] as string;
    }
  }

  return "";
};

export const getAutoCompleteValue = (
  option: unknown,
  fieldName: string,
  allFields?: Field[],
): string => {
  if (!allFields) return "";

  const fieldData = allFields?.find((f) => f?.fieldMapping?.originalName === fieldName);
  const defaultValue = fieldData?.defaultValue?.toString() || "";

  if (fieldName === "baretoolNumber") {
    return (option as BareToolOption)?.partNumber || defaultValue;
  }

  if (fieldName.toLowerCase().includes("sparepartnumber")) {
    return (option as BareToolOption)?.partNumber || defaultValue;
  }

  if (fieldName.toLowerCase().includes("sparepartdescription")) {
    return (option as BareToolOption)?.description || defaultValue;
  }

  if (fieldName.toLowerCase().includes("sparepartsunitprice")) {
    return (option as BareToolOption)?.price?.toString() || defaultValue;
  }

  if (fieldName.toLowerCase().includes("toolmodelname")) {
    const description = (option as BareToolOption)?.description || "";
    const tradeName = (option as BareToolOption)?.tradeName || "";
    return tradeName || description || defaultValue;
  }

  if (fieldName.toLowerCase().includes("categoryid")) {
    return (option as BareToolOption)?.groupId || "000";
  }

  if (fieldName.toLowerCase().includes("category")) {
    return (option as BareToolOption)?.group || "OTHERS";
  }

  if (fieldName.toLowerCase().includes("brand")) {
    return (option as BareToolOption)?.brand?.toUpperCase() || defaultValue;
  }

  if (fieldName.toLowerCase().includes("description")) {
    return (option as BareToolOption)?.description || defaultValue;
  }

  if (allFields) {
    const matchedField = allFields.find((f) => f.fieldMapping?.originalName === fieldName);
    if (matchedField?.fieldMapping?.map) {
      return getValueByPath(
        option,
        matchedField.fieldMapping.parentMap || [],
        matchedField.fieldMapping.map,
      );
    }
  }

  return "";
};

export const getAutocompleteOptions = async (
  name: string,
  newValue: string,
  ascId: string,
  searchOptions: {
    countryCode?: string;
    languageCode?: string;
    brand?: string;
    position?: string;
    isExchange?: boolean;
    bareTool?: string;
    size?: number;
    pageNumber?: number;
  } = {},
) => {
  const {
    countryCode,
    languageCode,
    brand,
    position,
    isExchange,
    bareTool,
    size = 10,
    pageNumber = 1,
  } = searchOptions;

  if (name?.toLowerCase().includes("baretoolnumber") && newValue.length >= 5) {
    const language = languageCode?.includes("-") ? languageCode.split("-")[0] : languageCode;
    const spareParts = await getSparePartsSearch(
      newValue,
      "",
      countryCode,
      language,
      brand,
      size,
      pageNumber,
      isExchange,
      bareTool,
      position,
    );
    return spareParts || [];
  }

  if (name?.toLowerCase().includes("sparepartnumber") && newValue.length >= 5) {
    const spareParts = await getSparePartsSearch(
      newValue,
      "",
      countryCode,
      languageCode,
      brand,
      size,
      pageNumber,
      isExchange,
      bareTool,
      position,
    );
    return spareParts || [];
  }

  if (name?.toLowerCase().includes("toolmodelname") && newValue.length >= 5) {
    const trimmedValue = newValue.replaceAll(/\s/g, "");
    const spareParts = await getSparePartsSearch(
      "",
      trimmedValue,
      countryCode,
      languageCode,
      brand,
      size,
      pageNumber,
      isExchange,
      bareTool,
      position,
    );
    return spareParts || [];
  }

  const getCustomersOptions = getCustomers(name);
  if (getCustomersOptions) {
    const customers = await getCustomersOptions(ascId, newValue);
    return customers || [];
  }

  return [];
};

export const getSparePartCompatibilityMessage = (
  field: Field,
  name: string,
  values: Record<string, unknown>,
  allFields: Field[],
  sparePartBelongsToTool?: Record<string, boolean>,
): string => {
  if (!name.toLowerCase().includes("sparepartnumber") || !sparePartBelongsToTool) {
    return "";
  }

  const hasBelongsToToolValue = Object.hasOwn(sparePartBelongsToTool, name);
  const belongsToTool = sparePartBelongsToTool[name] === true;
  if (!hasBelongsToToolValue || belongsToTool) {
    return "";
  }

  const rowTypeField = allFields.find(
    (currentField) =>
      currentField.subtype === "diagnosticType" &&
      currentField.fieldMapping?.nameStartsWith === field.fieldMapping?.nameStartsWith,
  );
  const rowTypeValue = rowTypeField
    ? ((values[rowTypeField.name] as string) ?? "").toUpperCase()
    : "";

  if (rowTypeValue === "WARRANTY") {
    return "incompatibleWarrantyType";
  }

  if (rowTypeValue === "SERVICE_OFFERING") {
    return "incompatibleServiceOfferingType";
  }

  return "";
};

const getCustomers = (name: string) => {
  let getCustomers;
  switch (name) {
    case "firstNameInPri":
    case "firstName":
      getCustomers = getCustomerByFirstName;
      break;
    case "lastNameInPri":
    case "lastName":
      getCustomers = getCustomerByLastName;
      break;
    case "dealershipName":
      getCustomers = getCustomerByDealershipName;
      break;
    case "companyName":
      getCustomers = getCustomerByCompanyName;
      break;
    default:
      getCustomers = undefined;
  }

  return getCustomers;
};

export const setAutocompleteFieldValue = async (
  name: string,
  option: AutoCompleteOption,
  setFieldValue: (field: string, value: string) => Promise<void | FormikErrors<unknown>>,
) => {
  if (name?.toLowerCase().includes("baretoolnumber")) {
    await setFieldValue(name, (option as BareToolOption)?.partNumber || "");
    return;
  }

  if (name?.toLowerCase().includes("toolmodelname")) {
    await setFieldValue(name, (option as BareToolOption)?.tradeName || "");
    return;
  }

  if (name?.toLowerCase().includes("sparepartnumber")) {
    await setFieldValue(name, (option as BareToolOption)?.partNumber || "");
    return;
  }

  switch (name) {
    case "companyName":
      await setFieldValue(name, (option as Customer)?.companyName || "");
      break;
    case "dealershipName":
      await setFieldValue(name, (option as Customer)?.dealershipName || "");
      break;
    case "firstNameInPri":
    case "firstName":
      await setFieldValue(name, (option as Customer)?.firstName || "");
      break;
    case "lastNameInPri":
    case "lastName":
      await setFieldValue(name, (option as Customer)?.lastName || "");
      break;
    default:
      await setFieldValue(name, "");
  }
};

export const customerAutocompleteFields = [
  "firstNameInPri",
  "lastNameInPri",
  "firstName",
  "lastName",
  "dealershipName",
  "companyName",
];

export const getAutofillFieldName = (name: string, fieldName: string) => {
  if (name.includes("assetData") && name.endsWith("baretoolNumber")) {
    return name.replace("baretoolNumber", fieldName);
  }

  const indexRegex = /#(\d+)_/;
  const indexMatch = indexRegex.exec(name);
  if (indexMatch) {
    const prefixEndIndex = indexMatch.index + indexMatch[0].length;
    const prefix = name.substring(0, prefixEndIndex);
    return `${prefix}${fieldName}`;
  }

  const endIndexRegex = /#(\d+)$/;
  const endIndexMatch = endIndexRegex.exec(name);
  if (endIndexMatch) {
    return `${fieldName}${endIndexMatch[0]}`;
  }

  return fieldName;
};

export const handleAutoCompleteSelect = async (
  option: AutoCompleteOption,
  field: Field,
  setFieldValue: (field: string, value: string) => Promise<void | FormikErrors<unknown>>,
  allFields?: Field[],
) => {
  await setAutocompleteFieldValue(field.name, option, setFieldValue);
  if (Array.isArray(field.autoFillFields) && field.autoFillFields.length > 0) {
    const autoFillFields = allFields?.filter(
      (f) =>
        field.autoFillFields?.includes(f.fieldMapping?.originalName || "") &&
        field.fieldMapping?.nameStartsWith === f.fieldMapping?.nameStartsWith,
    );
    if (!autoFillFields) return;
    for (const aff of autoFillFields) {
      const value = getAutoCompleteValue(option, aff.fieldMapping?.originalName || "", allFields);
      await setFieldValue(aff.name, value || "");
    }
  }
};

export const handleResetAutoCompleteFields = async (
  field: Field,
  setFieldValue: (field: string, value: string) => Promise<void | FormikErrors<unknown>>,
  allFields?: Field[],
  handleFieldChange?: (name: string, value: string) => Promise<void>,
) => {
  if (handleFieldChange) {
    await handleFieldChange(field.name, String(field.defaultValue ?? ""));
  } else {
    await setFieldValue(field.name, String(field.defaultValue ?? ""));
  }
  if (
    field.isPrimaryAutoComplete &&
    Array.isArray(field.autoFillFields) &&
    field.autoFillFields.length > 0
  ) {
    const autoFillFields = allFields?.filter(
      (f) =>
        field.autoFillFields?.includes(f.fieldMapping?.originalName || "") &&
        field.fieldMapping?.nameStartsWith === f.fieldMapping?.nameStartsWith,
    );
    for (const aff of autoFillFields || []) {
      await handleFieldChange?.(aff.name, String(aff.defaultValue ?? ""));
    }
  }
};
