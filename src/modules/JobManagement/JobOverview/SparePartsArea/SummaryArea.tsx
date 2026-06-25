import Area from "../../../../components/generics/Area/GenericArea.types";
import "./SparePartsArea.scss";
import GenericField from "../../../../components/generics/Field/GenericField";
import { useFormikContext } from "formik";
import { useContext, useEffect, useMemo, useRef } from "react";
import {
  aggregateRowPrices,
  DISTRIBUTABLE_POSITIONS,
  SUMMARY_TYPE_FILTER,
  type RowAggregate,
} from "utils/priceCalculator";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { useDiagnosticsContext } from "../DiagnosticsContext";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";
import Field from "components/generics/Field/GenericField.types";
import { useTranslation } from "react-i18next";

const toCamelCase = (s: string) =>
  s.toLowerCase().replaceAll(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const MATERIAL_SUBTYPE_TO_AGGREGATE_KEY: Partial<Record<string, keyof RowAggregate>> = {
  diagnosticSummarySuggestedNetPriceMaterial: "suggestedNetPrice",
  diagnosticSummaryNetAmountMaterial: "netAmount",
  diagnosticSummaryTaxAmountMaterial: "taxAmount",
  diagnosticSummaryGrossAmountMaterial: "grossAmount",
  diagnosticSummaryTotalAmountMaterial: "totalAmount",
  diagnosticSummaryDiscountNetMaterial: "discount",
  diagnosticSummaryDiscountMaterial: "discount",
  diagnosticSummaryDiscountMaterialHidden: "discount",
};

function SummaryArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { allFields, activeValueChangeFieldRef } = useContext(GenericFormContext);
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const { isDistributingRef, hasPricesPopulated, setSummaryTypeOptions, discountBase } =
    useDiagnosticsContext();
  const hasPriceViewPermission = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_VIEW_PRICES]);
  const canEditdiscount = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_DISCOUNT]);
  const canEditTotalAmount = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_AMOUNT]);
  const types = new Set(["chargeable"]);
  // Determine which row area name to scope aggregation to.
  // claimDiagnosticsSummary  → aggregate only claims_claimSpareParts#N rows
  // diagnosticsSummary       → aggregate only diagnosticData_diagnosticsSpareParts#N rows
  // This prevents cross-tab contamination when both tabs share the diagnosticType subtype.
  const rowAreaNameContains = useMemo(() => {
    if (area.name.includes("claimDiagnosticsSummary")) return "claimSpareParts";
    return "diagnosticsSpareParts";
  }, [area.name]);

  const scopedFields = useMemo(() => {
    if (!allFields) return [];
    return allFields.filter((f) => {
      const ns = f.fieldMapping?.nameStartsWith ?? "";
      // Non-row fields (summary fields, discountBase, etc.) have no nameStartsWith — keep them.
      if (!ns) return true;
      return ns.includes(rowAreaNameContains);
    });
  }, [allFields, rowAreaNameContains]);

  const applyFieldPermissions = (field: Field, activeSummaryType: string): Field => {
    const subtype = field.subtype || "";
    if (!subtype) return field;
    const isEditableSummaryType = types.has(activeSummaryType);
    const isNet = discountBase === "NET_PRICE";
    if (
      subtype === "diagnosticSummaryDiscountNetMaterial" ||
      subtype === "diagnosticSummaryDiscountMaterial"
    ) {
      return { ...field, isDisabled: !canEditdiscount || !isEditableSummaryType };
    }

    if (subtype === "diagnosticSummaryNetAmountMaterial") {
      return { ...field, isDisabled: !isNet || !isEditableSummaryType };
    }

    if (subtype === "diagnosticSummaryTotalAmountMaterial") {
      return { ...field, isDisabled: isNet || !canEditTotalAmount || !isEditableSummaryType };
    }
    return field;
  };

  const summaryTypeField = useMemo(
    () => area.fields.find((f) => f.type === "radiogroup"),
    [area.fields],
  );

  // The active visible discount field (mode-specific, no attributeMapping).
  const activeSummaryDiscountField = useMemo(
    () =>
      area.fields.find(
        (f) =>
          (f.subtype === "diagnosticSummaryDiscountNet" ||
            f.subtype === "diagnosticSummaryDiscount") &&
          f.dependentFields?.some((df) => df.fieldValue === discountBase),
      ),
    [area.fields, discountBase],
  );

  const activeMaterialDiscountField = useMemo(
    () =>
      area.fields.find(
        (f) =>
          (f.subtype === "diagnosticSummaryDiscountNetMaterial" ||
            f.subtype === "diagnosticSummaryDiscountMaterial") &&
          f.dependentFields?.some((df) => df.fieldValue === discountBase),
      ),
    [area.fields, discountBase],
  );

  const summaryDiscountHiddenField = useMemo(
    () => area.fields.find((f) => f.subtype === "diagnosticSummaryDiscountHidden"),
    [area.fields],
  );

  const summaryDiscountMaterialHiddenField = useMemo(
    () => area.fields.find((f) => f.subtype === "diagnosticSummaryDiscountMaterialHidden"),
    [area.fields],
  );

  const summaryFieldNames = useMemo(() => {
    return area.fields.reduce(
      (acc, field) => {
        const map = field.fieldMapping?.map;
        if (!map) return acc;
        if (acc[map] === undefined) {
          acc[map] = field.name;
        } else {
          const modeMatch = field.dependentFields?.some((df) => df.fieldValue === discountBase);
          if (modeMatch) acc[map] = field.name;
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [area.fields, discountBase]);

  const currentSummaryType = summaryTypeField
    ? (values[summaryTypeField.name] as string) || "totalSummary"
    : "totalSummary";

  const summaryTypeOptions = useMemo(() => {
    const seen = new Map<string, { label: string; value: string }>();
    const templateTypeField = scopedFields.find((f) => f.subtype === "diagnosticType");
    const typeFieldOptions = templateTypeField?.options ?? [];
    scopedFields
      .filter((f) => f.subtype === "diagnosticType")
      .forEach((field) => {
        const value = values[field.name] as string;
        if (!value) return;
        const option = typeFieldOptions.find((o) => o.value === value);
        if (!option) return;
        const summaryValue = toCamelCase(String(option.value));
        if (!seen.has(summaryValue))
          seen.set(summaryValue, { value: summaryValue, label: option.name });
      });
    return [{ value: "totalSummary", label: "totalSummary" }, ...seen.values()];
  }, [scopedFields, values]);

  useEffect(() => {
    if (!summaryTypeField) return;
    const current = values[summaryTypeField.name] as string;
    if (!summaryTypeOptions.some((o) => o.value === current)) {
      void setFieldValue(summaryTypeField.name, "totalSummary");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryTypeOptions]);

  useEffect(() => {
    setSummaryTypeOptions(summaryTypeOptions);
  }, [summaryTypeOptions, setSummaryTypeOptions]);

  const prevRowAggRef = useRef<RowAggregate>({
    suggestedNetPrice: -1,
    netAmount: -1,
    grossAmount: -1,
    totalAmount: -1,
    discount: -1,
    taxAmount: -1,
    discountAmount: -1,
  });
  const rowAggregates = useMemo(() => {
    const typeFilter = SUMMARY_TYPE_FILTER[currentSummaryType] ?? SUMMARY_TYPE_FILTER.totalSummary;
    const raw = aggregateRowPrices(values, scopedFields, typeFilter, discountBase);
    const prev = prevRowAggRef.current;
    if (
      Math.abs(prev.suggestedNetPrice - raw.suggestedNetPrice) < 0.0001 &&
      Math.abs(prev.netAmount - raw.netAmount) < 0.0001 &&
      Math.abs(prev.grossAmount - raw.grossAmount) < 0.0001 &&
      Math.abs(prev.totalAmount - raw.totalAmount) < 0.0001 &&
      Math.abs(prev.taxAmount - raw.taxAmount) < 0.0001 &&
      Math.abs(prev.discount - raw.discount) < 0.0001
    ) {
      return prev; // same reference → effect does not re-fire
    }
    prevRowAggRef.current = raw;
    return raw;
  }, [values, currentSummaryType, scopedFields, discountBase]);

  const summaryMaterialFieldNames = useMemo(() => {
    const result: Partial<Record<keyof RowAggregate, string>> = {};
    for (const field of area.fields) {
      const key = MATERIAL_SUBTYPE_TO_AGGREGATE_KEY[field.subtype ?? ""];
      if (!key) continue;
      if (result[key] === undefined) {
        result[key] = field.name;
      } else {
        // For duplicate aggregate keys (e.g. discount has NET and GROSS variants),
        // prefer the field whose dependentFields match the current discountBase.
        const modeMatch = field.dependentFields?.some((df) => df.fieldValue === discountBase);
        if (modeMatch) result[key] = field.name;
      }
    }
    return result;
  }, [area.fields, discountBase]);

  const prevRowAggMaterialRef = useRef<RowAggregate>({
    suggestedNetPrice: -1,
    netAmount: -1,
    grossAmount: -1,
    totalAmount: -1,
    discount: -1,
    taxAmount: -1,
    discountAmount: -1,
  });
  const rowAggregatesMaterial = useMemo(() => {
    const positionFilter = (pos: string) => DISTRIBUTABLE_POSITIONS.has(pos);
    const raw = aggregateRowPrices(
      values,
      scopedFields,
      SUMMARY_TYPE_FILTER[currentSummaryType],
      discountBase,
      positionFilter,
    );
    const prev = prevRowAggMaterialRef.current;
    if (
      Math.abs(prev.suggestedNetPrice - raw.suggestedNetPrice) < 0.0001 &&
      Math.abs(prev.netAmount - raw.netAmount) < 0.0001 &&
      Math.abs(prev.grossAmount - raw.grossAmount) < 0.0001 &&
      Math.abs(prev.totalAmount - raw.totalAmount) < 0.0001 &&
      Math.abs(prev.taxAmount - raw.taxAmount) < 0.0001 &&
      Math.abs(prev.discount - raw.discount) < 0.0001
    ) {
      return prev;
    }
    prevRowAggMaterialRef.current = raw;
    return raw;
  }, [values, scopedFields, discountBase, currentSummaryType]);

  const summaryTotalAmountValue = rowAggregates.totalAmount;

  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  });

  const setFieldValueRef = useRef(setFieldValue);
  useEffect(() => {
    setFieldValueRef.current = setFieldValue;
  });

  const skipAggCyclesRef = useRef(0);

  useEffect(() => {
    if (isDistributingRef.current) {
      isDistributingRef.current = false;
      skipAggCyclesRef.current = 1; // skip one more cycle
      return;
    }

    if (skipAggCyclesRef.current > 0) {
      skipAggCyclesRef.current -= 1;
      return;
    }

    const currentValues = valuesRef.current;
    const setFV = setFieldValueRef.current;
    const activeValueChangeFieldName = activeValueChangeFieldRef?.current;
    const summaryPairs: Array<[string | undefined, number]> = [
      [summaryFieldNames.suggestedNetPrice, rowAggregates.suggestedNetPrice],
      [summaryFieldNames.taxAmount, rowAggregates.taxAmount],
      [summaryFieldNames.totalAmount, summaryTotalAmountValue],
      [summaryFieldNames.netAmount, rowAggregates.netAmount],
      [
        summaryFieldNames.grossAmount ?? summaryFieldNames["totalGrossAmount"],
        rowAggregates.grossAmount,
      ],
      [summaryFieldNames.discount, rowAggregates.discount],
      // Also update the active visible discount field (which has no attributeMapping)
      [activeSummaryDiscountField?.name, rowAggregates.discount],
      // Keep hidden discount in sync for API mapping
      [summaryDiscountHiddenField?.name, rowAggregates.discount],
    ];

    summaryPairs.forEach(([name, val]) => {
      if (!name) return;
      if (name === activeValueChangeFieldName) return;
      if (Math.abs((Number(currentValues[name]) || 0) - val) > 0.0001) {
        void setFV(name, val);
      }
    });

    const materialPairs: Array<[string | undefined, number]> = [
      [summaryMaterialFieldNames.suggestedNetPrice, rowAggregatesMaterial.suggestedNetPrice],
      [summaryMaterialFieldNames.taxAmount, rowAggregatesMaterial.taxAmount],
      [summaryMaterialFieldNames.totalAmount, rowAggregatesMaterial.totalAmount],
      [summaryMaterialFieldNames.netAmount, rowAggregatesMaterial.netAmount],
      [summaryMaterialFieldNames.grossAmount, rowAggregatesMaterial.grossAmount],
      [summaryMaterialFieldNames.discount, rowAggregatesMaterial.discount],
      // Also update the active visible material discount field
      [activeMaterialDiscountField?.name, rowAggregatesMaterial.discount],
      // Keep hidden material discount in sync
      [summaryDiscountMaterialHiddenField?.name, rowAggregatesMaterial.discount],
    ];
    materialPairs.forEach(([name, val]) => {
      if (!name) return;
      if (name === activeValueChangeFieldName) return;
      if (Math.abs((Number(currentValues[name]) || 0) - val) > 0.0001) {
        void setFV(name, val);
      }
    });
  }, [
    isDistributingRef,
    rowAggregates,
    rowAggregatesMaterial,
    activeValueChangeFieldRef,
    summaryFieldNames,
    summaryMaterialFieldNames,
    summaryTotalAmountValue,
    activeSummaryDiscountField,
    activeMaterialDiscountField,
    summaryDiscountHiddenField,
    summaryDiscountMaterialHiddenField,
    area.fields,
    currentSummaryType,
  ]);

  // On first load: sync active visible summary discount from hidden field.
  // Hidden has attributeMapping; visible does not. Guard with hasPricesPopulated
  // (proxy for "API data has arrived") to avoid false syncs from zeros.
  const prevSummaryHiddenRef = useRef<number>(0);
  useEffect(() => {
    if (!discountBase || !summaryDiscountHiddenField || !activeSummaryDiscountField) return;
    // Don't overwrite a field the user is actively editing
    if (activeValueChangeFieldRef?.current === activeSummaryDiscountField.name) return;
    const hiddenVal = Number(values[summaryDiscountHiddenField.name]) || 0;
    if (hiddenVal === prevSummaryHiddenRef.current) return;
    prevSummaryHiddenRef.current = hiddenVal;
    if (hiddenVal === 0) return;
    const activeVal = Number(values[activeSummaryDiscountField.name]) || 0;
    if (Math.abs(activeVal - hiddenVal) < 0.0001) return;
    void setFieldValue(activeSummaryDiscountField.name, hiddenVal);
  }, [
    discountBase,
    summaryDiscountHiddenField,
    activeSummaryDiscountField,
    values,
    setFieldValue,
    activeValueChangeFieldRef,
  ]);

  const prevMaterialHiddenRef = useRef<number>(0);
  useEffect(() => {
    if (!discountBase || !summaryDiscountMaterialHiddenField || !activeMaterialDiscountField)
      return;
    // Don't overwrite a field the user is actively editing
    if (activeValueChangeFieldRef?.current === activeMaterialDiscountField.name) return;
    const hiddenVal = Number(values[summaryDiscountMaterialHiddenField.name]) || 0;
    if (hiddenVal === prevMaterialHiddenRef.current) return;
    prevMaterialHiddenRef.current = hiddenVal;
    if (hiddenVal === 0) return;
    const activeVal = Number(values[activeMaterialDiscountField.name]) || 0;
    if (Math.abs(activeVal - hiddenVal) < 0.0001) return;
    void setFieldValue(activeMaterialDiscountField.name, hiddenVal);
  }, [
    discountBase,
    summaryDiscountMaterialHiddenField,
    activeMaterialDiscountField,
    values,
    setFieldValue,
    activeValueChangeFieldRef,
  ]);

  if (hasPriceViewPermission && !hasPricesPopulated) return null;

  const isMaterialField = (field: Field) => field.subtype?.endsWith("Material") ?? false;

  return (
    <>
      <div className="summary-row summary-radio-row">
        {area.fields
          .filter((field) => field.type === "radiogroup")
          .map((field) => (
            <GenericField field={field} key={field.name} />
          ))}
      </div>
      <div className="summary-row summary-fields-row">
        {area.fields
          .filter((field) => field.type !== "radiogroup" && !isMaterialField(field))
          .toSorted((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((field) => {
            return (
              <GenericField
                field={applyFieldPermissions(field, currentSummaryType)}
                key={field.name}
                className={`spare-parts-field ${field?.size === "2" ? "small" : ""}`}
              />
            );
          })}
      </div>
      {types.has(currentSummaryType) && (
        <div className="summary-fields-row summary-material-row">
          <div className="summary-material-label">{t("SummaryOfMaterialItems")}</div>
          <div className="summary-material-fields">
            {area.fields
              .filter((field) => isMaterialField(field))
              .toSorted((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map((field) => (
                <GenericField
                  field={applyFieldPermissions(field, currentSummaryType)}
                  key={field.name}
                  className={`spare-parts-field ${field?.size === "2" ? "small" : ""}`}
                />
              ))}
          </div>
        </div>
      )}
    </>
  );
}

export default SummaryArea;
