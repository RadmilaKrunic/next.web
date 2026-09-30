import Field, {
  FieldValueType,
  WarrantyInfoPayload,
} from "components/generics/Field/GenericField.types";
import { createContext } from "react";
import type { ComponentType, ReactNode } from "react";
import type Area from "components/generics/Area/GenericArea.types";
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

export interface MultipleAreaRowProps<T = unknown> {
  /** This row's clone of the template area (fields already renamed for `index`). */
  area: Area;
  index: number;
  item: T;
}

export interface MultipleAreaWrapperProps {
  /** The template (#0) area, for title and permissions. */
  area: Area;
  count: number;
  children: ReactNode;
}

/**
 * Parent-owned config for one isMultiple area, keyed in GenericFormContext.multipleAreas
 * by the area's list path (the `attributeMapping` prefix ending in `#`, e.g. "archivedMaterials#").
 * The parent owns the list; GenericMultipleArea owns the row areas and their fields.
 */
export interface MultipleAreaConfig<T = unknown> {
  /** Source-of-truth list, one row per item. */
  items: T[];
  /** Projects an item onto the (already renamed) fields of its row. */
  toRowValues: (item: T, rowFields: Field[]) => Record<string, unknown>;
  /** Custom row renderer. Defaults to a GenericArea per row. */
  rowComponent?: ComponentType<MultipleAreaRowProps<T>>;
  /** Group chrome rendered once around all rows (header, collapse). */
  wrapper?: ComponentType<MultipleAreaWrapperProps>;
  /** Stable row key; defaults to the row area name. */
  getKey?: (item: T, index: number) => string;
  /** Rows shown even when `items` is empty. Default 0. */
  minRows?: number;
  /** Override for the section prefix of the area name (defaults to the part before the first "_"). */
  sectionName?: string;
}

export interface MultipleAreaRowsChange {
  addedFields: Field[];
  removedFieldNames: Set<string>;
  /** Row values for every current row, to merge into the host's initial form values. */
  values: Record<string, unknown>;
}

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
  /** isMultiple areas the parent drives from a list, keyed by list path. */
  multipleAreas?: Record<string, MultipleAreaConfig>;
  /**
   * Host callback that registers/unregisters row fields and seeds row values.
   * Must be referentially stable and idempotent for fields already registered.
   */
  syncMultipleAreaRows?: (change: MultipleAreaRowsChange) => void;
  onDeleteStart?: () => void;
  onDeleteEnd?: () => void;
  onAreaValueChange?: (areaName: string, formValues?: Record<string, unknown>) => void;
  autocompleteValidation?: React.RefObject<Record<string, boolean>>;
  sparePartNotBelongsToTool?: React.RefObject<Record<string, boolean>>;
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
  warrantyPanelInfo: undefined,
  isRepairAnswerLocked: undefined,
});
