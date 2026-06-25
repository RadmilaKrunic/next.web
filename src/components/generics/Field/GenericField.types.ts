import { OptionProps } from "@bosch/react-frok";
import { CalendarConfig } from "../../ui/DatePicker/DatePicker.types";

export type FieldValueType = string | number | boolean | string[];

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
  size?: string;
  radioButtons?: { label: string; value: FieldValueType }[];
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
  //not from uiConfiguration, added only for validation and mapping
  fieldMapping?: FieldMapping;
  //preserve value of diferent fields that depends on it
  preserveOtherFieldValue?: Record<string, undefined>[];
}
export default Field;
