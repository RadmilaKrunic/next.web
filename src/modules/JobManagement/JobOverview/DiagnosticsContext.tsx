import { createContext, useContext } from "react";
import type { RefObject, Dispatch, SetStateAction } from "react";
import type {
  AllowedPosition,
  discountBase,
} from "api/services/countryConfiguration/countryConfiguration";
import type { GenericOptionProps } from "components/generics/Field/GenericField.types";
import type { MaterialItem, ImportedMaterial } from "hooks/useDiagnosticsManager";

export interface DiagnosticsContextValue {
  /** Source-of-truth list of spare-part rows */
  materials: MaterialItem[];
  apiMaterialsLoaded: boolean;
  apiMaterialsEmpty: boolean;
  hasExistingDiagnostic: boolean;
  setMaterials: Dispatch<SetStateAction<MaterialItem[]>>;
  /** Add a single empty row (triggered by "Add Row" button) */
  onAddRow: (formValues: Record<string, unknown>) => void;
  /** Add one or more rows from external material sources (explosion diagram / special materials) */
  onAddMaterials: (
    materials: ImportedMaterial[],
    setFieldValue?: (field: string, value: unknown) => void,
  ) => void;
  /** Remove a spare-parts row by its area name */
  onDeleteRow: (areaName: string) => void;
  /** Restore an archived spare-parts row back to the active list */
  onRestoreRow: (areaName: string) => void;
  /** Whether adding special materials is allowed by country config */
  addSpecialMaterialsAllowed: boolean;
  /** Dropdown options for the position field */
  positionDropdownOptions: GenericOptionProps[];
  /** Allowed positions from country diagnostic config */
  allowedPositions: AllowedPosition[];
  /** Returns the set of part numbers already present in the form */
  getExistingPartNumbers: (formValues: Record<string, unknown>) => Set<string>;

  isDistributingRef: RefObject<boolean>;

  isResyncingRef: RefObject<boolean>;
  /** Set to true after the onValidate action callback completes successfully */
  arePricesValidated: boolean;
  setArePricesValidated: Dispatch<SetStateAction<boolean>>;
  /** True when at least one material row has any non-zero price value */
  hasPricesPopulated: boolean;
  /** Marks all materials as validated (called on successful validate-and-save) */
  markAllValidated: () => void;
  /** Marks a single row as dirty/unvalidated (called when user edits prices) */
  markRowDirty: (areaIndex: number) => void;
  /** Radio-button options for the summary type selector; computed inside SummaryArea */
  summaryTypeOptions: { label: string; value: string }[];
  setSummaryTypeOptions: Dispatch<SetStateAction<{ label: string; value: string }[]>>;
  /** Reset a row status from REVISED to PENDING after user edits */
  setRevisedRowPending: (areaName: string) => void;
  /** Whether the archived spare parts section is expanded */
  isArchivedExpanded: boolean;
  setIsArchivedExpanded: Dispatch<SetStateAction<boolean>>;
  /** True when deleting a row moves it to archived instead of permanently removing it. */
  canArchiveOnDelete: boolean;
  /** Resets the API-sync flag so the next diagnosticData update re-applies to the form */
  resyncMaterialsFromAPI: () => void;
  /** Current job status (e.g., "IN_DIAGNOSTICS", "REPAIR_DONE", etc.) */
  jobStatus?: string;
  /** Country-level price calculation mode: GROSS (discount on gross) or NET (discount on total net). */
  discountBase: discountBase;
  /** Positions auto-created by the matched diagnostic rule (e.g. ["LA","AC","FR"]) */
  automaticRows?: string[];
}

const DEFAULT_SUMMARY_TYPE_OPTIONS = [{ value: "totalSummary", label: "totalSummary" }];

const noop = () => {};

const createDefaultRef = (): RefObject<boolean> => ({ current: false });

const defaultDiagnosticsContextValue: DiagnosticsContextValue = {
  materials: [],
  apiMaterialsLoaded: false,
  apiMaterialsEmpty: false,
  hasExistingDiagnostic: false,
  setMaterials: noop,
  onAddRow: noop,
  onAddMaterials: noop,
  onDeleteRow: noop,
  onRestoreRow: noop,
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
  setRevisedRowPending: noop,
  isArchivedExpanded: false,
  setIsArchivedExpanded: noop,
  canArchiveOnDelete: false,
  resyncMaterialsFromAPI: noop,
  jobStatus: "",
  discountBase: "GROSS_PRICE",
  automaticRows: [],
};

export const DiagnosticsContext = createContext<DiagnosticsContextValue>(
  defaultDiagnosticsContextValue,
);

export const useDiagnosticsContext = () => useContext(DiagnosticsContext);
