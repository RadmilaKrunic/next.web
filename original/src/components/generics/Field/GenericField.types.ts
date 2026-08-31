import { OptionProps } from "@bosch/react-frok";
import { CalendarConfig } from "../../ui/DatePicker/DatePicker.types";

export type FieldValueType = string | number | boolean | string[];

export type WarrantyReasonKey =
  | "UNKNOWN_SERIAL_NUMBER"
  | "WARRANTY_EXPIRED"
  | "ALLOWED_REPAIR_COUNT_EXCEEDED";

export interface WarrantyInfoPayload {
  reasonKey?: WarrantyReasonKey;
  fallbackMessage?: string;
  validityExpirationDate?: string;
  usedWarrantyRepairCount?: number;
  allowedWarrantyRepairCount?: number;
  recommendation?: string;
}

export interface RadioButtonOption {
  label: string;
  value: FieldValueType;
  disabled?: boolean;
  infoText?: string;
  infoPayload?: WarrantyInfoPayload;
}

export interface DependentField {
  fieldName: string;
  fieldValue: FieldValueType;
}

export interface GenericOptionProps extends OptionProps {
  key?: string;
  tel?: string;
  mail?: string;
  image?: string;
}

export interface FieldMapping {
  originalName?: string;
  map?: string;
  parentMap?: string[];
  prefixes?: string[];
  nameStartsWith?: string;
}

export interface RequiredDependentField {
  allEmpty?: string[];
  errorMessageAllEmpty?: string;
  errorMessageByValue?: string;
  byValueAnd?: DependentField[];
  byValueOr?: DependentField[];
}

export interface OptionsEndpointProps {
  url: string;
  method: string;
  queryParams: { key: string; value: FieldValueType }[];
}

export interface RequiredDocument {
  documentTypes: string[];
  errorMessage: string;
  requiredForFields: DependentField[];
}

interface Field {
  name: string;
  label: string;
  type: string;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
  minValue?: number;
  maxValue?: number;
  isDisabled?: boolean;
  isHidden?: boolean;
  isRequired?: boolean;
  [key: string]: unknown;
  isInfoIcon?: boolean;
  infoText?: string;
  infoPayload?: WarrantyInfoPayload;
  size?: string;
  radioButtons?: RadioButtonOption[];
  isSubField?: boolean;
  dependFieldCondition?: string | null;
  dependentFields?: DependentField[];
  position?: number;
  options?: GenericOptionProps[];
  optionsEndpoint?: OptionsEndpointProps;
  calendar?: CalendarConfig;
  autoFillFields?: string[];
  attributeMapping?: string;
  requiredDependentFields?: RequiredDependentField;
  defaultValue?: FieldValueType | null;
  sameDataFieldAs?: string;
  permissions?: string[];
  subtype?: string;
  radioButtonsSource?: string;
  onValueChange?: string;
  disabledForStatuses?: string[];
  multiSelect?: boolean;
  allowedFormats?: string[];
  alwaysDisabled?: boolean;
  patternText?: string;
  multiple?: boolean;
  maxFilesAllowed?: number;
  maxFileSizeInMb?: number;
  requiredDocuments?: RequiredDocument[];
  prefix?: string;
  //not from uiConfiguration, added only for validation and mapping
  fieldMapping?: FieldMapping;
}
export default Field;
