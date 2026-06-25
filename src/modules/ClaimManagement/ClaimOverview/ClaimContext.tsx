import { createContext, useContext } from "react";
import type { RefObject, Dispatch, SetStateAction } from "react";
import type {
  AllowedPosition,
  discountBase,
} from "api/services/countryConfiguration/countryConfiguration";
import type { GenericOptionProps } from "components/generics/Field/GenericField.types";
import type { MaterialItem, ImportedMaterial } from "hooks/useDiagnosticsManager";
import type { Material } from "./Claims.types";

export interface ClaimContextValue {
  /** Source-of-truth list of claim spare-part rows */
  materials: MaterialItem[];
  setMaterials: Dispatch<SetStateAction<MaterialItem[]>>;
  /** Add a single empty row */
  onAddRow: (formValues: Record<string, unknown>) => void;
  /** Add one or more rows from external sources (special materials / explosion diagram) */
  onAddMaterials: (
    materials: ImportedMaterial[],
    setFieldValue?: (field: string, value: unknown) => void,
  ) => void;
  /** Remove a claim spare-part row by its area name */
  onDeleteRow: (areaName: string) => void;
  /** Permanently remove an archived row */
  onDeleteArchivedRow: (areaName: string) => void;
  /** Move an archived row back to the active list */
  onRestoreRow: (areaName: string) => void;
  /** Whether adding special materials is allowed by country config */
  addSpecialMaterialsAllowed: boolean;
  /** Dropdown options for the position field */
  positionDropdownOptions: GenericOptionProps[];
  /** Allowed positions from country diagnostic config */
  allowedPositions: AllowedPosition[];
  /** Returns the set of part numbers already in the form */
  getExistingPartNumbers: (formValues: Record<string, unknown>) => Set<string>;
  /** Ref flag: true while a summary distribution is in progress */
  isDistributingRef: RefObject<boolean>;
  /** Ref flag: true while an API-driven resync is in progress */
  isResyncingRef: RefObject<boolean>;
  /** True after prices have been validated */
  arePricesValidated: boolean;
  setArePricesValidated: Dispatch<SetStateAction<boolean>>;
  /** True when at least one row has a non-zero price */
  hasPricesPopulated: boolean;
  /** Marks all rows as validated */
  markAllValidated: () => void;
  /** Marks a single row as dirty */
  markRowDirty: (areaIndex: number) => void;
  /** Radio-button options computed inside ClaimSummaryArea */
  summaryTypeOptions: { label: string; value: string }[];
  setSummaryTypeOptions: Dispatch<SetStateAction<{ label: string; value: string }[]>>;
  /** Country-level price calculation mode */
  discountBase: discountBase;
  /** Automatic rows for current actionType+jobType (should not show delete icon) */
  automaticRows: string[];
  /** True when rows can be deleted (edit mode + status is REVISED) */
  canDeleteRows: boolean;
  /** Materials deleted from the active list (sent to BE on validate) */
  archivedMaterials: Material[];
  /** True when the archived materials section is expanded */
  isArchivedExpanded: boolean;
  setIsArchivedExpanded: Dispatch<SetStateAction<boolean>>;
}

const DEFAULT_SUMMARY_TYPE_OPTIONS = [{ value: "totalSummary", label: "totalSummary" }];

const noop = () => {};

const createDefaultRef = (): RefObject<boolean> => ({ current: false });

const defaultClaimContextValue: ClaimContextValue = {
  materials: [],
  setMaterials: () => {},
  onAddRow: () => {},
  onAddMaterials: () => {},
  onDeleteRow: () => {},
  onDeleteArchivedRow: () => {},
  onRestoreRow: () => {},
  addSpecialMaterialsAllowed: false,
  positionDropdownOptions: [],
  allowedPositions: [],
  getExistingPartNumbers: () => new Set(),
  isDistributingRef: createDefaultRef(),
  isResyncingRef: createDefaultRef(),
  arePricesValidated: false,
  setArePricesValidated: noop,
  hasPricesPopulated: false,
  markAllValidated: noop,
  markRowDirty: noop,
  summaryTypeOptions: DEFAULT_SUMMARY_TYPE_OPTIONS,
  setSummaryTypeOptions: noop,
  discountBase: "GROSS_PRICE",
  canDeleteRows: false,
  automaticRows: [],
  archivedMaterials: [],
  isArchivedExpanded: false,
  setIsArchivedExpanded: () => {},
};

export const ClaimContext = createContext<ClaimContextValue>(defaultClaimContextValue);
export const useClaimContext = () => useContext(ClaimContext);
