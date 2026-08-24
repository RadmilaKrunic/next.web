import Field, {
  GenericOptionProps,
  RadioButtonOption,
} from "../../../components/generics/Field/GenericField.types";
import type { WarrantyInfoPayload } from "../../../components/generics/Field/GenericField.types";
import Section from "../../../components/generics/Section/GenericSection.types";
import {
  WarrantyCheckRequest,
  WarrantyCheckResponse,
} from "../../../api/services/orders/orders.types";

export const WARRANTY_AREA_NAME_REGEX = /^assetData#(\d+)_(asset|assetData)$/;

export interface WarrantyCheckPayloadFieldNames {
  brandFieldName: string;
  bareToolNumberFieldName: string;
  serialNumberFieldName: string;
  purchaseDateFieldName: string;
}

const DEFAULT_CUSTOMER_WISH_OPTIONS: RadioButtonOption[] = [
  { label: "warranty", value: "WARRANTY" },
  { label: "chargeable", value: "CHARGEABLE" },
];

const DEFAULT_WARRANTY_TYPE_OPTIONS: GenericOptionProps[] = [
  { name: "STANDARD_WARRANTY", value: "STANDARD_WARRANTY" },
  { name: "EXTENDED_WARRANTY", value: "EXTENDED_WARRANTY" },
  { name: "BOSCH_PRO_SERVICE", value: "BOSCH_PRO_SERVICE" },
];

export const getSectionScopedFieldName = (
  sectionIndex: number,
  areaName: string,
  fieldName: string,
): string => `assetData#${sectionIndex}_${areaName}_${fieldName}`;

export const normalizePurchaseDate = (value: unknown): string => {
  if (typeof value !== "string") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const buildWarrantyCheckPayloadFromFieldNames = (
  values: Record<string, unknown>,
  fieldNames: WarrantyCheckPayloadFieldNames,
  countryCode?: string,
): WarrantyCheckRequest | null => {
  const brand = (values[fieldNames.brandFieldName] as string) || "";
  const bareToolNumber = (values[fieldNames.bareToolNumberFieldName] as string) || "";
  const serialNumber = (values[fieldNames.serialNumberFieldName] as string) || "";
  const purchaseDate = normalizePurchaseDate(values[fieldNames.purchaseDateFieldName]);

  if (!brand || !bareToolNumber || !serialNumber || !purchaseDate || !countryCode) {
    return null;
  }

  return {
    brand,
    country: countryCode,
    bareToolNumber,
    serialNumber,
    purchaseDate,
  };
};

export const buildWarrantyCheckPayload = (
  values: Record<string, unknown>,
  sectionIndex: number,
  countryCode?: string,
): WarrantyCheckRequest | null => {
  return buildWarrantyCheckPayloadFromFieldNames(
    values,
    {
      brandFieldName: getSectionScopedFieldName(sectionIndex, "asset", "brand"),
      bareToolNumberFieldName: getSectionScopedFieldName(sectionIndex, "asset", "baretoolNumber"),
      serialNumberFieldName: getSectionScopedFieldName(sectionIndex, "asset", "serialNumber"),
      purchaseDateFieldName: getSectionScopedFieldName(sectionIndex, "asset", "purchaseDate"),
    },
    countryCode,
  );
};

export const getAllowedWarrantyTypes = (response: WarrantyCheckResponse): Set<string> => {
  const allowed = new Set<string>();

  if (response.supportedWarrantyType) {
    allowed.add(response.supportedWarrantyType);
  }

  if (
    response.supportedWarrantyType === "BOSCH_PRO_SERVICE" ||
    (response.proServiceType && response.proServiceType.trim() !== "")
  ) {
    allowed.add("BOSCH_PRO_SERVICE");
  }

  return allowed;
};

const mapCustomerWishField = (
  field: Field,
  evaluationStatus: WarrantyCheckResponse["evaluationStatus"],
  warrantyInfoPayload: WarrantyInfoPayload | null,
): Field => {
  if (field.fieldMapping?.originalName !== "customerWish") return field;

  const sourceOptions =
    field.radioButtons && field.radioButtons.length > 0
      ? field.radioButtons
      : DEFAULT_CUSTOMER_WISH_OPTIONS;

  return {
    ...field,
    isDisabled: false,
    radioButtons: sourceOptions.map((option) => {
      if (option.value !== "WARRANTY") {
        return {
          ...option,
          infoText: undefined,
        };
      }

      return {
        ...option,
        disabled: evaluationStatus === "INELIGIBLE",
        infoText: undefined,
        infoPayload:
          evaluationStatus === "INELIGIBLE"
            ? (warrantyInfoPayload ?? {
                fallbackMessage: "Warranty customer wish is blocked for this tool.",
              })
            : undefined,
      };
    }),
  };
};

const mapWarrantyTypeField = (
  field: Field,
  response: WarrantyCheckResponse,
  allowedWarrantyTypes: Set<string>,
): Field => {
  if (field.fieldMapping?.originalName !== "warrantyType") return field;

  const sourceOptions =
    field.options && field.options.length > 0 ? field.options : DEFAULT_WARRANTY_TYPE_OPTIONS;

  if (response.evaluationStatus === "SKIPPED") {
    return {
      ...field,
      isDisabled: false,
      options: sourceOptions.map((option) => ({ ...option, disabled: undefined })),
    };
  }

  if (response.evaluationStatus === "INELIGIBLE") {
    return {
      ...field,
      isDisabled: true,
      options: sourceOptions.map((option) => ({ ...option, disabled: undefined })),
    };
  }

  return {
    ...field,
    isDisabled: false,
    options: sourceOptions.map((option) => ({
      ...option,
      disabled: !allowedWarrantyTypes.has(String(option.value ?? "")),
    })),
  };
};

export const updateWarrantyFields = (
  fields: Field[] | null,
  response: WarrantyCheckResponse,
  warrantyInfoPayload: WarrantyInfoPayload | null,
): Field[] | null => {
  if (!fields) return fields;

  const allowedWarrantyTypes = getAllowedWarrantyTypes(response);

  return fields.map((field) => {
    if (field.fieldMapping?.originalName === "customerWish") {
      return mapCustomerWishField(field, response.evaluationStatus, warrantyInfoPayload);
    }

    return mapWarrantyTypeField(field, response, allowedWarrantyTypes);
  });
};

const mapWarrantyArea = (
  area: Section["areas"][number],
  targetSectionName: string,
  response: WarrantyCheckResponse,
  allowedWarrantyTypes: Set<string>,
  warrantyInfoPayload: WarrantyInfoPayload | null,
): Section["areas"][number] => {
  if (area.name === `${targetSectionName}_customerWish`) {
    return {
      ...area,
      fields: area.fields.map((field) =>
        mapCustomerWishField(field, response.evaluationStatus, warrantyInfoPayload),
      ),
    };
  }

  if (area.name === `${targetSectionName}_warrantyDetails`) {
    return {
      ...area,
      fields: area.fields.map((field) =>
        mapWarrantyTypeField(field, response, allowedWarrantyTypes),
      ),
    };
  }

  return area;
};

export const updateWarrantySections = (
  prevSections: Section[],
  sectionIndex: number,
  response: WarrantyCheckResponse,
  warrantyInfoPayload: WarrantyInfoPayload | null,
): Section[] => {
  const targetSectionName = `assetData#${sectionIndex}`;
  const allowedWarrantyTypes = getAllowedWarrantyTypes(response);

  return prevSections.map((section) => {
    if (section.name !== targetSectionName) return section;

    return {
      ...section,
      areas: section.areas.map((area) =>
        mapWarrantyArea(
          area,
          targetSectionName,
          response,
          allowedWarrantyTypes,
          warrantyInfoPayload,
        ),
      ),
    };
  });
};
