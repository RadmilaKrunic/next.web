import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RefObject, Dispatch, SetStateAction } from "react";
import type {
  CountryConfig,
  AllowedPosition,
  discountBase,
} from "api/services/countryConfiguration/countryConfiguration";
import type { GenericOptionProps } from "components/generics/Field/GenericField.types";
import Field from "components/generics/Field/GenericField.types";
import Section from "components/generics/Section/GenericSection.types";
import Area from "components/generics/Area/GenericArea.types";
import { setDuplicatedArea, mapFieldToFieldMapping } from "components/generics/utils";
import {
  type MaterialItem,
  type ImportedMaterial,
  buildRowValues,
} from "hooks/useDiagnosticsManager";
import type { Material } from "modules/ClaimManagement/ClaimOverview/Claims.types";
import { calculatePrices } from "utils/priceCalculator";
import { PERMISSIONS } from "utils/Permissions";
import type { HeaderUserData } from "api/services/header/action";

type AreaFields = {
  area: Area;
  fields: Field[];
};
// ── Helpers ────────────────────────────────────────────────────────────────

function computeClaimsUpdatedFields(
  needed: number,
  currentFields: Field[],
  extraFields: Field[],
  removeFieldNames: Set<string>,
): Field[] {
  if (needed > 0) return [...currentFields, ...extraFields];
  if (needed < 0) return currentFields.filter((f) => !removeFieldNames.has(f.name));
  return currentFields;
}

function computeClaimsFinalAreas(
  needed: number,
  sparePartsAreas: Area[],
  newAreas: Area[],
  removeNames: Set<string>,
): Area[] {
  if (needed > 0) return [...sparePartsAreas, ...newAreas];
  if (needed < 0) return sparePartsAreas.filter((a) => !removeNames.has(a.name));
  return sparePartsAreas;
}

const claimMaterialToMaterialItem = (m: Material, mode: discountBase): MaterialItem => {
  const price = m.price ?? ({} as Material["price"]);
  const quantity = m.quantity ?? 1;
  const unitPrice = price?.unitPrice ?? 0;
  const taxPercent = price?.tax ?? 0;
  const discountPercent = price?.discount ?? 0;

  const calculated = calculatePrices(
    {
      quantity,
      unitPrice,
      taxPercent,
      discountPercent,
      suggestedNetPrice: price?.suggestedNetPrice ?? 0,
      netAmount: price?.netAmount ?? 0,
      grossAmount: price?.grossAmount ?? 0,
      totalAmount: price?.totalAmount ?? 0,
      taxAmount: price?.taxAmount ?? 0,
    },
    "unitPrice",
    unitPrice,
    mode,
  );

  return {
    position: m.position ?? "",
    partNumber: m.partNumber ?? "",
    description: m.description ?? "",
    type: m.jobType ?? "",
    quantity,
    unitPrice,
    suggestedNetPrice: calculated.suggestedNetPrice,
    netAmount: calculated.netAmount,
    tax: taxPercent,
    grossAmount: calculated.grossAmount,
    discount: calculated.discountPercent,
    discountAmount: calculated.discountAmount,
    totalAmount: calculated.totalAmount,
    taxAmount: calculated.taxAmount,
    status: m.status,
    isValidated: m.isValidated,
    order: Number(m.order) || 0,
  };
};

const getOrderValue = (item: MaterialItem, fallbackIndex: number): number => {
  const parsed = Number(item.order);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackIndex + 1;
  return parsed;
};

const normalizeMaterialOrders = (items: MaterialItem[]): MaterialItem[] =>
  items.map((item, index) => ({ ...item, order: getOrderValue(item, index) }));

const sortMaterialsByOrder = (items: MaterialItem[]): MaterialItem[] =>
  [...normalizeMaterialOrders(items)].sort((a, b) => getOrderValue(a, 0) - getOrderValue(b, 0));

const materialItemToMaterial = (item: MaterialItem): Material => ({
  position: item.position,
  partNumber: item.partNumber,
  jobType: item.type,
  status: item.status ?? "PENDING",
  approvedBy: "",
  approvedByName: "",
  approvedAt: "",
  description: item.description,
  quantity: item.quantity,
  isValidated: item.isValidated ?? false,
  isPriceManuallySet: true,
  price: {
    unitPrice: item.unitPrice,
    suggestedNetPrice: item.suggestedNetPrice ?? 0,
    netAmount: item.netAmount,
    tax: item.tax,
    taxAmount: item.taxAmount,
    grossAmount: item.grossAmount,
    discount: item.discount,
    totalAmount: item.totalAmount ?? 0,
  },
});

const buildEmptyClaimMaterial = (position: string, jobType: string): MaterialItem => ({
  position,
  partNumber: "",
  description: "",
  type: jobType,
  quantity: 1,
  unitPrice: 0,
  netAmount: 0,
  suggestedNetPrice: 0,
  tax: 0,
  taxAmount: 0,
  grossAmount: 0,
  discount: 0,
  totalAmount: 0,
  isNew: true,
  order: 0,
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface UseClaimMaterialsManagerProps {
  claimId: string | undefined;
  claimMaterials: Material[] | undefined;
  claimArchivedMaterials?: Material[];
  currentActionType: string;
  currentJobType: string;
  tabs: Section[];
  setTabs: Dispatch<SetStateAction<Section[]>>;
  allFields: Field[] | null;
  setAllFields: Dispatch<SetStateAction<Field[] | null>>;
  setInitialFormValues: Dispatch<SetStateAction<Record<string, unknown>>>;
  skipFormResetRef: RefObject<boolean>;
  formValuesRef: RefObject<Record<string, unknown>>;
  arePricesValidated: boolean;
  setArePricesValidated: Dispatch<SetStateAction<boolean>>;
  readOnly?: boolean;
  isResyncingRef: RefObject<boolean>;
}

export interface UseClaimMaterialsManagerReturn {
  materials: MaterialItem[];
  setMaterials: Dispatch<SetStateAction<MaterialItem[]>>;
  archivedMaterials: Material[];
  allowedPositions: AllowedPosition[];
  positionDropdownOptions: GenericOptionProps[];
  automaticRows: string[];
  addSpecialMaterialsAllowed: boolean;
  discountBase: discountBase;
  onAddRow: (formValues: Record<string, unknown>) => void;
  onDeleteRow: (areaName: string) => void;
  onDeleteArchivedRow: (areaName: string) => void;
  onRestoreRow: (areaName: string) => void;
  onAddMaterials: (
    items: ImportedMaterial[],
    setFieldValue?: (field: string, value: unknown) => void,
  ) => void;
  getExistingPartNumbers: (formValues: Record<string, unknown>) => Set<string>;
  markAllValidated: () => void;
  markRowDirty: (areaIndex: number) => void;
  forceRebuildRef: RefObject<boolean>;
  hasSyncedRef: RefObject<boolean>;
}

const POSITION_PERMISSIONS: Record<string, string> = {
  PN: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_NET_DEALER_PRICE,
};

// ── Hook ──────────────────────────────────────────────────────────────────

export const useClaimMaterialsManager = ({
  claimId,
  claimMaterials,
  claimArchivedMaterials,
  currentActionType,
  currentJobType,
  tabs,
  setTabs,
  allFields,
  setAllFields,
  setInitialFormValues,
  skipFormResetRef,
  formValuesRef,
  setArePricesValidated,
  readOnly = false,
  isResyncingRef,
}: UseClaimMaterialsManagerProps): UseClaimMaterialsManagerReturn => {
  const queryClient = useQueryClient();

  // ── Country config ─────────────────────────────────────────────────────
  const userData = queryClient.getQueryData<HeaderUserData>(["user"]);
  const countryConfiguration = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    userData?.countryCode,
  ]);

  const discountBaseValue: discountBase =
    countryConfiguration?.diagnosticsConfiguration?.discountBase ?? "NET_PRICE";

  // Match the rule for the claim's actionType + jobType combination
  const matchedRule = (countryConfiguration?.diagnosticsConfiguration?.rules ?? []).find(
    (r) => r.actionType === currentActionType && r.jobType === currentJobType,
  )?.rule;

  // Allowed positions from the matched rule (filtered by user permissions)
  const allowedPositions: AllowedPosition[] = (matchedRule?.allowedPositions ?? []).filter((p) => {
    const required = POSITION_PERMISSIONS[p.position];
    if (!required) return true;
    return (userData?.permissions ?? []).includes(required);
  });

  const addSpecialMaterialsAllowed =
    countryConfiguration?.diagnosticsConfiguration?.addSpecialMaterialsAllowed ?? false;

  const automaticRows: string[] = matchedRule?.automaticRows ?? [];

  const positionDropdownOptions: GenericOptionProps[] = allowedPositions.map((p) => ({
    value: p.position,
    name: p.position,
  }));

  const userPermissionsRef = useRef(userData?.permissions ?? []);
  userPermissionsRef.current = userData?.permissions ?? [];

  // ── State ──────────────────────────────────────────────────────────────
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [archivedMaterials, setArchivedMaterials] = useState<Material[]>([]);

  // ── Refs for stable closures ───────────────────────────────────────────
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const allFieldsRef = useRef(allFields);
  allFieldsRef.current = allFields;
  const materialsRef = useRef(materials);
  materialsRef.current = materials;
  const archivedMaterialsRef = useRef(archivedMaterials);
  archivedMaterialsRef.current = archivedMaterials;
  const archivedTemplateRef = useRef<Area | null>(null);
  const discountBaseValueRef = useRef(discountBaseValue);
  discountBaseValueRef.current = discountBaseValue;
  const forceRebuildRef = useRef(false);
  const archivedForceRebuildRef = useRef(false);
  // Tracks the last claimMaterials reference we synced into `materials` state.
  // Prevents Effect 1 from double-running when Effect 2 causes a re-render
  // (same claimMaterials reference → skip) while still allowing re-runs when
  // a fresh fetch returns a new reference with updated / more items.
  // Reset to undefined on claimId change (navigate between claims) and before
  // validate (so the post-invalidate refetch triggers a resync).
  const lastSyncedMaterialsRef = useRef<Material[] | undefined>(undefined);
  // hasSyncedRef is the externally-visible reset handle exposed to ClaimOverview.
  // Setting it to false forces the next Effect 1 run regardless of reference equality.
  const hasSyncedRef = useRef(false);
  const lastSyncedArchivedRef = useRef<Material[] | undefined>(undefined);
  useEffect(() => {
    hasSyncedRef.current = false;
    lastSyncedMaterialsRef.current = undefined;
    lastSyncedArchivedRef.current = undefined;
    setMaterials([]);
    setArchivedMaterials([]);
    forceRebuildRef.current = false;
    archivedForceRebuildRef.current = false;
  }, [claimId]);

  // ── Sync archived materials from API response ──────────────────────────
  useEffect(() => {
    if (!claimArchivedMaterials || lastSyncedArchivedRef.current === claimArchivedMaterials) return;
    lastSyncedArchivedRef.current = claimArchivedMaterials;
    archivedForceRebuildRef.current = true;
    setArchivedMaterials(claimArchivedMaterials);
  }, [claimArchivedMaterials]);

  // ── Effect 1: Load materials from API response ─────────────────────────
  useEffect(() => {
    if (!claimMaterials?.length) return;
    // Allow re-run when:
    //  • hasSyncedRef was externally reset to false (post-validate resync), OR
    //  • claimMaterials is a new reference (fresh fetch with different / more items)
    // Skip when the reference is identical to the one we already processed
    // (prevents double-run triggered by the setTabs/setAllFields re-render in Effect 2).
    if (hasSyncedRef.current && lastSyncedMaterialsRef.current === claimMaterials) return;
    hasSyncedRef.current = true;
    lastSyncedMaterialsRef.current = claimMaterials;
    const items = claimMaterials.map((m) => claimMaterialToMaterialItem(m, discountBaseValue));
    forceRebuildRef.current = true;
    setMaterials(sortMaterialsByOrder(items));
    setArePricesValidated(claimMaterials.every((m) => m.isValidated === true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimMaterials]);

  // ── Effect 2: materials[] → areas + allFields + initialFormValues ──────
  useEffect(() => {
    if (materials.length === 0) return;

    // Use a fresh snapshot from the refs to avoid stale closures racing
    // with useDiagnosticsManager which shares the same setTabs / setAllFields.
    const currentTabs = tabsRef.current;
    const currentFields = allFieldsRef.current ?? [];

    const claimsTab = currentTabs.find((t) => t.name === "claims");
    if (!claimsTab) return;

    const sparePartsAreas = claimsTab.areas.filter(
      (a) =>
        a.isMultiple &&
        a.name.includes("claimSpareParts") &&
        !a.name.includes("claimArchivedSpareParts"),
    );
    if (sparePartsAreas.length === 0) return;

    const templateArea = sparePartsAreas[0];
    const currentCount = sparePartsAreas.length;
    const targetCount = materials.length;
    const needed = targetCount - currentCount;

    // Build the new areas and extra fields outside of state setters
    let extraFields: Field[] = [];
    const newAreas: Area[] = [];
    let removeNames = new Set<string>();
    let removeFieldNames = new Set<string>();

    if (needed > 0) {
      const maxIndex = sparePartsAreas.reduce((max, a: Area) => Math.max(max, a.index ?? 0), 0);
      for (let i = 0; i < needed; i++) {
        const cloned = structuredClone(templateArea);
        cloned.label = "";
        const area = setDuplicatedArea(cloned, maxIndex + 1 + i, claimsTab.name);
        const areaFields = area.fields.map((f) => mapFieldToFieldMapping(f));
        newAreas.push(area);
        extraFields = [...extraFields, ...areaFields];
      }
    } else if (needed < 0) {
      const toRemove = sparePartsAreas.slice(targetCount);
      removeNames = new Set(toRemove.map((a: Area) => a.name));
      removeFieldNames = new Set(toRemove.flatMap((a: Area) => a.fields.map((f) => f.name)));
    }

    // Compute the final set of areas/fields for building row values
    const allUpdatedFields = computeClaimsUpdatedFields(
      needed,
      currentFields,
      extraFields,
      removeFieldNames,
    );
    const finalClaimsAreas = computeClaimsFinalAreas(
      needed,
      sparePartsAreas,
      newAreas,
      removeNames,
    );

    let rowValues: Record<string, unknown> = {};
    materials.forEach((item, idx) => {
      const area = finalClaimsAreas[idx];
      if (!area) return;
      const areaFieldNames = new Set(area.fields.map((af) => af.name));
      const areaFields = allUpdatedFields.filter((f) => areaFieldNames.has(f.name));
      if (idx < currentCount && !forceRebuildRef.current) {
        const existingValues = Object.fromEntries(
          areaFields
            .filter((f) => f.name in formValuesRef.current)
            .map((f) => [f.name, formValuesRef.current[f.name]]),
        );
        rowValues = { ...rowValues, ...existingValues };
      } else {
        rowValues = { ...rowValues, ...buildRowValues(areaFields, item) };
      }
    });

    const keepClaimArea = (a: Area) => !removeNames.has(a.name);
    if (needed !== 0 || forceRebuildRef.current) {
      skipFormResetRef.current = true;
      // Functional updaters so we compose correctly with useDiagnosticsManager
      // which shares the same setAllFields / setTabs.
      if (needed > 0) {
        setAllFields((prev) => [...(prev ?? []), ...extraFields]);
        setTabs((prev) =>
          prev.map((tab) =>
            tab.name === "claims" ? { ...tab, areas: [...tab.areas, ...newAreas] } : tab,
          ),
        );
      } else {
        setAllFields((prev) => (prev ?? []).filter((f) => !removeFieldNames.has(f.name)));
        setTabs((prev) =>
          prev.map((tab) =>
            tab.name === "claims" ? { ...tab, areas: tab.areas.filter(keepClaimArea) } : tab,
          ),
        );
      }
    }

    const rowKeys = new Set(Object.keys(rowValues));
    // Signal price-calculation hooks to skip recalculation while we write
    // server-returned values into the form. Without this guard the hooks fire
    // immediately on the Formik reinitialize and overwrite the BE values with
    // locally-computed prices (visible as "prices show correctly only on 2nd validate").
    isResyncingRef.current = true;
    if (forceRebuildRef.current) {
      setInitialFormValues((prev) => ({ ...prev, ...rowValues }));
    } else {
      setInitialFormValues((prev) => {
        const withoutOldRows = Object.fromEntries(
          Object.entries(prev).filter(
            ([k]) => !k.startsWith("claims_claimSpareParts") || rowKeys.has(k),
          ),
        );
        return { ...withoutOldRows, ...rowValues };
      });
    }
    forceRebuildRef.current = false;
    // Release the resyncing guard after React has flushed all effects that
    // react to the new initialFormValues (price-calculation useEffects).
    setTimeout(() => {
      isResyncingRef.current = false;
    }, 50);
  }, [
    materials,
    setAllFields,
    setTabs,
    setInitialFormValues,
    formValuesRef,
    skipFormResetRef,
    isResyncingRef,
  ]);

  const populateNeeded = (
    needed: number,
    templateArea: Area,
    baseIndex: number,
    tabName: string,
  ): AreaFields[] => {
    const temp: AreaFields[] = [];
    for (let i = 0; i < needed; i++) {
      const cloned = structuredClone(templateArea);
      if (baseIndex + 1 + i !== 0) cloned.label = "";
      const area = setDuplicatedArea(cloned, baseIndex + 1 + i, tabName);
      const areaFields = area.fields.map((f) => mapFieldToFieldMapping(f));
      temp.push({ area, fields: areaFields });
    }
    return temp;
  };
  const reorderAreas = (tabs: Section[], newAreas: Area[]): Section[] => {
    return tabs.map((tab: Section) => {
      if (tab.name !== "claims") return tab;
      const insertAt =
        tab.areas.reduce(
          (last, a, i) => (a.name.includes("claimArchivedSpareParts") ? i : last),
          -1,
        ) + 1;
      const updated = [...tab.areas.slice(0, insertAt), ...newAreas, ...tab.areas.slice(insertAt)];
      return { ...tab, areas: updated };
    });
  };
  const removeArchivedAreaNames = (tabs: Section[], removeArchivedNames: Set<string>) => {
    return tabs.map((tab) =>
      tab.name === "claims"
        ? { ...tab, areas: tab.areas.filter((a) => !removeArchivedNames.has(a.name)) }
        : tab,
    );
  };

  // ── Effect 3b: archivedMaterials[] → claimArchivedSpareParts areas ─────
  useEffect(() => {
    const currentTabs = tabsRef.current;
    const currentFields = allFieldsRef.current ?? [];

    const claimsTab = currentTabs.find((t) => t.name === "claims");
    if (!claimsTab) return;

    const archivedAreas = claimsTab.areas.filter(
      (a) => a.isMultiple && a.name.includes("claimArchivedSpareParts"),
    );
    // Cache template before any guard so we can recreate areas after
    // the last archived row is restored and removes the template from tabs.
    if (archivedAreas.length > 0) {
      archivedTemplateRef.current ??= structuredClone(archivedAreas[0]);
    }
    const templateArea = archivedAreas[0] ?? archivedTemplateRef.current;
    if (!templateArea) return;

    const targetCount = archivedMaterials.length;
    const currentCount = archivedAreas.length;
    const needed = targetCount - currentCount;
    if (needed === 0 && !archivedForceRebuildRef.current) return;

    let newAreasAndFields: AreaFields[] = [];
    let removeArchivedNames = new Set<string>();
    let removeArchivedFieldNames = new Set<string>();

    if (needed > 0) {
      const baseIndex =
        archivedAreas.length === 0
          ? -1
          : archivedAreas.reduce((max, a) => Math.max(max, a.index ?? 0), 0);
      newAreasAndFields = populateNeeded(needed, templateArea, baseIndex, claimsTab.name);
    } else if (needed < 0) {
      const toRemove = archivedAreas.slice(targetCount);
      removeArchivedNames = new Set(toRemove.map((a) => a.name));
      removeArchivedFieldNames = new Set(toRemove.flatMap((a) => a.fields.map((f) => f.name)));
    }

    const visibleArchivedAreas =
      needed >= 0
        ? [...archivedAreas, ...newAreasAndFields.map((x) => x.area)]
        : archivedAreas.filter((a) => !removeArchivedNames.has(a.name));
    const newFieldsToAdd = newAreasAndFields.flatMap((x) => x.fields);

    const existingArchivedFields = currentFields.filter(
      (f) => f.name.includes("claimArchivedSpareParts") && !removeArchivedFieldNames.has(f.name),
    );
    const allArchivedFields = [...existingArchivedFields, ...newFieldsToAdd];

    let rowValues: Record<string, unknown> = {};
    archivedMaterials.forEach((material, idx) => {
      const item = claimMaterialToMaterialItem(material, discountBaseValueRef.current);
      const area = visibleArchivedAreas[idx];
      if (!area) return;
      const areaFieldNameSet = new Set(area.fields.map((af) => af.name));
      const areaFields = allArchivedFields.filter((f) => areaFieldNameSet.has(f.name));
      rowValues = { ...rowValues, ...buildRowValues(areaFields, item) };
    });

    if (needed !== 0 || archivedForceRebuildRef.current) {
      skipFormResetRef.current = true;
      if (needed > 0) {
        setAllFields((prev) => [...(prev ?? []), ...newFieldsToAdd]);
        const newAreas = newAreasAndFields.map((x) => x.area);
        setTabs((prev) => reorderAreas(prev, newAreas));
      } else if (needed < 0) {
        setAllFields((prev) => (prev ?? []).filter((f) => !removeArchivedFieldNames.has(f.name)));
        setTabs((prev) => removeArchivedAreaNames(prev, removeArchivedNames));
      }
    }

    setInitialFormValues((prev) => ({ ...prev, ...rowValues }));
    archivedForceRebuildRef.current = false;
  }, [archivedMaterials, setAllFields, setTabs, setInitialFormValues, skipFormResetRef]);

  // ── onAddRow ───────────────────────────────────────────────────────────
  const onAddRow = useCallback(
    (formValues: Record<string, unknown>) => {
      if (readOnly) return;
      if (allowedPositions.length === 0) return;

      const current = allFieldsRef.current ?? [];
      const positionCounts: Record<string, number> = {};
      current
        .filter((f) => f.subtype === "diagnosticPosition" && f.name.startsWith("claims_"))
        .forEach((f) => {
          const val = formValues[f.name] as string;
          if (val) positionCounts[val] = (positionCounts[val] ?? 0) + 1;
        });

      const totalRows = materialsRef.current.length;
      const maxTotal = allowedPositions.reduce((s, p) => s + p.maxCount, 0);
      if (totalRows >= maxTotal) return;

      // Auto-select position if only one has remaining capacity
      const availablePositions = allowedPositions.filter(
        (p) => (positionCounts[p.position] ?? 0) < p.maxCount,
      );
      const autoPosition = availablePositions.length === 1 ? availablePositions[0].position : "";

      const newItem = buildEmptyClaimMaterial(
        autoPosition,
        (formValues.jobType as string) ?? currentJobType ?? "",
      );

      setMaterials((prev) => {
        // Sync current form values back into existing rows before appending
        prev.forEach((m, i) => {
          m.partNumber =
            (formValues[`claims_claimSpareParts#${i}_sparePartNumber`] as string) ?? m.partNumber;
          m.position = (formValues[`claims_claimSpareParts#${i}_position`] as string) ?? m.position;
          m.quantity = Number(formValues[`claims_claimSpareParts#${i}_quantity`]) || m.quantity;
          m.unitPrice = Number(formValues[`claims_claimSpareParts#${i}_unitPrice`]) || m.unitPrice;
          m.description =
            (formValues[`claims_claimSpareParts#${i}_description`] as string) ?? m.description;
          m.type = (formValues[`claims_claimSpareParts#${i}_type`] as string) ?? m.type;
          m.netAmount = Number(formValues[`claims_claimSpareParts#${i}_netAmount`]) || m.netAmount;
          m.grossAmount =
            Number(formValues[`claims_claimSpareParts#${i}_grossAmount`]) || m.grossAmount;
          m.totalAmount =
            Number(formValues[`claims_claimSpareParts#${i}_totalAmount`]) || m.totalAmount;
          m.discount = Number(formValues[`claims_claimSpareParts#${i}_discount`]) || m.discount;
          m.tax = Number(formValues[`claims_claimSpareParts#${i}_tax`]) || m.tax;
        });
        return normalizeMaterialOrders([...prev, newItem]);
      });
      setArePricesValidated(false);
    },
    [readOnly, allowedPositions, currentJobType, setArePricesValidated],
  );

  // ── onDeleteRow ────────────────────────────────────────────────────────
  const onDeleteRow = useCallback(
    (areaName: string) => {
      let currentTabs = tabsRef.current;
      const currentFields = allFieldsRef.current ?? [];

      const claimsTab = currentTabs.find((t) => t.name === "claims");
      if (!claimsTab) return;

      const sparePartsAreas = claimsTab.areas.filter(
        (a) =>
          a.isMultiple &&
          a.name.includes("claimSpareParts") &&
          !a.name.includes("claimArchivedSpareParts"),
      );
      const areaIndex = sparePartsAreas.findIndex((a) => a.name === areaName);
      if (areaIndex === -1) return;

      const areaToRemove = sparePartsAreas[areaIndex];
      const fieldNamesToRemove = new Set(areaToRemove.fields.map((f) => f.name));

      // ── Archive the deleted material ───────────────────────────────────
      const materialItem = materialsRef.current[areaIndex];
      if (materialItem) {
        archivedForceRebuildRef.current = true;
        setArchivedMaterials((prev) => [...prev, materialItemToMaterial(materialItem)]);
      }

      const updatedValues = { ...formValuesRef.current };
      fieldNamesToRemove.forEach((name) => {
        delete updatedValues[name];
      });
      currentTabs = currentTabs.map((tab) =>
        tab.name === "claims"
          ? { ...tab, areas: tab.areas.filter((a) => a.name !== areaName) }
          : tab,
      );
      skipFormResetRef.current = true;
      setInitialFormValues(updatedValues);
      setAllFields(currentFields.filter((f) => !fieldNamesToRemove.has(f.name)));
      setTabs(currentTabs);
      setMaterials((prev) => normalizeMaterialOrders(prev.filter((_, i) => i !== areaIndex)));
      setArePricesValidated(false);
    },
    [
      setInitialFormValues,
      setAllFields,
      setTabs,
      formValuesRef,
      skipFormResetRef,
      setArePricesValidated,
    ],
  );

  // ── onAddMaterials (from AddSpecialMaterialModal / ExplosionDrawing) ───
  const onAddMaterials = useCallback(
    (items: ImportedMaterial[]) => {
      if (readOnly) return;

      const existingPartNumbers = new Set(
        (allFieldsRef.current ?? [])
          .filter((f) => f.subtype === "diagnosticPartNumber")
          .map((f) => formValuesRef.current[f.name] as string)
          .filter(Boolean),
      );

      const toAdd: MaterialItem[] = items
        .filter((m) => !existingPartNumbers.has(m.partNumber))
        .map((m) => ({
          position: m.position ?? "SP",
          partNumber: m.partNumber,
          description: m.description ?? "",
          type: m.type ?? currentJobType ?? "",
          quantity: m.quantity ?? 1,
          unitPrice: m.unitPrice ?? 0,
          netAmount: 0,
          suggestedNetPrice: 0,
          tax: 0,
          taxAmount: 0,
          grossAmount: 0,
          discount: 0,
          totalAmount: 0,
          origin: m.origin,
          order: 0,
        }));

      if (toAdd.length === 0) return;
      setMaterials((prev) => normalizeMaterialOrders([...prev, ...toAdd]));
      setArePricesValidated(false);
    },
    [readOnly, currentJobType, formValuesRef, setArePricesValidated],
  );

  // ── getExistingPartNumbers ─────────────────────────────────────────────
  const getExistingPartNumbers = useCallback((formValues: Record<string, unknown>): Set<string> => {
    return new Set(
      (allFieldsRef.current ?? [])
        .filter((f) => f.subtype === "diagnosticPartNumber")
        .map((f) => formValues[f.name] as string)
        .filter(Boolean),
    );
  }, []);

  // ── markAllValidated / markRowDirty ────────────────────────────────────
  const markAllValidated = useCallback(() => {
    setMaterials((prev) => prev.map((m) => ({ ...m, isValidated: true })));
    setArePricesValidated(true);
  }, [setArePricesValidated]);

  const markRowDirty = useCallback(
    (areaIndex: number) => {
      setMaterials((prev) =>
        prev.map((m, i) => (i === areaIndex ? { ...m, isValidated: false } : m)),
      );
      setArePricesValidated(false);
    },
    [setArePricesValidated],
  );

  // ── onRestoreRow ───────────────────────────────────────────────────────
  const onRestoreRow = useCallback(
    (areaName: string) => {
      const currentTabs = tabsRef.current;
      const claimsTab = currentTabs.find((t) => t.name === "claims");
      if (!claimsTab) return;

      const archivedAreas = claimsTab.areas.filter(
        (a) => a.isMultiple && a.name.includes("claimArchivedSpareParts"),
      );
      const areaIndex = archivedAreas.findIndex((a) => a.name === areaName);
      if (areaIndex === -1) return;

      const materialToRestore = archivedMaterialsRef.current[areaIndex];
      if (!materialToRestore) return;

      const restoredItem = claimMaterialToMaterialItem(
        materialToRestore,
        discountBaseValueRef.current,
      );
      forceRebuildRef.current = true;
      setMaterials((prev) => [...prev, restoredItem]);
      archivedForceRebuildRef.current = true;
      setArchivedMaterials((prev) => prev.filter((_, i) => i !== areaIndex));
      setArePricesValidated(false);
    },
    [setArePricesValidated],
  );

  // ── onDeleteArchivedRow ────────────────────────────────────────────────
  const onDeleteArchivedRow = useCallback((areaName: string) => {
    const currentTabs = tabsRef.current;
    const claimsTab = currentTabs.find((t) => t.name === "claims");
    if (!claimsTab) return;

    const archivedAreas = claimsTab.areas.filter(
      (a) => a.isMultiple && a.name.includes("claimArchivedSpareParts"),
    );
    const areaIndex = archivedAreas.findIndex((a) => a.name === areaName);
    if (areaIndex === -1) return;

    archivedForceRebuildRef.current = true;
    setArchivedMaterials((prev) => prev.filter((_, i) => i !== areaIndex));
  }, []);

  return {
    materials,
    setMaterials,
    archivedMaterials,
    allowedPositions,
    positionDropdownOptions,
    automaticRows,
    addSpecialMaterialsAllowed,
    discountBase: discountBaseValue,
    onAddRow,
    onDeleteRow,
    onDeleteArchivedRow,
    onRestoreRow,
    onAddMaterials,
    getExistingPartNumbers,
    markAllValidated,
    markRowDirty,
    forceRebuildRef,
    hasSyncedRef,
  };
};
