import { OptionsEndpointProps, GenericOptionProps } from "../../generics/Field/GenericField.types";

export interface DynamicDropdownProps {
  name: string;
  label: string;
  value: string | string[];
  subtype?: string;
  multiSelect?: boolean;
  disabled?: boolean;
  required?: boolean;
  isSearchable?: boolean;
  optionsEndpoint?: OptionsEndpointProps;
  options?: GenericOptionProps[];
  onChange: (value: string | string[]) => void;
  onRawOptionSelect?: (rawItem: Record<string, unknown>) => void;
  className?: string;
}

export interface DropdownOption {
  value: string;
  name: string;
  key?: string;
  disabled?: boolean;
}

export interface MultiSelectDropdownProps {
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  isSearchable?: boolean;
  options: DropdownOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  className?: string;
}
