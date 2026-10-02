import {
  CustomerChangeConfirmationData,
  CustomerChangeFieldComparison,
  VisibleCustomerField,
} from "../../../components/ui/CustomerChangeConfirmModal/CustomerChangeConfirmModal.utils";
import type { Customer } from "../../../api/services/customers/customers.types";
import { getAllFieldsFromSection, isFieldVisible } from "../../../components/generics/utils";
import Section from "@/components/generics/Section/GenericSection.types";
import Field from "@/components/generics/Field/GenericField.types";

export const getCustomerCollapsedTitle = (values: Record<string, unknown>): string => {
  const customerName =
    (values["firstNameInPri"] as string) ||
    (values["firstName"] as string) ||
    (values["companyName"] as string) ||
    (values["dealershipName"] as string);

  const phone =
    (values["phoneNumber"] as string) ||
    (values["phoneNumberInPri"] as string) ||
    (values["mobileNumber"] as string) ||
    (values["mobileNumberInPri"] as string);

  const email = (values["email"] as string) || (values["emailInPri"] as string);

  const parts = [customerName, phone, email].filter((part) => part && part.trim() !== "");

  return parts.join(" | ");
};

export const getAssetCollapsedTitle = (values: Record<string, unknown>, index: number): string => {
  const toolModelName = values[`assetData#${index}_asset_toolModelName`] as string;
  const baretoolNumber = values[`assetData#${index}_asset_baretoolNumber`] as string;
  const serialNumber = values[`assetData#${index}_asset_serialNumber`] as string;

  const parts = [toolModelName, baretoolNumber, serialNumber].filter(
    (part) => part && part.trim() !== "",
  );

  return parts.join(" | ");
};

interface AddressFieldConfig {
  fieldName: string;
  labelKey: string;
}

const BILLING_ADDRESS_FIELDS: AddressFieldConfig[] = [
  { fieldName: "streetName", labelKey: "streetName" },
  { fieldName: "houseNumber", labelKey: "houseNumber" },
  { fieldName: "neighborhood", labelKey: "neighborhood" },
  { fieldName: "postalCode", labelKey: "postalCode" },
  { fieldName: "district", labelKey: "district" },
  { fieldName: "city", labelKey: "city" },
  { fieldName: "state", labelKey: "state" },
  { fieldName: "countryCode", labelKey: "countryRegion" },
];

const DELIVERY_ADDRESS_FIELDS: AddressFieldConfig[] = [
  { fieldName: "deliveryStreetName", labelKey: "streetName" },
  { fieldName: "deliveryHouseNumber", labelKey: "houseNumber" },
  { fieldName: "deliveryNeighborhood", labelKey: "neighborhood" },
  { fieldName: "deliveryPostalCode", labelKey: "postalCode" },
  { fieldName: "deliveryDistrict", labelKey: "district" },
  { fieldName: "deliveryCity", labelKey: "city" },
  { fieldName: "deliveryState", labelKey: "state" },
  { fieldName: "deliveryCountry", labelKey: "country" },
];

const BILLING_FIELDS_WITH_DEFAULTS = new Set(["countryCode"]);
const DELIVERY_FIELDS_WITH_DEFAULTS = new Set(["deliveryCountry"]);

function isValueEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

const STATE_FIELD_NAMES = new Set(["state", "deliveryState"]);

function filterOutStateFieldsForTurkey(
  fields: AddressFieldConfig[],
  values: Record<string, unknown>,
  useBillingAddressForDelivery: boolean,
): AddressFieldConfig[] {
  const countryFieldName = useBillingAddressForDelivery ? "countryCode" : "deliveryCountry";
  if (values[countryFieldName] !== "TR") return fields;
  return fields.filter((field) => !STATE_FIELD_NAMES.has(field.fieldName));
}

export function getMissingAddressFieldLabels(values: Record<string, unknown>): string[] {
  const useBillingAddressForDelivery = values["useBillingAddressForDelivery"] === true;
  const fieldsToCheck = filterOutStateFieldsForTurkey(
    useBillingAddressForDelivery ? BILLING_ADDRESS_FIELDS : DELIVERY_ADDRESS_FIELDS,
    values,
    useBillingAddressForDelivery,
  );

  return fieldsToCheck
    .filter((field) => isValueEmpty(values[field.fieldName]))
    .map((field) => field.labelKey);
}

export interface DeliveryAddressConfirmationInfo {
  missingFieldLabels: string[];
  isAddressCompletelyEmpty: boolean;
}

export function getDeliveryAddressConfirmationInfo(
  values: Record<string, unknown>,
): DeliveryAddressConfirmationInfo | null {
  if (values["pickupType"] !== "DELIVERY") return null;

  const useBillingAddressForDelivery = values["useBillingAddressForDelivery"] === true;
  const fieldsToCheck = filterOutStateFieldsForTurkey(
    useBillingAddressForDelivery ? BILLING_ADDRESS_FIELDS : DELIVERY_ADDRESS_FIELDS,
    values,
    useBillingAddressForDelivery,
  );
  const fieldsWithDefaults = useBillingAddressForDelivery
    ? BILLING_FIELDS_WITH_DEFAULTS
    : DELIVERY_FIELDS_WITH_DEFAULTS;

  const missingFieldLabels = fieldsToCheck
    .filter((field) => isValueEmpty(values[field.fieldName]))
    .map((field) => field.labelKey);

  if (missingFieldLabels.length === 0) return null;

  const fieldsWithoutDefaults = fieldsToCheck.filter(
    (field) => !fieldsWithDefaults.has(field.fieldName),
  );
  const isAddressCompletelyEmpty = fieldsWithoutDefaults.every((field) =>
    isValueEmpty(values[field.fieldName]),
  );

  return { missingFieldLabels, isAddressCompletelyEmpty };
}

const CUSTOMER_FORM_FIELD_SNAPSHOT_MAP: Record<string, (customer: Customer) => unknown> = {
  firstNameInPri: (customer) => customer.firstName,
  firstName: (customer) => customer.firstName,
  lastNameInPri: (customer) => customer.lastName,
  lastName: (customer) => customer.lastName,
  companyName: (customer) => customer.companyName,
  dealershipName: (customer) => customer.dealershipName,
  phoneNumber: (customer) => customer.phoneNumber,
  phoneNumberInPri: (customer) => customer.phoneNumber,
  mobileNumber: (customer) => customer.mobileNumber,
  mobileNumberInPri: (customer) => customer.mobileNumber,
  email: (customer) => customer.primaryEmail,
  emailInPri: (customer) => customer.primaryEmail,
  primaryEmail: (customer) => customer.primaryEmail,
  typeOfIndustry: (customer) => customer.typeOfIndustry,
  boschCustomerNumber: (customer) => customer.boschCustomerNumber,
  vatNumber: (customer) => customer.vatNumber,
  communicationMedium: (customer) => customer.communicationMedium,
  streetName: (customer) => customer.billingAddress?.street ?? "",
  houseNumber: (customer) => customer.billingAddress?.houseNumber ?? "",
  neighborhood: (customer) => customer.billingAddress?.neighborhood ?? "",
  postalCode: (customer) => customer.billingAddress?.postalCode ?? "",
  district: (customer) => customer.billingAddress?.district ?? "",
  city: (customer) => customer.billingAddress?.city ?? "",
  state: (customer) => customer.billingAddress?.stateProvinceRegion ?? "",
  countryCode: (customer) => customer.billingAddress?.countryCode ?? "",
  deliveryStreetName: (customer) => customer.deliveryAddress?.street ?? "",
  deliveryHouseNumber: (customer) => customer.deliveryAddress?.houseNumber ?? "",
  deliveryNeighborhood: (customer) => customer.deliveryAddress?.neighborhood ?? "",
  deliveryPostalCode: (customer) => customer.deliveryAddress?.postalCode ?? "",
  deliveryDistrict: (customer) => customer.deliveryAddress?.district ?? "",
  deliveryCity: (customer) => customer.deliveryAddress?.city ?? "",
  deliveryState: (customer) => customer.deliveryAddress?.stateProvinceRegion ?? "",
  deliveryCountry: (customer) => customer.deliveryAddress?.countryCode ?? "",
  addressLineTwo: (customer) => customer.billingAddress?.additionalDetails ?? "",
  addressLineTwoDelivery: (customer) => customer.deliveryAddress?.additionalDetails ?? "",
};

const normalizeComparableValue = (value: unknown): string | boolean => {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "symbol") {
    return String(value);
  }
  return "";
};

export function getSelectedCustomerFormSnapshot(customer: Customer): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(CUSTOMER_FORM_FIELD_SNAPSHOT_MAP).map(([fieldName, resolver]) => [
      fieldName,
      resolver(customer),
    ]),
  );
}

export function getCustomerChangeComparisons(
  values: Record<string, unknown>,
  customer: Customer | null | undefined,
  visibleFields?: ReadonlyArray<VisibleCustomerField>,
): CustomerChangeFieldComparison[] {
  if (!customer) return [];

  const snapshot = getSelectedCustomerFormSnapshot(customer);
  const visibleFieldNameSet = visibleFields
    ? new Set(visibleFields.map((field) => field.fieldName))
    : null;
  const visibleFieldLabelMap = new Map(
    visibleFields?.map((field) => [field.fieldName, field.fieldLabel]) ?? [],
  );

  return Object.entries(snapshot)
    .filter(([fieldName, snapshotValue]) => {
      if (visibleFieldNameSet && !visibleFieldNameSet.has(fieldName)) {
        return false;
      }

      return (
        normalizeComparableValue(values[fieldName]) !== normalizeComparableValue(snapshotValue)
      );
    })
    .map(([fieldName, originalValue]) => ({
      fieldName,
      fieldLabel: visibleFieldLabelMap.get(fieldName) ?? "",
      originalValue,
      currentValue: values[fieldName],
    }));
}

export function getVisibleCustomerFields(
  customerSection: Section,
  allFields: Field[],
  values: Record<string, unknown>,
): VisibleCustomerField[] {
  const customerFields = getAllFieldsFromSection(customerSection);
  const visibleCustomerFields = customerFields.filter((field) =>
    isFieldVisible(field, allFields, values),
  );

  return visibleCustomerFields.map((field) => ({
    fieldName: field.name,
    fieldLabel: field.label,
  }));
}

export function buildCustomerChangeConfirmationData(
  values: Record<string, unknown>,
  customer: Customer | null | undefined,
  customerSection: Section,
  allFields: Field[],
): CustomerChangeConfirmationData {
  const visibleFields = getVisibleCustomerFields(customerSection, allFields, values);
  const comparisons = getCustomerChangeComparisons(values, customer, visibleFields);

  return {
    comparisons,
    signature: JSON.stringify(comparisons),
  };
}
