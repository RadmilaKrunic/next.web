import Field, { FieldValueType } from "components/generics/Field/GenericField.types";
import { createContext } from "react";
import { ActionMandatoryFields } from "./GenericForm.types";

export type ActionCallback = (...args: unknown[]) => void | boolean | Promise<void>;
export type RadioButtonOption = { label: string; value: FieldValueType };
export type RadioSourceCallback = () => RadioButtonOption[];

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
  onAreaValueChange?: (areaName: string) => void;
  autocompleteValidation?: React.RefObject<Record<string, boolean>>;
  sparePartBelongsToTool?: React.RefObject<Record<string, boolean>>;
  activeValueChangeFieldRef?: React.RefObject<string | null>;
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
  sparePartBelongsToTool: undefined,
  activeValueChangeFieldRef: undefined,
});
