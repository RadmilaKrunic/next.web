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
