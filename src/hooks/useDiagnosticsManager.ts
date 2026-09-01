import { useState, useEffect, useCallback, useRef, useMemo, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  CountryConfig,
  AllowedPosition,
  discountBase,
} from "api/services/countryConfiguration/countryConfiguration";
import type { GenericOptionProps } from "components/generics/Field/GenericField.types";
import {
  ENABLE_ITEM_RULES_RESOLVER,
  resolveAllowedPositions,
  resolveAutomaticRows,
} from "utils/itemRulesResolver";
import Field from "components/generics/Field/GenericField.types";
import Section from "components/generics/Section/GenericSection.types";
import Area from "components/generics/Area/GenericArea.types";
import type { RefObject } from "react";
import {
  setDuplicatedArea,
  mapFieldToFieldMapping,
  syncFieldsToTabs,
} from "components/generics/utils";
import { calculatePrices } from "utils/priceCalculator";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useBareSalesRelation } from "api/services/bareSalesRelation/hooks";
import { PERMISSIONS } from "utils/Permissions";
import type { HeaderUserData } from "api/services/header/action";
import { MessagesContext } from "../contexts/messagescontext";
import { scrollToTop } from "../utils/scrollToError";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MaterialItem {
  position: string;
  partNumber: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  netAmount: number;
  tax: number;
  grossAmount: number;
  discount: number;
  discountAmount?: number;
  taxAmount: number;
  totalAmount: number;
  suggestedNetPrice?: number;
  status?: string;
  materialId?: string;
  origin?: "specialMaterial" | "explosionDrawing";
  isValidated?: boolean;
  /** True for rows added manually by the user (not loaded from API) */
  isNew?: boolean;
  order?: number;
  notBelongsToTool?: boolean;
  isPriceSetManually?: boolean;
  reimbursementPaymentMethod?: string | null;
}

// ── Diagnostic field helpers ───────────────────────────────────────────────

export function computeIsChargeable(
  allFields: Field[],
  values: Record<string, unknown>,
): boolean | null {
  const typeFields = allFields.filter((f) => f.subtype === "diagnosticType");
  if (typeFields.length === 0) return null;
  return typeFields.some((f) => (values[f.name] as string) === "CHARGEABLE");
}

export function hasWarrantyOrProServiceItems(
  allFields: Field[],
  values: Record<string, unknown>,
): boolean {
  const typeFields = allFields.filter((f) => f.subtype === "diagnosticType");
  return typeFields.some((f) => {
    const type = (values[f.name] as string) ?? "";
    return type === "WARRANTY" || type === "SERVICE_OFFERING";
  });
}

export function getChargeablePendingInfo(
  fields: Field[],
  values: Record<string, unknown>,
): { pendingTypeFields: Field[]; hasChargeablePending: boolean } {
  const typeFields = fields.filter((f) => f.subtype === "diagnosticType");
  const statusFields = fields.filter((f) => f.subtype === "diagnosticMaterialStatus");
  const pendingTypeFields = typeFields.filter((_, i) => {
    const statusField = statusFields[i];
    return !statusField || (values[statusField.name] as string) !== "APPROVED";
  });
  const hasChargeablePending = pendingTypeFields.some(
    (tf) =>
      (values[tf.name] as string) === "CHARGEABLE" ||
      (values[tf.name] as string) === "SPECIAL_CONTRACT",
  );
  return { pendingTypeFields, hasChargeablePending };
}

const PREAPPROVAL_ACTION_TYPES = new Set([
  "NEW_TOOL_EXCHANGE",
  "SPARE_PARTS_EXCHANGE",
  "ACCESSORIES_EXCHANGE",
]);

const PREAPPROVAL_JOB_TYPES = new Set(["WARRANTY", "SERVICE_OFFERING"]);

export function getBoschInternalPending(
  fields: Field[],
  values: Record<string, unknown>,
): { pendingTypeFields: Field[]; hasBoschInternalPending: boolean } {
  const typeFields = fields.filter((f) => f.subtype === "diagnosticType");
  const statusFields = fields.filter((f) => f.subtype === "diagnosticMaterialStatus");
  const actionType = (values.actionType as string) ?? "";
  const pendingTypeFields = typeFields.filter((_, i) => {
    const statusField = statusFields[i];
    return !statusField || (values[statusField.name] as string) !== "APPROVED";
  });
  const hasBoschInternalPending = pendingTypeFields.some((tf) => {
    const type = (values[tf.name] as string) ?? "";
    if (type === "COMMERCIAL_GOODWILL") return true;
    if (PREAPPROVAL_ACTION_TYPES.has(actionType) && PREAPPROVAL_JOB_TYPES.has(type)) return true;
    return false;
  });
  return { pendingTypeFields, hasBoschInternalPending };
}

export const getPositionAutofill = (
  t: TFunction<"translation", "app">,
): Record<string, { partNumber: string; description: string }> => ({
  LA: { partNumber: "1609888887", description: t("labourCost") },
  FR: { partNumber: "1609888888", description: t("freightCost") },
});

const POSITION_ORDER: Record<string, number> = {
  LA: 0,
  PN: 1,
  SP: 2,
  AC: 3,
  FR: 4,
  PC: 5,
};
const POSITION_VIEW_PERMISSIONS = {
  FR: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_FREIGHT_ITEMS,
} as const;

const POSITION_INSERT_PERMISSIONS = {
  FR: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_FREIGHT_ITEMS,
} as const;

const sortByPositionOrder = (positions: string[]): string[] =>
  [...positions].sort(
    (a, b) =>
      (POSITION_ORDER[a] ?? Number.MAX_SAFE_INTEGER) -
      (POSITION_ORDER[b] ?? Number.MAX_SAFE_INTEGER),
  );

const getOrderValue = (item: MaterialItem, fallbackIndex: number): number => {
  const parsed = Number(item.order);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackIndex + 1;
  return parsed;
};

const normalizeMaterialOrders = (items: MaterialItem[]): MaterialItem[] =>
  items.map((item, index) => ({ ...item, order: getOrderValue(item, index) }));

const sortMaterialsByOrder = (items: MaterialItem[]): MaterialItem[] =>
  [...normalizeMaterialOrders(items)].sort((a, b) => {
    const byOrder = getOrderValue(a, 0) - getOrderValue(b, 0);
    if (byOrder !== 0) return byOrder;
    return (
      (POSITION_ORDER[a.position] ?? Number.MAX_SAFE_INTEGER) -
      (POSITION_ORDER[b.position] ?? Number.MAX_SAFE_INTEGER)
    );
  });

enum QuantitySource {
  DEFAULT = "DEFAULT",
  FAULT_CODES = "FAULT_CODES",
  USER = "USER",
}

// ── Helpers ────────────────────────────────────────────────────────────────

const computePricesForItem = (item: MaterialItem, mode?: discountBase): MaterialItem => {
  if (item.unitPrice <= 0) return item;
  const result = calculatePrices(
    {
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxPercent: item.tax,
      discountPercent: item.discount,
      grossAmount: 0,
      netAmount: 0,
      suggestedNetPrice: 0,
      totalAmount: 0,
      taxAmount: 0,
    },
    "unitPrice",
    item.unitPrice,
    mode,
  );
  return {
    ...item,
    netAmount: result.netAmount,
    suggestedNetPrice: result.suggestedNetPrice,
    tax: result.taxPercent,
    taxAmount: result.taxAmount,
    grossAmount: result.grossAmount,
    discount: result.discountPercent,
    discountAmount: result.discountAmount,
    totalAmount: result.totalAmount,
  };
};

const buildEmptyMaterial = (
  position: string,
  jobType: string,
  quantity: number,
  t: TFunction<"translation", "app">,
  mode?: discountBase,
): MaterialItem => {
  const autofill = getPositionAutofill(t)[position];
  const base: MaterialItem = {
    position,
    partNumber: autofill?.partNumber ?? "",
    description: autofill?.description ?? "",
    type: jobType,
    quantity,
    unitPrice: 0,
    netAmount: 0,
    suggestedNetPrice: 0,
    tax: 0,
    taxAmount: 0,
    grossAmount: 0,
    discount: 0,
    totalAmount: 0,
    order: 0,
    isPriceSetManually: false,
  };
  return computePricesForItem(base, mode);
};

/** Write a MaterialItem's values into the duplicate area's fields via subtype. */
export const buildRowValues = (
  areaFields: Field[],
  item: MaterialItem,
): Record<string, unknown> => {
  const mappingSubtype: Record<string, unknown> = {
    diagnosticPosition: item.position,
    archivedPosition: item.position,
    diagnosticPartNumber: item.partNumber,
    archivedPartNumber: item.partNumber,
    diagnosticDescription: item.description,
    archivedDescription: item.description,
    diagnosticType: item.type,
    archivedType: item.type,
    diagnosticQuantity: item.quantity,
    archivedQuantity: item.quantity,
    diagnosticUnitPrice: item.unitPrice,
    archivedUnitPrice: item.unitPrice,
    diagnosticNetAmount: item.netAmount,
    archivedNetAmount: item.netAmount,
    diagnosticSuggestedNetPrice: item.suggestedNetPrice || item.quantity * item.unitPrice,
    archivedSuggestedNetPrice: item.suggestedNetPrice || item.quantity * item.unitPrice,
    diagnosticTax: item.tax,
    archivedTax: item.tax,
    diagnosticTaxAmount: item.taxAmount,
    archivedTaxAmount: item.taxAmount,
    diagnosticGrossAmount: item.grossAmount,
    archivedGrossAmount: item.grossAmount,
    diagnosticDiscount: item.discount ?? 0,
    diagnosticDiscountHidden: item.discount ?? 0,
    diagnosticDiscountAmountHidden: item.discountAmount ?? 0,
    archivedDiscount: item.discount ?? 0,
    archivedDiscountAmountHidden: item.discountAmount ?? 0,
    diagnosticTotalAmount: item.totalAmount ?? 0,
    archivedTotalAmount: item.totalAmount ?? 0,
    diagnosticMaterialStatus: item.status ?? "PENDING",
    archivedMaterialStatus: item.status ?? "ARCHIVED",
    diagnosticMaterialId: item.materialId ?? "",
    notBelongsToTool: item.notBelongsToTool ?? "",
  };
  return areaFields.reduce(
    (acc, field) => {
      acc[field.name] = mappingSubtype[field.subtype ?? ""] ?? field.defaultValue ?? "";
      return acc;
    },
    {} as Record<string, unknown>,
  );
};

/** Overlay status and type fields onto an existing values map from the current form state. */
function applyStatusAndTypeOverrides(
  baseValues: Record<string, unknown>,
  areaFields: Field[],
  item: Pick<MaterialItem, "status" | "type">,
  faultCodeDropdown: unknown,
): Record<string, unknown> {
  const result = { ...baseValues };
  const statusField = areaFields.find((f) => f.subtype === "diagnosticMaterialStatus");
  if (statusField && item.status !== undefined) {
    result[statusField.name] = item.status;
  }
  const typeField = areaFields.find((f) => f.subtype === "diagnosticType");
  if (typeField && !faultCodeDropdown) {
    result[typeField.name] = item.type;
  }
  return result;
}

function shouldReuseExistingRowValues(params: {
  rowIndex: number;
  currentCount: number;
  livePosition: string;
  expectedPosition: string;
  forceRebuild: boolean;
  rowHasNoPrices: boolean;
}): boolean {
  const { rowIndex, currentCount, livePosition, expectedPosition, forceRebuild, rowHasNoPrices } =
    params;
  if (rowIndex >= currentCount) return false;
  if (livePosition !== expectedPosition) return false;
  if (forceRebuild) return false;
  return !rowHasNoPrices;
}

export function buildMaterialsRowValues(params: {
  materials: MaterialItem[];
  areas: Area[];
  fields: Field[];
  formValues: Record<string, unknown>;
  currentCount: number;
  forceRebuild: boolean;
}): Record<string, unknown> {
  const { materials, areas, fields, formValues, currentCount, forceRebuild } = params;
  let rowValues: Record<string, unknown> = {};

  materials.forEach((item, idx) => {
    const area = areas[idx];
    if (!area) return;

    const areaFieldNameSet = new Set(area.fields.map((af) => af.name));
    const areaFields = fields.filter((f) => areaFieldNameSet.has(f.name));
    const positionField = areaFields.find((f) => f.subtype === "diagnosticPosition");
    const livePosition = positionField ? ((formValues[positionField.name] as string) ?? "") : "";
    const hasApiPrices = item.netAmount > 0 || item.grossAmount > 0 || item.totalAmount > 0;
    const rowHasNoPrices =
      Boolean(item.materialId) &&
      hasApiPrices &&
      areaFields
        .filter(
          (f) =>
            f.subtype === "diagnosticNetAmount" ||
            f.subtype === "diagnosticGrossAmount" ||
            f.subtype === "diagnosticTotalAmount" ||
            f.subtype === "diagnosticSuggestedNetPrice",
        )
        .every((f) => !Number(formValues[f.name]));

    const reuseExistingValues = shouldReuseExistingRowValues({
      rowIndex: idx,
      currentCount,
      livePosition,
      expectedPosition: item.position,
      forceRebuild,
      rowHasNoPrices,
    });

    if (reuseExistingValues) {
      const baseValues = Object.fromEntries(
        areaFields.filter((f) => f.name in formValues).map((f) => [f.name, formValues[f.name]]),
      );
      const existingValues = applyStatusAndTypeOverrides(
        baseValues,
        areaFields,
        item,
        formValues.faultCodeDropdown,
      );
      const descriptionField = areaFields.find((f) => f.subtype === "diagnosticDescription");
      if (descriptionField) {
        const currentDescription = existingValues[descriptionField.name];
        if (
          (typeof currentDescription !== "string" || !currentDescription.trim()) &&
          item.description
        ) {
          existingValues[descriptionField.name] = item.description;
        }
      }
      if (item.position === "LA") {
        const qtyField = areaFields.find((f) => f.subtype === "diagnosticQuantity");
        if (qtyField) {
          existingValues[qtyField.name] = item.quantity;
        }
      }
      rowValues = { ...rowValues, ...existingValues };
      return;
    }

    rowValues = { ...rowValues, ...buildRowValues(areaFields, item) };
  });

  return rowValues;
}

function withSpecialMaterialSpOption(params: {
  fields: Field[];
  rowValues: Record<string, unknown>;
  allowedPositions: AllowedPosition[];
  addSpecialMaterialsAllowed: boolean;
}): Field[] {
  const { fields, rowValues, allowedPositions, addSpecialMaterialsAllowed } = params;
  const spInAllowed = allowedPositions.some((p) => p.position === "SP");
  if (spInAllowed || !addSpecialMaterialsAllowed) {
    return fields;
  }

  const spPositionFieldNames = new Set(
    Object.entries(rowValues)
      .filter(([, v]) => v === "SP")
      .map(([k]) => k),
  );

  if (spPositionFieldNames.size === 0) {
    return fields;
  }

  const spOption: GenericOptionProps = { value: "SP", name: "SP" };
  return fields.map((f) => {
    if (f.subtype !== "diagnosticPosition" || !spPositionFieldNames.has(f.name)) return f;
    return { ...f, options: [...(f.options ?? []), spOption] };
  });
}

function removeArchivedArea(tab: Section, areaName: string): Section {
  if (tab.name !== "diagnosticData") return tab;
  return {
    ...tab,
    areas: tab.areas.filter((area) => area.name !== areaName),
  };
}

const SPARE_PARTS_PREFIX = "diagnosticData_diagnosticsSpareParts#";
const RESETTABLE_MATERIAL_STATUSES = new Set(["REVISED", "REJECTED"]);

/**
 * Rebuilds the full set of spare-parts Areas + Fields for `count` rows from a single
 * pristine template, every time — rather than incrementally cloning only the rows added
 * since the last pass and trimming only the rows removed from the end (the previous
 * design). Field names stay index-based (`#{i}_...`), same as today — `mapValuesToAPI`'s
 * numeric-index parsing (src/components/generics/utils.ts) is untouched. This is what lets
 * a delete-from-the-middle collapse into "remove the item from `materials`, recompute
 * everything" instead of "remove one area, then separately shift every subsequent area's
 * name/fields/values down by one" (see items-and-prices-refactor.md §7 for the full
 * rationale, including why field names stay index-based rather than a stable per-row id).
 */
export function deriveSparePartsAreasAndFields(
  templateArea: Area,
  count: number,
  sectionName: string,
): { areas: Area[]; fields: Field[] } {
  const areas: Area[] = [];
  let fields: Field[] = [];
  for (let i = 0; i < count; i++) {
    const cloned = structuredClone(templateArea);
    if (i !== 0) cloned.label = "";
    const area = setDuplicatedArea(cloned, i, sectionName);
    area.fields = area.fields.map((f) => mapFieldToFieldMapping(f));
    areas.push(area);
    fields = [...fields, ...area.fields];
  }
  return { areas, fields };
}

const syncMaterialsWithForm = (materials: MaterialItem[], formValues: Record<string, unknown>) => {
  const syncedMaterials = materials.map((materialItem, index) => {
    return {
      ...materialItem,
      description:
        (formValues[`${SPARE_PARTS_PREFIX}${index}_description`] as string) ??
        materialItem.description,
      discount:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_discount`]) || materialItem.discount,
      totalAmount:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_totalAmount`]) || materialItem.totalAmount,
      grossAmount:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_grossAmount`]) || materialItem.grossAmount,
      partNumber:
        (formValues[`${SPARE_PARTS_PREFIX}${index}_sparePartNumber`] as string) ??
        materialItem.partNumber,
      position:
        (formValues[`${SPARE_PARTS_PREFIX}${index}_position`] as string) ?? materialItem.position,
      quantity:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_quantity`]) || materialItem.quantity,
      tax: Number(formValues[`${SPARE_PARTS_PREFIX}${index}_tax`]) || materialItem.tax,
      netAmount:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_netAmount`]) || materialItem.netAmount,
      type: (formValues[`${SPARE_PARTS_PREFIX}${index}_type`] as string) ?? materialItem.type,
      unitPrice:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_unitPrice`]) || materialItem.unitPrice,
    };
  });
  return syncedMaterials;
};

// ── Hook ───────────────────────────────────────────────────────────────────

interface UseDiagnosticsManagerProps {
  diagnosticData:
    | { jobId?: string; materials?: unknown[]; archivedMaterials?: unknown[] }
    | undefined;
  currentActionType: string;
  currentJobType: string;
  tabs: Section[];
  setTabs: React.Dispatch<React.SetStateAction<Section[]>>;
  allFields: Field[] | null;
  setAllFields: React.Dispatch<React.SetStateAction<Field[] | null>>;
  setInitialFormValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  skipFormResetRef: RefObject<boolean>;
  formValuesRef: RefObject<Record<string, unknown>>;
  arePricesValidated: boolean;
  setArePricesValidated: React.Dispatch<React.SetStateAction<boolean>>;
  /** When set, will be flipped to true during initial load when all materials have IDs (prices from DB). */
  isResyncingRef?: RefObject<boolean>;
  /** When true, Effect 2 (rule-change rebuild) is skipped so API-loaded materials are preserved. */
  readOnly?: boolean;
  jobStatus?: string;
}

export interface UseDiagnosticsManagerReturn {
  materials: MaterialItem[];
  apiMaterialsLoaded: boolean;
  apiMaterialsEmpty: boolean;
  hasExistingDiagnostic: boolean;
  setMaterials: React.Dispatch<React.SetStateAction<MaterialItem[]>>;
  allowedPositions: AllowedPosition[];
  automaticRows: string[];
  positionDropdownOptions: GenericOptionProps[];
  addSpecialMaterialsAllowed: boolean;
  discountBase: discountBase;
  getPositionConfig: (position: string) => AllowedPosition | undefined;
  getQuantityForPosition: (
    position: string,
    faultCodeValue?: string,
    faultCodeLabourQuantity?: number,
  ) => number | undefined;
  onAddRow: (formValues?: Record<string, unknown>) => void;
  onDeleteRow: (areaName: string) => void;
  onRestoreRow: (areaName: string) => void;
  onAddMaterials: (
    items: ImportedMaterial[],
    setFieldValue?: (field: string, value: unknown) => void,
  ) => void;
  getExistingPartNumbers: (formValues: Record<string, unknown>) => Set<string>;
  markAllValidated: () => void;
  markRowDirty: (areaIndex: number) => void;
  enableValidate: () => boolean;
  resyncMaterialsFromAPI: (markValidated?: boolean) => void;
  setRevisedRejectedRowPending: (areaName: string) => void;
  canArchiveOnDelete: boolean;
}

export interface ImportedMaterial {
  position?: string;
  partNumber: string;
  description?: string;
  type?: string;
  quantity?: number;
  unitPrice?: number | null;
  origin?: "specialMaterial" | "explosionDrawing";
}

/** Statuses where row deletion is permanent (no archiving). */
export const STATUSES_WITH_PERMANENT_DELETE = ["IN_DIAGNOSTICS"];

export const useDiagnosticsManager = ({
  diagnosticData,
  currentActionType,
  currentJobType,
  tabs,
  setTabs,
  allFields,
  setAllFields,
  setInitialFormValues,
  skipFormResetRef,
  formValuesRef,
  arePricesValidated,
  setArePricesValidated,
  isResyncingRef,
  readOnly = false,
  jobStatus = "",
}: UseDiagnosticsManagerProps): UseDiagnosticsManagerReturn => {
  const queryClient = useQueryClient();
  const { setMessages } = useContext(MessagesContext);

  // ── Country config ───────────────────────────────────────────────────────
  const userData = queryClient.getQueryData<HeaderUserData>(["user"]);
  const countryConfiguration = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    userData?.countryCode,
  ]);
  const diagnosticsConfiguration = countryConfiguration?.diagnosticsConfiguration;

  const hasDiagnosticsConfig = Boolean(diagnosticsConfiguration);
  const discountBase: discountBase =
    countryConfiguration?.diagnosticsConfiguration?.discountBase ?? "NET_PRICE";

  const matchedRule = (diagnosticsConfiguration?.rules ?? []).find(
    (e) => e.actionType === currentActionType && e.jobType === currentJobType,
  )?.rule;

  const userPermissions = userData?.permissions ?? [];
  const hasPermission = (permission: string): boolean => userPermissions.includes(permission);

  // resolveAllowedPositions/resolveAutomaticRows are a pure extraction of the same
  // actionType+jobType rule lookup performed inline above — behaviorally identical today,
  // gated by ENABLE_ITEM_RULES_RESOLVER as a single rollback lever (see itemRulesResolver.ts).
  const rawAllowedPositions: AllowedPosition[] = ENABLE_ITEM_RULES_RESOLVER
    ? resolveAllowedPositions(
        diagnosticsConfiguration?.rules ?? [],
        currentActionType,
        currentJobType,
      )
    : (matchedRule?.allowedPositions ?? []);
  const allowedPositions: AllowedPosition[] = rawAllowedPositions.filter((p) => {
    const requiredPermission =
      POSITION_VIEW_PERMISSIONS[p.position as keyof typeof POSITION_VIEW_PERMISSIONS];
    if (!requiredPermission) return true;
    return hasPermission(requiredPermission);
  });
  const automaticRows: string[] = ENABLE_ITEM_RULES_RESOLVER
    ? resolveAutomaticRows(
        diagnosticsConfiguration?.rules ?? [],
        currentActionType,
        currentJobType,
      )
    : (matchedRule?.automaticRows ?? []);
  const addSpecialMaterialsAllowed =
    (diagnosticsConfiguration?.addSpecialMaterialsAllowed &&
      formValuesRef.current["actionType"] !== "NEW_TOOL_EXCHANGE" &&
      formValuesRef.current["actionType"] !== "SPARE_PARTS_EXCHANGE" &&
      formValuesRef.current["actionType"] !== "ACCESSORIES_EXCHANGE") ??
    false;

  const positionDropdownOptions = useMemo<GenericOptionProps[]>(
    () =>
      [...allowedPositions]
        .sort(
          (a, b) =>
            (POSITION_ORDER[a.position] ?? Number.MAX_SAFE_INTEGER) -
            (POSITION_ORDER[b.position] ?? Number.MAX_SAFE_INTEGER),
        )
        .map((p) => ({ value: p.position, name: p.position })),
    [allowedPositions],
  );

  const getPositionConfig = useCallback(
    (position: string) => allowedPositions.find((p) => p.position === position),
    [allowedPositions],
  );

  const resolveFaultCodesQuantity = useCallback(
    (
      position: string,
      quantitySource: string | null,
      faultCodeValue: string | undefined,
      faultCodeLabourQuantity: number | undefined,
      defaultQuantity: number | null,
    ): number | undefined => {
      const fallback = defaultQuantity ?? undefined;
      if (quantitySource === (QuantitySource.DEFAULT as string)) {
        return fallback;
      }
      if (
        position === "LA" &&
        faultCodeLabourQuantity !== undefined &&
        faultCodeLabourQuantity !== 0
      )
        return faultCodeLabourQuantity;
      if (!faultCodeValue) return fallback;
      const parts = faultCodeValue.split(":");
      if (parts.length > 1) {
        const parsed = Number(parts[1]);
        return Number.isNaN(parsed) ? fallback : parsed;
      }
      return fallback;
    },
    [],
  );

  const getQuantityForPosition = useCallback(
    (
      position: string,
      faultCodeValue?: string,
      faultCodeLabourQuantity?: number,
    ): number | undefined => {
      const posConfig = allowedPositions.find((p) => p.position === position);
      if (!posConfig) return undefined;
      const source = posConfig.quantity.quantitySource;
      if (source === (QuantitySource.USER as string)) return undefined;
      if (source === (QuantitySource.DEFAULT as string))
        return posConfig.quantity.defaultQuantity ?? undefined;
      if (source === (QuantitySource.FAULT_CODES as string)) {
        return resolveFaultCodesQuantity(
          position,
          source,
          faultCodeValue,
          faultCodeLabourQuantity,
          posConfig.quantity.defaultQuantity,
        );
      }
      return posConfig.quantity.defaultQuantity ?? undefined;
    },
    [allowedPositions, resolveFaultCodesQuantity],
  );

  // ── Source-of-truth list ─────────────────────────────────────────────────
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [archivedMaterials, setArchivedMaterials] = useState<MaterialItem[]>([]);
  const [apiMaterialsLoaded, setApiMaterialsLoaded] = useState(false);
  const [apiMaterialsEmpty, setApiMaterialsEmpty] = useState(false);
  const hasExistingDiagnostic = Boolean(diagnosticData?.jobId);

  // Stable refs so effects don't re-run when callbacks change
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const allFieldsRef = useRef(allFields);
  allFieldsRef.current = allFields;
  const allowedPositionsRef = useRef(allowedPositions);
  allowedPositionsRef.current = allowedPositions;
  const userPermissionsRef = useRef(userPermissions);
  userPermissionsRef.current = userPermissions;
  const automaticRowsRef = useRef(automaticRows);
  automaticRowsRef.current = automaticRows;
  const getQuantityForPositionRef = useRef(getQuantityForPosition);
  getQuantityForPositionRef.current = getQuantityForPosition;
  const addSpecialMaterialsAllowedRef = useRef(addSpecialMaterialsAllowed);
  addSpecialMaterialsAllowedRef.current = addSpecialMaterialsAllowed;
  const discountBaseRef = useRef(discountBase);
  discountBaseRef.current = discountBase;

  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const tRef = useRef(t);
  tRef.current = t;

  const hasSyncedFromAPIRef = useRef(false);
  const hasSyncedArchivedRef = useRef(false);
  const forceRebuildRef = useRef(false);
  const archivedForceRebuildRef = useRef(false);
  const jobStatusRef = useRef(jobStatus);
  jobStatusRef.current = jobStatus;
  /** Counts rows archived by user deletion since the last validate call. */
  const pendingArchivedDeletionsRef = useRef(0);
  const shouldMarkValidatedRef = useRef(false);
  const prevRuleKeyRef = useRef("");
  const prAutofillAppliedRef = useRef(false);
  const materialsRef = useRef(materials);
  materialsRef.current = materials;
  const archivedMaterialsRef = useRef(archivedMaterials);
  archivedMaterialsRef.current = archivedMaterials;
  const archivedTemplateRef = useRef<Area | null>(null);
  // Cached once so every full derivation pass (see deriveSparePartsAreasAndFields) starts
  // from a stable, pristine shape rather than re-reading whatever accumulated mutations
  // sparePartsAreas[0] happens to carry from a previous render.
  const sparePartsTemplateRef = useRef<Area | null>(null);

  const baretoolNumberField = allFields?.find((x) => x.subtype === "baretoolNumber");
  const baretoolNumber = baretoolNumberField
    ? (formValuesRef.current[baretoolNumberField.name] as string | undefined)
    : undefined;
  // ── Bare-sales-relation query (PN row autofill) ───────────────────────────
  const countryCode = userData?.countryCode ?? "";
  const language = userData?.language?.toUpperCase() || "EN";
  const { data: bareSalesData } = useBareSalesRelation(
    { bareTool: baretoolNumber ?? "", countryCode, language },
    {
      enabled:
        !!(baretoolNumber && countryCode) &&
        userData?.type !== "BOSCH_INTERNAL" &&
        PREAPPROVAL_ACTION_TYPES.has(currentActionType),
    },
  );
  const bareSalesDataRef = useRef(bareSalesData);
  bareSalesDataRef.current = bareSalesData;

  const mapPrice = (
    m: Record<string, unknown>,
    position: string,
    description: string,
    price: Record<string, unknown>,
    mode: discountBase,
  ) => {
    const quantity = Number(m.quantity) || 1;
    const unitPrice = Number(price.unitPrice) || 0;
    const taxPercent = Number(price.tax) || 0;
    const discountPercent = Number(price.discount) || 0;

    const calculated = calculatePrices(
      {
        quantity,
        unitPrice,
        taxPercent,
        discountPercent,
        suggestedNetPrice: 0,
        netAmount: 0,
        grossAmount: 0,
        totalAmount: 0,
        taxAmount: 0,
      },
      "unitPrice",
      unitPrice,
      mode,
    );

    return {
      position,
      partNumber: (m.partNumber as string) ?? "",
      description,
      type: (m.jobType as string) ?? "",
      quantity,
      unitPrice,
      netAmount: calculated.netAmount,
      tax: taxPercent,
      taxAmount: calculated.taxAmount,
      grossAmount: calculated.grossAmount,
      discount: calculated.discountPercent,
      discountAmount: calculated.discountAmount,
      totalAmount: calculated.totalAmount,
      suggestedNetPrice: calculated.suggestedNetPrice,
      status: (m.status as string) ?? undefined,
      materialId: (m.id as string) ?? undefined,
      isValidated: shouldMarkValidatedRef.current,
      order: Number(m.order) || 0,
      notBelongsToTool: (m.notBelongsToTool as boolean) ?? undefined,
      isPriceSetManually: false,
    };
  };
  // Reset on new job
  useEffect(() => {
    hasSyncedFromAPIRef.current = false;
    hasSyncedArchivedRef.current = false;
    prevRuleKeyRef.current = "";
    prAutofillAppliedRef.current = false;
    setApiMaterialsLoaded(false);
    setApiMaterialsEmpty(false);
    setMaterials([]);
    setArchivedMaterials([]);
  }, [diagnosticData?.jobId]);

  useEffect(() => {
    if (!diagnosticData) return;
    setApiMaterialsLoaded(true);
    const apiMaterials = diagnosticData.materials;
    setApiMaterialsEmpty(!apiMaterials || apiMaterials.length === 0);
  }, [diagnosticData]);

  // ── Effect 1: API data → materials list ───────────────────────────────────
  useEffect(() => {
    const apiMaterials = diagnosticData?.materials as Array<Record<string, unknown>> | undefined;
    if (!apiMaterials?.length || hasSyncedFromAPIRef.current) return;

    hasSyncedFromAPIRef.current = true;

    const autofill = getPositionAutofill(tRef.current);
    const items: MaterialItem[] = apiMaterials.map((m) => {
      const position = (m.position as string) ?? "";
      const price = (m.price as Record<string, unknown>) ?? {};
      const description = autofill[position]?.description ?? (m.description as string) ?? "";
      return mapPrice(m, position, description, price, discountBaseRef.current);
    });
    shouldMarkValidatedRef.current = false;

    // If every material already has an ID it was previously validated — prices exist in DB.
    // Mark rows as validated so prices are visible, but always keep arePricesValidated=false
    // on page load so the user must explicitly click Validate before proceeding.
    const allHaveIds = items.every((item) => !!item.materialId);
    if (allHaveIds) {
      items.forEach((item) => {
        item.isValidated = true;
      });
      // Set isResyncingRef so useSparePartPriceCalculation skips recalculation during
      // Formik reinitialization, preventing onUserEdit from zeroing out prices or
      // calling markRowDirty which would flip arePricesValidated back to false.
      if (isResyncingRef) {
        isResyncingRef.current = true;
      }
    }

    // Bug 6 fix: preserve tax for in-progress rows not yet returned by the API
    const mergedItems = items.map((item) => {
      if (item.materialId) return item; // API-sourced, use API tax
      const existing = materialsRef.current.find(
        (m) => m.position === item.position && !m.materialId,
      );
      if (existing && existing.tax > 0 && item.tax === 0) {
        return { ...item, tax: existing.tax };
      }
      return item;
    });

    // Signal Effect 3 to force a full rebuild so field components always
    // re-render with fresh API data, even when the row count hasn't changed.
    forceRebuildRef.current = true;
    setMaterials(sortMaterialsByOrder(mergedItems));
  }, [diagnosticData, isResyncingRef, setArePricesValidated]);

  // ── Effect 1b: API archived data → archivedMaterials list ─────────────────
  useEffect(() => {
    const apiArchived = diagnosticData?.archivedMaterials as
      | Array<Record<string, unknown>>
      | undefined;
    if (!apiArchived?.length || hasSyncedArchivedRef.current) return;

    hasSyncedArchivedRef.current = true;

    const items: MaterialItem[] = apiArchived.map((m) => {
      const position = (m.position as string) ?? "";
      const price = (m.price as Record<string, unknown>) ?? {};
      const description = (m.description as string) ?? "";
      return mapPrice(m, position, description, price, discountBaseRef.current);
    });

    archivedForceRebuildRef.current = true;
    setArchivedMaterials(items);
  }, [diagnosticData]);

  // ── Effect 2: Rule change → rebuild materials list ────────────────────────
  useEffect(() => {
    if (readOnly) return;
    if (!currentActionType || !currentJobType) return;
    const ruleKey = `${currentActionType}__${currentJobType}`;
    const isFirstApplication = prevRuleKeyRef.current === "";
    const isSparePartsExchange = currentActionType === "SPARE_PARTS_EXCHANGE";

    // If country config hasn't loaded yet AND no API data has arrived, defer.
    // We do NOT commit prevRuleKeyRef so that when hasDiagnosticsConfig flips to
    // true (and this effect re-fires via the dep below) we apply the correct rules.
    if (!hasDiagnosticsConfig && !hasSyncedFromAPIRef.current) return;

    if (prevRuleKeyRef.current === ruleKey) return;
    prevRuleKeyRef.current = ruleKey;

    const hasMaterialWithoutId =
      (diagnosticData?.materials as Array<{ id?: unknown }> | undefined)?.some(
        (material) => !material?.id,
      ) ?? false;

    // If API data already populated the list, skip on first application
    if (isFirstApplication && hasSyncedFromAPIRef.current && !hasMaterialWithoutId) return;
    // Hide price fields whenever the rule changes so the user must re-validate
    setArePricesValidated(false);

    const allowed = allowedPositionsRef.current;
    const automatic = automaticRowsRef.current;
    const allowedSet = new Set(allowed.map((p) => p.position));
    const faultCode = (formValuesRef.current.faultCode as string) ?? "";
    const faultCodeLabourQty = Number(formValuesRef.current.faultCodeLabourQuantity) || 0;

    setMaterials((prev) => {
      // Build fresh from automatic rows only.
      const positionsToAdd = sortByPositionOrder(automatic.filter((pos) => allowedSet.has(pos)));
      const automaticItems = positionsToAdd.map((pos) => {
        const qty = getQuantityForPositionRef.current(pos, faultCode, faultCodeLabourQty) ?? 1;
        const item = buildEmptyMaterial(
          pos,
          currentJobType,
          qty,
          tRef.current,
          discountBaseRef.current,
        );
        if (pos === "PN") {
          prAutofillAppliedRef.current = false;
          const salesData = bareSalesDataRef.current;
          if (salesData?.salesSku) {
            prAutofillAppliedRef.current = true;
            return { ...item, partNumber: salesData.salesSku, description: salesData.desc ?? "" };
          }
        }
        return item;
      });

      const spInAllowed = allowedSet.has("SP");
      const preservedSpRows = prev.filter((item) => {
        if (item.position !== "SP") return false;
        if (item.origin === "specialMaterial") return addSpecialMaterialsAllowedRef.current;
        if (item.origin === "explosionDrawing") return spInAllowed;
        return false;
      });

      const rebuiltItems = [...automaticItems, ...preservedSpRows];

      if (isSparePartsExchange) {
        let seenSpRow = false;
        return normalizeMaterialOrders(
          rebuiltItems.filter((item) => {
            if (item.position !== "SP") return true;
            if (seenSpRow) return false;
            seenSpRow = true;
            return true;
          }),
        );
      }

      return normalizeMaterialOrders(rebuiltItems);
    });
  }, [
    readOnly,
    currentActionType,
    currentJobType,
    diagnosticData?.materials,
    formValuesRef,
    setArePricesValidated,
    hasDiagnosticsConfig,
  ]);

  // ── Effect 2b: bare-sales-relation data → apply to PN row when it arrives late ──
  useEffect(() => {
    if (!bareSalesData?.salesSku) return;
    if (prAutofillAppliedRef.current) return;

    const currentMaterials = materialsRef.current;
    const pnIndex = currentMaterials.findIndex((m) => m.position === "PN");
    if (pnIndex === -1 || currentMaterials[pnIndex].partNumber) return;

    prAutofillAppliedRef.current = true;
    forceRebuildRef.current = true;
    setMaterials((prev) => {
      const idx = prev.findIndex((m) => m.position === "PN");
      if (idx === -1) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        partNumber: bareSalesData.salesSku,
        description: bareSalesData.desc ?? "",
      };
      return normalizeMaterialOrders(updated);
    });
  }, [bareSalesData]);

  // ── Effect 3: materials[] → areas + allFields + initialFormValues ─────────
  // Full recomputation on every materials change (see deriveSparePartsAreasAndFields) —
  // not an incremental add-N/trim-N patch. A delete-from-the-middle is just "materials
  // shrank by one"; this effect doesn't need to know or care which index disappeared.
  useEffect(() => {
    if (materials.length === 0) return;

    const currentTabs = tabsRef.current;
    const currentFields = allFieldsRef.current ?? [];

    const diagnosticTab = currentTabs.find((t) => t.name === "diagnosticData");
    if (!diagnosticTab) return;

    const sparePartsAreas = diagnosticTab.areas.filter(
      (a) => a.isMultiple && a.name.includes("diagnosticsSpareParts"),
    );
    // Cache the pristine template once, mirroring archivedTemplateRef below — every
    // derivation pass clones from this, never from whatever sparePartsAreas[0] currently is.
    if (sparePartsAreas.length > 0) {
      sparePartsTemplateRef.current ??= structuredClone(sparePartsAreas[0]);
    }
    const templateArea = sparePartsTemplateRef.current;
    if (!templateArea) return;

    const currentCount = sparePartsAreas.length;
    const targetCount = materials.length;
    const countChanged = currentCount !== targetCount;

    const { areas: derivedAreas, fields: derivedFields } = deriveSparePartsAreasAndFields(
      templateArea,
      targetCount,
      diagnosticTab.name,
    );

    const nonSparePartsFields = currentFields.filter(
      (f) => !f.name.includes("diagnosticsSpareParts"),
    );
    let updatedFields = [...nonSparePartsFields, ...derivedFields];

    const rowValues = buildMaterialsRowValues({
      materials,
      areas: derivedAreas,
      fields: updatedFields,
      formValues: formValuesRef.current,
      currentCount,
      forceRebuild: forceRebuildRef.current,
    });

    if (countChanged || forceRebuildRef.current) {
      skipFormResetRef.current = true;

      updatedFields = withSpecialMaterialSpOption({
        fields: updatedFields,
        rowValues,
        allowedPositions: allowedPositionsRef.current,
        addSpecialMaterialsAllowed: addSpecialMaterialsAllowedRef.current,
      });

      const sparePartsFieldsFinal = updatedFields.filter((f) =>
        f.name.includes("diagnosticsSpareParts"),
      );

      // Use functional updaters so this composes correctly with any concurrent
      // functional setter from useClaimMaterialsManager (or any other hook)
      // that shares the same setAllFields / setTabs.
      setAllFields((prev) => {
        const prevWithoutSpareParts = (prev ?? []).filter(
          (f) => !f.name.includes("diagnosticsSpareParts"),
        );
        return [...prevWithoutSpareParts, ...sparePartsFieldsFinal];
      });
      setTabs((prev) =>
        prev.map((tab) =>
          tab.name === "diagnosticData"
            ? {
                ...tab,
                areas: [
                  ...tab.areas.filter(
                    (a) => !(a.isMultiple && a.name.includes("diagnosticsSpareParts")),
                  ),
                  ...derivedAreas,
                ],
              }
            : tab,
        ),
      );
    }

    if (forceRebuildRef.current) {
      // Strip every diagnosticsSpareParts-prefixed key from prev before merging in the
      // freshly-derived rowValues (which only ever has entries for the current row count) —
      // otherwise a row count decrease (e.g. deleting the last row) would leave that row's
      // now-orphaned keys sitting in Formik state indefinitely. Full-derivation replaces
      // what onDeleteRow used to guarantee via its own separate full-replace call.
      setInitialFormValues((prev) => {
        const prevWithoutRowFields = Object.fromEntries(
          Object.entries(prev).filter(
            ([k]) => !k.startsWith("diagnosticData_diagnosticsSpareParts"),
          ),
        );
        return { ...prevWithoutRowFields, ...rowValues };
      });
    } else {
      const currentFormWithoutRowFields = Object.fromEntries(
        Object.entries(formValuesRef.current).filter(
          ([k, v]) =>
            !k.startsWith("diagnosticData_diagnosticsSpareParts") &&
            v !== "" &&
            v !== null &&
            v !== undefined,
        ),
      );
      setInitialFormValues((prev) => ({ ...prev, ...currentFormWithoutRowFields, ...rowValues }));
    }
    forceRebuildRef.current = false;
  }, [materials, setAllFields, setTabs, setInitialFormValues, formValuesRef, skipFormResetRef]);
  // ── Effect 3b: archivedMaterials[] → areas + allFields + initialFormValues ───
  useEffect(() => {
    if (archivedMaterials.length === 0) return;

    const currentTabs = tabsRef.current;
    const diagnosticTab = currentTabs.find((t) => t.name === "diagnosticData");
    if (!diagnosticTab) return;

    const archivedAreas = diagnosticTab.areas.filter(
      (a) => a.isMultiple && a.name.includes("archivedSpareParts"),
    );
    // Cache the template area the first time we see it so we can recreate
    // archived rows even after onRestoreRow removes the last area from tabs.
    if (archivedAreas.length > 0) {
      archivedTemplateRef.current ??= structuredClone(archivedAreas[0]);
    }
    const templateArea = archivedAreas[0] ?? archivedTemplateRef.current;
    if (!templateArea) return;

    const currentCount = archivedAreas.length;
    const targetCount = archivedMaterials.length;
    const needed = targetCount - currentCount;

    const ALL_POSITION_OPTIONS: GenericOptionProps[] = Object.keys(POSITION_ORDER).map((pos) => ({
      value: pos,
      name: pos,
    }));

    // Build new area templates if needed
    const newAreasAndFields: { area: Area; fields: Field[] }[] = [];
    if (needed > 0) {
      const baseIndex =
        archivedAreas.length === 0
          ? -1
          : archivedAreas.reduce((max, a) => Math.max(max, a.index ?? 0), 0);
      for (let i = 0; i < needed; i++) {
        const cloned = structuredClone(templateArea);
        // Preserve the label only for the first area (#0) — ArchivedSparePartsArea
        // uses area.label for the section title and only renders it for isFirstArea (#0).
        if (baseIndex + 1 + i !== 0) cloned.label = "";
        const area = setDuplicatedArea(cloned, baseIndex + 1 + i, diagnosticTab.name);
        const areaFields = area.fields.map((f) => mapFieldToFieldMapping(f));
        newAreasAndFields.push({ area, fields: areaFields });
      }
    }

    const allArchivedAreas = [...archivedAreas, ...newAreasAndFields.map((x) => x.area)];
    const newFieldsToAdd = newAreasAndFields.flatMap((x) => x.fields);

    // Compute form values for all archived rows
    const existingArchivedFields = (allFieldsRef.current ?? []).filter((f) =>
      f.name.includes("archivedSpareParts"),
    );
    const allArchivedFields = [...existingArchivedFields, ...newFieldsToAdd];
    let rowValues: Record<string, unknown> = {};
    archivedMaterials.forEach((item, idx) => {
      const area = allArchivedAreas[idx];
      if (!area) return;
      const areaFieldNameSet = new Set(area.fields.map((af) => af.name));
      const areaFields = allArchivedFields.filter((f) => areaFieldNameSet.has(f.name));
      rowValues = { ...rowValues, ...buildRowValues(areaFields, item) };
    });

    if (needed !== 0 || archivedForceRebuildRef.current) {
      skipFormResetRef.current = true;
      // Use functional update so this composes correctly with Effect 3's setAllFields call
      setAllFields((prev) => {
        const fields = [...(prev ?? []), ...newFieldsToAdd];
        return fields.map((f) => {
          if (f.subtype !== "archivedPosition") return f;
          if ((f.options?.length ?? 0) > 0) return f;
          return { ...f, options: ALL_POSITION_OPTIONS };
        });
      });
      if (needed !== 0) {
        const newAreas = newAreasAndFields.map((x) => x.area);
        setTabs((prev) =>
          prev.map((tab) =>
            tab.name === "diagnosticData" ? { ...tab, areas: [...tab.areas, ...newAreas] } : tab,
          ),
        );
      }
    }

    setInitialFormValues((prev) => ({ ...prev, ...rowValues }));
    archivedForceRebuildRef.current = false;
  }, [
    archivedMaterials,
    setAllFields,
    setTabs,
    setInitialFormValues,
    formValuesRef,
    skipFormResetRef,
  ]);
  // ── Sync field options when positionDropdownOptions change ────────────────
  useEffect(() => {
    if (positionDropdownOptions.length === 0 || !allFields || allFields.length === 0) return;

    const spInOptions = positionDropdownOptions.some((o) => o.value === "SP");
    const spOption: GenericOptionProps = { value: "SP", name: "SP" };

    const updated = allFields.map((f) => {
      // Archived position fields use subtype "archivedPosition" and are not affected here
      if (f.subtype !== "diagnosticPosition") return f;
      // Claims tab fields are managed by ClaimContext, not by this hook
      if (f.name.startsWith("claims_")) return f;

      const currentValue = formValuesRef.current[f.name] as string;
      const options =
        !spInOptions && addSpecialMaterialsAllowedRef.current && currentValue === "SP"
          ? [...positionDropdownOptions, spOption]
          : positionDropdownOptions;
      return { ...f, options };
    });

    const changed = updated.some((f, i) => {
      if (f === allFields[i]) return false;
      if (f.subtype === "diagnosticPosition") {
        return JSON.stringify(f.options) !== JSON.stringify(allFields[i]?.options);
      }
      return true;
    });
    if (!changed) return;

    skipFormResetRef.current = true;
    setAllFields(updated);
    setTabs((prev) => syncFieldsToTabs(prev, updated));
  }, [positionDropdownOptions, allFields, setAllFields, setTabs, formValuesRef, skipFormResetRef]);

  // ── Public callbacks ──────────────────────────────────────────────────────

  const onAddRow = useCallback((formValues?: Record<string, unknown>) => {
    if (!formValues) return;
    const perms = userPermissionsRef.current;
    const hasPositionPermission = (position: string): boolean => {
      const required =
        POSITION_INSERT_PERMISSIONS[position as keyof typeof POSITION_INSERT_PERMISSIONS];
      if (!required) return true;
      return perms.includes(required);
    };
    const allowed = allowedPositionsRef.current.filter((p) => hasPositionPermission(p.position));
    if (allowed.length > 0) {
      const current = allFieldsRef.current ?? [];
      const positionCounts: Record<string, number> = {};
      current
        .filter((f) => f.subtype === "diagnosticPosition")
        .forEach((f) => {
          const val = formValues[f.name] as string;
          if (val) positionCounts[val] = (positionCounts[val] ?? 0) + 1;
        });
      const totalRows = Object.values(positionCounts).reduce((s, c) => s + c, 0);
      const maxTotal = allowed.reduce((s, p) => s + p.maxCount, 0);
      if (totalRows >= maxTotal) return;
    }

    const current = allFieldsRef.current ?? [];
    const positionCounts: Record<string, number> = {};
    current
      .filter((f) => f.subtype === "diagnosticPosition")
      .forEach((f) => {
        const val = formValues[f.name] as string;
        if (val) positionCounts[val] = (positionCounts[val] ?? 0) + 1;
      });

    const nextPosition =
      [...allowed]
        .sort(
          (a, b) =>
            (POSITION_ORDER[a.position] ?? Number.MAX_SAFE_INTEGER) -
            (POSITION_ORDER[b.position] ?? Number.MAX_SAFE_INTEGER),
        )
        .find((p) => (positionCounts[p.position] ?? 0) < p.maxCount)?.position ?? "";

    const qty = nextPosition
      ? (getQuantityForPositionRef.current(
          nextPosition,
          (formValues.faultCode as string) ?? "",
          Number(formValues.faultCodeLabourQuantity) || 0,
        ) ?? 1)
      : 1;

    // Bug 6 fix: use tax from existing validated rows as default for new rows
    const defaultTax = materialsRef.current.find((m) => m.tax > 0)?.tax ?? 0;
    const newItem = {
      ...buildEmptyMaterial(nextPosition, "", qty, tRef.current, discountBaseRef.current),
      tax: defaultTax,
    };

    setMaterials((prev) => {
      const syncedMaterials = syncMaterialsWithForm(prev, formValues);
      return normalizeMaterialOrders([...syncedMaterials, newItem]);
    });
  }, []);

  const onDeleteRow = useCallback(
    (areaName: string) => {
      const currentTabs = tabsRef.current;
      const diagnosticTab = currentTabs.find((t) => t.name === "diagnosticData");
      if (!diagnosticTab) return;

      const sparePartsAreas = diagnosticTab.areas.filter(
        (a) => a.isMultiple && a.name.includes("diagnosticsSpareParts"),
      );
      const areaIndex = sparePartsAreas.findIndex((a) => a.name === areaName);
      if (areaIndex === -1) return;

      // Archive the row when the current status is not in the permanent-delete set
      if (!STATUSES_WITH_PERMANENT_DELETE.includes(jobStatusRef.current)) {
        const syncedMaterials = syncMaterialsWithForm(materialsRef.current, formValuesRef.current);
        const deletedMaterial = syncedMaterials[areaIndex];
        if (deletedMaterial) {
          archivedForceRebuildRef.current = true;
          pendingArchivedDeletionsRef.current += 1;
          setArchivedMaterials((prev) => [...prev, deletedMaterial]);
        }
      }

      // Effect 3 fully recomputes every row's Area/Field/value set from `materials` on
      // every change (see deriveSparePartsAreasAndFields) — this only needs to update
      // materials itself; forceRebuildRef makes Effect 3 rebuild every row's values fresh
      // from domain data rather than trying to reuse now-stale live form values for
      // whichever row(s) shifted into a new position.
      forceRebuildRef.current = true;
      setMaterials((prev) => {
        const syncedMaterials = syncMaterialsWithForm(prev, formValuesRef.current);
        const updatedMaterials = syncedMaterials.filter((_, i) => i !== areaIndex);
        return normalizeMaterialOrders(updatedMaterials);
      });
      setArePricesValidated(false);
    },
    [setArePricesValidated],
  );

  const onAddMaterials = useCallback(
    (items: ImportedMaterial[]) => {
      const existingPartNumbers = new Set(
        (allFieldsRef.current ?? [])
          .filter((f) => f.subtype === "diagnosticPartNumber")
          .map((f) => formValuesRef.current[f.name] as string)
          .filter(Boolean),
      );

      const toAdd: MaterialItem[] = items
        .filter((m) => !existingPartNumbers.has(m.partNumber))
        .map((m) => {
          const base: MaterialItem = {
            position: m.position ?? "",
            partNumber: m.partNumber,
            description: m.description ?? "",
            type: m.type ?? (formValuesRef.current.jobType as string) ?? "",
            quantity: m.quantity ?? 1,
            unitPrice: m.unitPrice ?? 0,
            netAmount: 0,
            tax: 0,
            taxAmount: 0,
            grossAmount: 0,
            discount: 0,
            totalAmount: 0,
            origin: m.origin,
          };
          return computePricesForItem(base, discountBaseRef.current);
        });

      if (toAdd.length === 0) return;
      const incomingPositions = new Set(toAdd.map((m) => m.position).filter(Boolean));
      setMaterials((prev) => {
        const syncedMaterials = syncMaterialsWithForm(prev, formValuesRef.current);

        return normalizeMaterialOrders([
          ...syncedMaterials.filter(
            (m) => !(m.partNumber === "" && incomingPositions.has(m.position)),
          ),
          ...toAdd,
        ]);
      });
    },
    [formValuesRef],
  );

  const onRestoreRow = useCallback(
    (areaName: string) => {
      const syncedMaterials = syncMaterialsWithForm(materials, formValuesRef.current);
      const currentTabs = tabsRef.current;
      const diagnosticTab = currentTabs.find((t) => t.name === "diagnosticData");
      if (!diagnosticTab) return;

      const archivedAreas = diagnosticTab.areas.filter(
        (a) => a.isMultiple && a.name.includes("archivedSpareParts"),
      );
      const areaIndex = archivedAreas.findIndex((a) => a.name === areaName);
      if (areaIndex === -1) return;

      const materialToRestore = archivedMaterialsRef.current[areaIndex];
      if (!materialToRestore) return;

      const existingPositionsCount = syncedMaterials.filter(
        (m) => m.position === materialToRestore.position,
      ).length;
      const maxCountForPosition = allowedPositions.find(
        (p) => p.position === materialToRestore.position,
      )?.maxCount;

      if (maxCountForPosition !== undefined && existingPositionsCount >= maxCountForPosition) {
        setMessages((prev) => [
          ...prev,
          {
            type: "error",
            text: t("restoreNotAllowed", {
              position: materialToRestore.position,
              maxCount: maxCountForPosition,
            }),
            duration: 5000,
          },
        ]);
        scrollToTop();
        return;
      }

      // Remove the archived area from tabs and its fields
      const areaToRemove = archivedAreas[areaIndex];
      const fieldNamesToRemove = new Set(areaToRemove.fields.map((f) => f.name));
      skipFormResetRef.current = true;
      setAllFields((prev) => (prev ?? []).filter((f) => !fieldNamesToRemove.has(f.name)));
      setTabs((prev) => prev.map((tab) => removeArchivedArea(tab, areaName)));

      setArchivedMaterials((prev) => prev.filter((_, i) => i !== areaIndex));
      pendingArchivedDeletionsRef.current = Math.max(0, pendingArchivedDeletionsRef.current - 1);

      forceRebuildRef.current = true;
      setMaterials((prev) => {
        const syncedMaterials = syncMaterialsWithForm(prev, formValuesRef.current);
        return normalizeMaterialOrders([
          ...syncedMaterials,
          { ...materialToRestore, isValidated: false, status: "PENDING" },
        ]);
      });
      setArePricesValidated(false);
    },
    [
      setAllFields,
      setTabs,
      skipFormResetRef,
      setArePricesValidated,
      materials,
      allowedPositions,
      t,
      setMessages,
      formValuesRef,
    ],
  );

  const markAllValidated = useCallback(() => {
    setMaterials((prev) => prev.map((m) => ({ ...m, isValidated: true })));
    pendingArchivedDeletionsRef.current = 0;
  }, []);

  const markRowDirty = useCallback(
    (areaIndex: number) => {
      setMaterials((prev) =>
        prev.map((m, i) => (i === areaIndex ? { ...m, isValidated: false } : m)),
      );
      setArePricesValidated(false);
    },
    [setArePricesValidated],
  );

  const enableValidate = useCallback(() => {
    if (pendingArchivedDeletionsRef.current > 0) return true;

    return !arePricesValidated;
  }, [arePricesValidated]);

  const resyncMaterialsFromAPI = useCallback(
    (markValidated = false) => {
      hasSyncedFromAPIRef.current = false;
      hasSyncedArchivedRef.current = false;
      forceRebuildRef.current = true;
      archivedForceRebuildRef.current = true;
      if (markValidated) shouldMarkValidatedRef.current = true;
      skipFormResetRef.current = true;
    },
    [skipFormResetRef],
  );

  /** Returns the positional index of an area inside the sparePartsAreas array. */
  const getAreaPositionalIndex = useCallback((areaName: string): number => {
    const diagnosticTab = tabsRef.current.find((t) => t.name === "diagnosticData");
    if (!diagnosticTab) return -1;
    const sparePartsAreas = diagnosticTab.areas.filter(
      (a) => a.isMultiple && a.name.includes("diagnosticsSpareParts"),
    );
    return sparePartsAreas.findIndex((a) => a.name === areaName);
  }, []);

  const setRevisedRejectedRowPending = useCallback(
    (areaName: string) => {
      const positionalIndex = getAreaPositionalIndex(areaName);
      if (positionalIndex === -1) return;
      setMaterials((prev) => {
        const item = prev[positionalIndex];
        if (!item?.status || !RESETTABLE_MATERIAL_STATUSES.has(item.status)) return prev;
        return prev.map((m, i) => (i === positionalIndex ? { ...m, status: "PENDING" } : m));
      });
    },
    [getAreaPositionalIndex],
  );

  const getExistingPartNumbers = useCallback((formValues: Record<string, unknown>): Set<string> => {
    const fields = allFieldsRef.current;
    if (!fields?.length) return new Set();
    return new Set(
      fields
        .filter((f) => f.subtype === "diagnosticPartNumber")
        .map((f) => formValues[f.name] as string)
        .filter(Boolean),
    );
  }, []);

  return {
    materials,
    apiMaterialsLoaded,
    apiMaterialsEmpty,
    hasExistingDiagnostic,
    setMaterials,
    allowedPositions,
    automaticRows,
    positionDropdownOptions,
    addSpecialMaterialsAllowed,
    discountBase,
    getPositionConfig,
    getQuantityForPosition,
    onAddRow,
    onDeleteRow,
    onRestoreRow,
    onAddMaterials,
    getExistingPartNumbers,
    markAllValidated,
    markRowDirty,
    enableValidate,
    resyncMaterialsFromAPI,
    setRevisedRejectedRowPending,
    canArchiveOnDelete: !STATUSES_WITH_PERMANENT_DELETE.includes(jobStatus),
  };
};
