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
import { useTranslation } from "react-i18next";
import { useBareSalesRelation } from "api/services/bareSalesRelation/hooks";
import type { HeaderUserData } from "api/services/header/action";
import { MessagesContext } from "../../contexts/messagescontext";
import { scrollToTop } from "../../utils/scrollToError";
import {
  POSITION_ORDER,
  sortByPositionOrder,
  normalizeMaterialOrders,
  sortMaterialsByOrder,
  computePricesForItem,
  buildEmptyMaterial,
  buildRowValues,
  buildMaterialsRowValues,
  withSpecialMaterialSpOption,
  deriveSparePartsAreasAndFields,
} from "./materialsDerivation";
import type {
  MaterialItem,
  ImportedMaterial,
  ItemsSurfaceConfig,
  ItemsSurfaceNaming,
  UseItemsManagerReturn,
} from "./itemsManager.types";

export type { MaterialItem, ImportedMaterial };

// computeIsChargeable/hasWarrantyOrProServiceItems/getChargeablePendingInfo/
// getBoschInternalPending/PREAPPROVAL_ACTION_TYPES/PREAPPROVAL_JOB_TYPES are NOT moved here —
// they're job-diagnostic-tab-specific (warranty/goodwill), not shared, and this hook doesn't
// call them internally. They stay in useDiagnosticsManager.ts (see items-and-prices-
// refactor.md §15 step 2/3). POSITION_VIEW_PERMISSIONS/POSITION_INSERT_PERMISSIONS become
// config.positionViewPermissions/config.positionInsertPermissions (ItemsSurfaceConfig) instead
// of hardcoded module-level constants — see the divergence table in this step's commit.

enum QuantitySource {
  DEFAULT = "DEFAULT",
  FAULT_CODES = "FAULT_CODES",
  USER = "USER",
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Matches a live-row Area/Field name for this surface. Guards against
 *  liveMarkerCollidesWithArchived (see ItemsSurfaceNaming) so a surface whose live marker
 *  happens to be a substring of its archived marker doesn't double-match archived names. */
function isLiveAreaName(name: string, naming: ItemsSurfaceNaming): boolean {
  return (
    name.includes(naming.liveAreaMarker) &&
    (!naming.liveMarkerCollidesWithArchived || !name.includes(naming.archivedAreaMarker))
  );
}

function isArchivedAreaName(name: string, naming: ItemsSurfaceNaming): boolean {
  return name.includes(naming.archivedAreaMarker);
}

function removeArchivedArea(tab: Section, areaName: string, tabName: string): Section {
  if (tab.name !== tabName) return tab;
  return {
    ...tab,
    areas: tab.areas.filter((area) => area.name !== areaName),
  };
}

const RESETTABLE_MATERIAL_STATUSES = new Set(["REVISED", "REJECTED"]);

// Prefix is `${tabName}_${liveAreaMarker}#` — job's original hardcoded
// "diagnosticData_diagnosticsSpareParts#" is exactly this pattern for job's naming, and
// claim's real field keys (e.g. "claims_claimSpareParts#0_sparePartNumber") follow the same
// pattern for claim's naming — confirmed against useClaimMaterialsManager.ts's onAddRow,
// which read/wrote these exact keys by hand instead of going through a shared sync helper.
const syncMaterialsWithForm = (
  materials: MaterialItem[],
  formValues: Record<string, unknown>,
  naming: ItemsSurfaceNaming,
) => {
  const prefix = `${naming.tabName}_${naming.liveAreaMarker}#`;
  const syncedMaterials = materials.map((materialItem, index) => {
    return {
      ...materialItem,
      description:
        (formValues[`${prefix}${index}_description`] as string) ?? materialItem.description,
      discount: Number(formValues[`${prefix}${index}_discount`]) || materialItem.discount,
      totalAmount: Number(formValues[`${prefix}${index}_totalAmount`]) || materialItem.totalAmount,
      grossAmount: Number(formValues[`${prefix}${index}_grossAmount`]) || materialItem.grossAmount,
      partNumber:
        (formValues[`${prefix}${index}_sparePartNumber`] as string) ?? materialItem.partNumber,
      position: (formValues[`${prefix}${index}_position`] as string) ?? materialItem.position,
      quantity: Number(formValues[`${prefix}${index}_quantity`]) || materialItem.quantity,
      tax: Number(formValues[`${prefix}${index}_tax`]) || materialItem.tax,
      netAmount: Number(formValues[`${prefix}${index}_netAmount`]) || materialItem.netAmount,
      type: (formValues[`${prefix}${index}_type`] as string) ?? materialItem.type,
      unitPrice: Number(formValues[`${prefix}${index}_unitPrice`]) || materialItem.unitPrice,
    };
  });
  return syncedMaterials;
};

// ── Hook ───────────────────────────────────────────────────────────────────

export interface UseItemsManagerProps<TApiMaterial = unknown> {
  config: ItemsSurfaceConfig<TApiMaterial>;
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
}

export const useItemsManager = <TApiMaterial = unknown>({
  config,
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
}: UseItemsManagerProps<TApiMaterial>): UseItemsManagerReturn => {
  // Everything below still refers to diagnosticData/currentActionType/currentJobType/
  // jobStatus by their original names (unchanged from useDiagnosticsManager.ts) — derived
  // here from `config` so the rest of this file's ~1000 lines needed zero further edits
  // beyond the divergence points called out in this step's commit message. `diagnosticData`
  // is intentionally NOT memoized: `config` is expected to be rebuilt fresh by the caller
  // every render (same as every other config-driven value below), so memoizing it here would
  // just be extra bookkeeping for no benefit — every effect that depends on materials/
  // archivedMaterials arrays already re-derives its own dependency correctly from `diagnosticData`.
  const diagnosticData = {
    jobId: config.resetKey,
    materials: config.apiMaterials as unknown[] | undefined,
    archivedMaterials: config.apiArchivedMaterials as unknown[] | undefined,
  };
  const currentActionType = config.currentActionType;
  const currentJobType = config.currentJobType;
  const jobStatus = config.jobStatus ?? "";

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
    const requiredPermission = config.positionViewPermissions[p.position];
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
  const currentFormActionType = formValuesRef.current["actionType"] as string | undefined;
  const isSpecialMaterialsGatedActionType = Boolean(
    config.addSpecialMaterialsActionTypeGate &&
      currentFormActionType !== undefined &&
      config.addSpecialMaterialsActionTypeGate.has(currentFormActionType),
  );
  const addSpecialMaterialsAllowed =
    (diagnosticsConfiguration?.addSpecialMaterialsAllowed && !isSpecialMaterialsGatedActionType) ??
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
  // config is rebuilt fresh by the caller every render (same as every other job/claim-
  // specific value in this hook) — ref'd so stable useCallbacks (onAddRow, onDeleteRow) can
  // read the latest config.newRowDefaults/positionInsertPermissions/deletionPolicy without
  // needing config itself in their dependency arrays.
  const configRef = useRef(config);
  configRef.current = config;
  // Claim's original onAddRow (useClaimMaterialsManager.ts) checked `if (readOnly) return;`
  // as its first line; job's never needed to (job never calls this hook with readOnly: true
  // for a config whose onAddRow is actually wired to a UI action). Ref'd for the same reason
  // as configRef above — onAddRow is a stable useCallback([]).
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const tRef = useRef(t);
  tRef.current = t;

  const hasSyncedFromAPIRef = useRef(false);
  // Only consulted when config.resyncOnApiMaterialsReferenceChange is true (claim) — see the
  // type's docstring. Stays unused (always null) for job, matching job's original hook exactly.
  const lastSyncedMaterialsRef = useRef<unknown>(null);
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
        !!config.bareSalesAutofill &&
        !!(baretoolNumber && countryCode) &&
        userData?.type !== config.bareSalesAutofill.excludeUserType &&
        config.bareSalesAutofill.actionTypeGate.has(currentActionType),
    },
  );
  const bareSalesDataRef = useRef(bareSalesData);
  bareSalesDataRef.current = bareSalesData;

  // Reset on new job
  useEffect(() => {
    hasSyncedFromAPIRef.current = false;
    lastSyncedMaterialsRef.current = null;
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
    if (!apiMaterials?.length) return;
    if (hasSyncedFromAPIRef.current) {
      // Job (resyncOnApiMaterialsReferenceChange: false): once synced, always skip until
      // resyncMaterialsFromAPI() explicitly resets hasSyncedFromAPIRef — matches job's
      // original hook exactly. Claim (true): also re-syncs on its own whenever apiMaterials
      // is a genuinely new array reference (e.g. a background refetch), matching claim's
      // original lastSyncedMaterialsRef behavior exactly.
      if (
        !configRef.current.resyncOnApiMaterialsReferenceChange ||
        lastSyncedMaterialsRef.current === apiMaterials
      ) {
        return;
      }
    }

    hasSyncedFromAPIRef.current = true;
    lastSyncedMaterialsRef.current = apiMaterials;

    const forceValidated = shouldMarkValidatedRef.current;
    const items: MaterialItem[] = apiMaterials.map((m) =>
      configRef.current.toMaterialItem(m as TApiMaterial, discountBaseRef.current, {
        forceValidated,
      }),
    );
    shouldMarkValidatedRef.current = false;
    if (configRef.current.setArePricesValidatedOnSync) {
      setArePricesValidated(items.every((item) => item.isValidated === true));
    }

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

    const items: MaterialItem[] = apiArchived.map((m) =>
      configRef.current.toMaterialItem(m as TApiMaterial, discountBaseRef.current, {
        forceValidated: shouldMarkValidatedRef.current,
      }),
    );

    archivedForceRebuildRef.current = true;
    setArchivedMaterials(items);
  }, [diagnosticData]);

  // ── Effect 2: Rule change → rebuild materials list ────────────────────────
  // Gated on config.autoBuildAutomaticRows (job: true; claim: false today — claim never
  // auto-built automatic rows, a real pre-existing product gap this merge preserves rather
  // than silently fixing, see items-and-prices-refactor.md §15).
  useEffect(() => {
    if (readOnly) return;
    if (!config.autoBuildAutomaticRows) return;
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
    config.autoBuildAutomaticRows,
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

    const naming = configRef.current.identity.naming;
    const currentTabs = tabsRef.current;
    const currentFields = allFieldsRef.current ?? [];

    const diagnosticTab = currentTabs.find((t) => t.name === naming.tabName);
    if (!diagnosticTab) return;

    const sparePartsAreas = diagnosticTab.areas.filter(
      (a) => a.isMultiple && isLiveAreaName(a.name, naming),
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

    const nonSparePartsFields = currentFields.filter((f) => !isLiveAreaName(f.name, naming));
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

      const sparePartsFieldsFinal = updatedFields.filter((f) => isLiveAreaName(f.name, naming));

      // Use functional updaters so this composes correctly with any concurrent
      // functional setter from useClaimMaterialsManager (or any other hook)
      // that shares the same setAllFields / setTabs.
      setAllFields((prev) => {
        const prevWithoutSpareParts = (prev ?? []).filter((f) => !isLiveAreaName(f.name, naming));
        return [...prevWithoutSpareParts, ...sparePartsFieldsFinal];
      });
      setTabs((prev) =>
        prev.map((tab) =>
          tab.name === naming.tabName
            ? {
                ...tab,
                areas: [
                  ...tab.areas.filter((a) => !(a.isMultiple && isLiveAreaName(a.name, naming))),
                  ...derivedAreas,
                ],
              }
            : tab,
        ),
      );
    }

    const rowFieldPrefix = `${naming.tabName}_${naming.liveAreaMarker}`;
    if (forceRebuildRef.current) {
      // Strip every live-row-prefixed key from prev before merging in the freshly-derived
      // rowValues (which only ever has entries for the current row count) — otherwise a row
      // count decrease (e.g. deleting the last row) would leave that row's now-orphaned keys
      // sitting in Formik state indefinitely. Full-derivation replaces what onDeleteRow used
      // to guarantee via its own separate full-replace call.
      setInitialFormValues((prev) => {
        const prevWithoutRowFields = Object.fromEntries(
          Object.entries(prev).filter(([k]) => !k.startsWith(rowFieldPrefix)),
        );
        return { ...prevWithoutRowFields, ...rowValues };
      });
    } else {
      const currentFormWithoutRowFields = Object.fromEntries(
        Object.entries(formValuesRef.current).filter(
          ([k, v]) => !k.startsWith(rowFieldPrefix) && v !== "" && v !== null && v !== undefined,
        ),
      );
      setInitialFormValues((prev) => ({ ...prev, ...currentFormWithoutRowFields, ...rowValues }));
    }
    forceRebuildRef.current = false;
  }, [materials, setAllFields, setTabs, setInitialFormValues, formValuesRef, skipFormResetRef]);
  // ── Effect 3b: archivedMaterials[] → areas + allFields + initialFormValues ───
  // Job (deletionPolicy.supportsPermanentArchivedDelete: false) only ever grows this list —
  // matches useDiagnosticsManager.ts's original Effect 3b exactly, including its early return
  // at archivedMaterials.length === 0. Claim (true) can also shrink it (onDeleteArchivedRow),
  // so it skips that early return and additionally computes a set of areas/fields to remove —
  // matches useClaimMaterialsManager.ts's original Effect 3b (populateNeeded/
  // removeArchivedAreaNames) exactly. Both cases converge on one setAllFields/setTabs call
  // below: removeAreaNames/removeFieldNames are always empty for job, so the filter is a
  // no-op pass-through and the call reduces to exactly job's original add-only behavior.
  useEffect(() => {
    const naming = configRef.current.identity.naming;
    const supportsRemoval = configRef.current.deletionPolicy.supportsPermanentArchivedDelete;
    if (!supportsRemoval && archivedMaterials.length === 0) return;

    const currentTabs = tabsRef.current;
    const diagnosticTab = currentTabs.find((t) => t.name === naming.tabName);
    if (!diagnosticTab) return;

    const archivedAreas = diagnosticTab.areas.filter(
      (a) => a.isMultiple && isArchivedAreaName(a.name, naming),
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

    const newAreasAndFields: { area: Area; fields: Field[] }[] = [];
    let removeAreaNames = new Set<string>();
    let removeFieldNames = new Set<string>();
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
    } else if (needed < 0 && supportsRemoval) {
      const toRemove = archivedAreas.slice(targetCount);
      removeAreaNames = new Set(toRemove.map((a) => a.name));
      removeFieldNames = new Set(toRemove.flatMap((a) => a.fields.map((f) => f.name)));
    }

    const allArchivedAreas =
      needed >= 0
        ? [...archivedAreas, ...newAreasAndFields.map((x) => x.area)]
        : archivedAreas.filter((a) => !removeAreaNames.has(a.name));
    const newFieldsToAdd = newAreasAndFields.flatMap((x) => x.fields);

    // Compute form values for all archived rows
    const existingArchivedFields = (allFieldsRef.current ?? []).filter(
      (f) => isArchivedAreaName(f.name, naming) && !removeFieldNames.has(f.name),
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
        const withoutRemoved = (prev ?? []).filter((f) => !removeFieldNames.has(f.name));
        const fields = [...withoutRemoved, ...newFieldsToAdd];
        return fields.map((f) => {
          if (f.subtype !== "archivedPosition") return f;
          if ((f.options?.length ?? 0) > 0) return f;
          return { ...f, options: ALL_POSITION_OPTIONS };
        });
      });
      setTabs((prev) =>
        prev.map((tab) =>
          tab.name === naming.tabName
            ? {
                ...tab,
                areas: [
                  ...tab.areas.filter((a) => !removeAreaNames.has(a.name)),
                  ...newAreasAndFields.map((x) => x.area),
                ],
              }
            : tab,
        ),
      );
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

    const fieldPrefix = `${configRef.current.identity.naming.tabName}_`;
    const updated = allFields.map((f) => {
      // Archived position fields use subtype "archivedPosition" and are not affected here
      if (f.subtype !== "diagnosticPosition") return f;
      // Only touch this surface's own fields — a shared allFields array may also carry the
      // other surface's fields (e.g. ClaimOverview.tsx runs a job-diagnostics instance and a
      // claim-spare-parts instance of this hook side by side against the same allFields state).
      if (!f.name.startsWith(fieldPrefix)) return f;

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
    if (readOnlyRef.current) return;
    if (!formValues) return;
    const perms = userPermissionsRef.current;
    const insertPermissions = configRef.current.positionInsertPermissions;
    const hasPositionPermission = (position: string): boolean => {
      const required = insertPermissions?.[position];
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

    const nextPosition = configRef.current.newRowDefaults.resolvePosition({
      allowed,
      positionCounts,
    });

    const qty = nextPosition
      ? (getQuantityForPositionRef.current(
          nextPosition,
          (formValues.faultCode as string) ?? "",
          Number(formValues.faultCodeLabourQuantity) || 0,
        ) ?? 1)
      : 1;

    // Bug 6 fix: use tax from existing validated rows as default for new rows
    const defaultTax = materialsRef.current.find((m) => m.tax > 0)?.tax ?? 0;
    const resolvedType = configRef.current.newRowDefaults.resolveType({
      currentJobType: configRef.current.currentJobType,
    });
    const newItem = {
      ...buildEmptyMaterial(nextPosition, resolvedType, qty, tRef.current, discountBaseRef.current),
      tax: defaultTax,
    };

    setMaterials((prev) => {
      const syncedMaterials = syncMaterialsWithForm(prev, formValues, configRef.current.identity.naming);
      return normalizeMaterialOrders([...syncedMaterials, newItem]);
    });
  }, []);

  const onDeleteRow = useCallback(
    (areaName: string) => {
      const naming = configRef.current.identity.naming;
      const currentTabs = tabsRef.current;
      const diagnosticTab = currentTabs.find((t) => t.name === naming.tabName);
      if (!diagnosticTab) return;

      const sparePartsAreas = diagnosticTab.areas.filter(
        (a) => a.isMultiple && isLiveAreaName(a.name, naming),
      );
      const areaIndex = sparePartsAreas.findIndex((a) => a.name === areaName);
      if (areaIndex === -1) return;

      // Archive the row when the current status is not in the permanent-delete set. Job:
      // config.deletionPolicy.permanentDeleteFromActiveStatuses is a real Set ("IN_DIAGNOSTICS"),
      // so a delete there is permanent. Claim: this is undefined, so isPermanentDelete is
      // always false — onDeleteRow always archives, matching claim's current behavior exactly.
      const permanentDeleteStatuses =
        configRef.current.deletionPolicy.permanentDeleteFromActiveStatuses;
      const isPermanentDelete = permanentDeleteStatuses?.has(jobStatusRef.current) ?? false;
      if (!isPermanentDelete) {
        const syncedMaterials = syncMaterialsWithForm(
          materialsRef.current,
          formValuesRef.current,
          configRef.current.identity.naming,
        );
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
        const syncedMaterials = syncMaterialsWithForm(
          prev,
          formValuesRef.current,
          configRef.current.identity.naming,
        );
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
        const syncedMaterials = syncMaterialsWithForm(
          prev,
          formValuesRef.current,
          configRef.current.identity.naming,
        );

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
      const naming = configRef.current.identity.naming;
      const syncedMaterials = syncMaterialsWithForm(materials, formValuesRef.current, naming);
      const currentTabs = tabsRef.current;
      const diagnosticTab = currentTabs.find((t) => t.name === naming.tabName);
      if (!diagnosticTab) return;

      const archivedAreas = diagnosticTab.areas.filter(
        (a) => a.isMultiple && isArchivedAreaName(a.name, naming),
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
      setTabs((prev) => prev.map((tab) => removeArchivedArea(tab, areaName, naming.tabName)));

      setArchivedMaterials((prev) => prev.filter((_, i) => i !== areaIndex));
      pendingArchivedDeletionsRef.current = Math.max(0, pendingArchivedDeletionsRef.current - 1);

      forceRebuildRef.current = true;
      setMaterials((prev) => {
        const syncedMaterials = syncMaterialsWithForm(prev, formValuesRef.current, naming);
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
    const naming = configRef.current.identity.naming;
    const diagnosticTab = tabsRef.current.find((t) => t.name === naming.tabName);
    if (!diagnosticTab) return -1;
    const sparePartsAreas = diagnosticTab.areas.filter(
      (a) => a.isMultiple && isLiveAreaName(a.name, naming),
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

  // Present in the return object only when config.deletionPolicy.supportsPermanentArchivedDelete
  // is true (claim) — job has no permanent-archived-delete concept at all. Always defined as a
  // callback (hooks can't be called conditionally) — porting useClaimMaterialsManager.ts's
  // onDeleteArchivedRow, generalized over naming instead of hardcoded "claimArchivedSpareParts".
  const onDeleteArchivedRow = useCallback((areaName: string) => {
    const naming = configRef.current.identity.naming;
    const currentTabs = tabsRef.current;
    const diagnosticTab = currentTabs.find((t) => t.name === naming.tabName);
    if (!diagnosticTab) return;

    const archivedAreas = diagnosticTab.areas.filter(
      (a) => a.isMultiple && isArchivedAreaName(a.name, naming),
    );
    const areaIndex = archivedAreas.findIndex((a) => a.name === areaName);
    if (areaIndex === -1) return;

    archivedForceRebuildRef.current = true;
    setArchivedMaterials((prev) => prev.filter((_, i) => i !== areaIndex));
  }, []);

  return {
    materials,
    archivedMaterials,
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
    onDeleteArchivedRow: config.deletionPolicy.supportsPermanentArchivedDelete
      ? onDeleteArchivedRow
      : undefined,
    onRestoreRow,
    onAddMaterials,
    getExistingPartNumbers,
    markAllValidated,
    markRowDirty,
    enableValidate,
    resyncMaterialsFromAPI,
    setRevisedRejectedRowPending,
    canArchiveOnDelete: !(
      config.deletionPolicy.permanentDeleteFromActiveStatuses?.has(jobStatus) ?? false
    ),
  };
};
