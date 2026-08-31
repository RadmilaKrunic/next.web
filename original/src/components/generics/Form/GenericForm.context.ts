import Field, {
  FieldValueType,
  WarrantyInfoPayload,
} from "components/generics/Field/GenericField.types";
import { createContext } from "react";
import { ActionMandatoryFields } from "./GenericForm.types";

export interface ActionCallbackHelpers {
  setFieldValue: (field: string, value: unknown) => void | Promise<unknown>;
  setErrors: (errors: Record<string, unknown>) => void;
  setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, unknown>>;
}

export type ActionCallback =
  | ((
      formValues?: Record<string, unknown>,
      helpers?: ActionCallbackHelpers,
    ) => void | boolean | Promise<void>)
  | ((...args: unknown[]) => void | boolean | Promise<void>);
export type RadioButtonOption = {
  label: string;
  value: FieldValueType;
  disabled?: boolean;
  infoText?: string;
};
export type RadioSourceCallback = () => RadioButtonOption[];

export interface WarrantyPanelInfo {
  supportedWarrantyType: string;
  isIneligible?: boolean;
  validityExpirationDate?: string;
  unavailableMessage?: string;
  infoPayload?: WarrantyInfoPayload;
  hasPurchaseDate?: boolean;
}

export interface GenericFormContextType {
  allFields: Field[];
  setAllFields: React.Dispatch<React.SetStateAction<Field[]>>;
  mandatoryFields: Record<string, ActionMandatoryFields> | null;
  setMandatoryFields: React.Dispatch<
    React.SetStateAction<Record<string, ActionMandatoryFields> | null>
  >;
  actionCallbacks: Record<string, ActionCallback>;
  radioSourceCallbacks?: Record<string, RadioSourceCallback>;
  onDeleteStart?: () => void;
  onDeleteEnd?: () => void;
  onAreaValueChange?: (areaName: string, formValues?: Record<string, unknown>) => void;
  autocompleteValidation?: React.RefObject<Record<string, boolean>>;
  sparePartNotBelongsToTool?: React.RefObject<Record<string, boolean>>;
  activeValueChangeFieldRef?: React.RefObject<string | null>;
  warrantyPanelInfo?: WarrantyPanelInfo;
  isRepairAnswerLocked?: boolean;
}

export const GenericFormContext = createContext<GenericFormContextType>({
  allFields: [],
  setAllFields: () => {},
  mandatoryFields: null,
  setMandatoryFields: () => {},
  actionCallbacks: {},
  onDeleteStart: undefined,
  onDeleteEnd: undefined,
  onAreaValueChange: undefined,
  autocompleteValidation: undefined,
  sparePartNotBelongsToTool: undefined,
  activeValueChangeFieldRef: undefined,
  warrantyPanelInfo: undefined,
  isRepairAnswerLocked: undefined,
});
