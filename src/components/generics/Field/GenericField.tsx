import { Button, Checkbox, TextField, TextArea, Icon } from "@bosch/react-frok";
import "./GenericField.scss";
import Field, { FieldValueType } from "./GenericField.types";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useFormikContext, type FormikErrors } from "formik";
import type { ReactElement, RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import RadioGroup from "components/ui/RadioGroup/RadioGroup";
import { isFieldVisible } from "../utils";
import DatePicker from "components/ui/DatePicker/DatePicker";
import NumberInputFiled from "components/ui/NumberInputField/NumberInputFiled";
import FileUpload, { Attachments } from "components/ui/FileUpload/FileUpload";
import AutoComplete from "components/ui/AutoComplete/AutoComplete";
import DynamicDropdown from "components/ui/DynamicDropdown/DynamicDropdown";
import {
  onBlurActions,
  updateDependentFields,
  handleFaultCodeSelection,
  resolveIsRequired,
} from "./GenericField.utils";
import { useContext, useRef, useState } from "react";
import useFieldVisibilityReset from "./useFieldVisibilityReset";
import { GenericFormContext } from "../Form/GenericForm.context";
import {
  handleAutoCompleteSelect,
  getSparePartCompatibilityMessage,
  handleResetAutoCompleteFields,
} from "../../ui/AutoComplete/AutoComplete.helper";
import { AutoCompleteOption } from "../../ui/AutoComplete/OptionItem/OptionItem";
import InfoIconWithTooltip from "../../ui/TooltipContent/InfoIconWithTooltip";
import { useHasPermission } from "hooks/useHasPermission";
import StatusIndicator from "components/ui/StatusIndicator/StatusIndicator";
import { CountryConfig } from "api/services/countryConfiguration/countryConfiguration";
import { BareToolOption } from "api/services/orders/orders.types";

import FieldError from "./components/FieldError";

const LOCKED_VALUE_CHANGE_FIELDS_WHILE_EDITING = new Set([
  "onSummaryTotalAmountChange",
  "onSummaryNetAmountChange",
  "onSummaryDiscountChange",
  "onSummaryDiscountNetChange",
]);

type GenericFieldProps = {
  field: Field;
} & React.HTMLAttributes<HTMLSpanElement>;

interface FieldRenderCtx {
  field: Field;
  fullWidth: string;
  className: string | undefined;
  restProps: React.HTMLAttributes<HTMLSpanElement>;
  displayLabel: string;
  effectiveIsDisabled: boolean;
  values: Record<string, unknown>;
  setFieldValue: (
    field: string,
    value: unknown,
  ) => Promise<void | FormikErrors<Record<string, unknown>>>;
  allFields: Field[];
  setAllFields: React.Dispatch<React.SetStateAction<Field[]>>;
  formikContext: ReturnType<typeof useFormikContext<Record<string, unknown>>>;
  t: TFunction<"translation", "app">;
  handleChange: (name: string, newValue: FieldValueType) => Promise<void>;
  isPriceFocused: boolean;
  setIsPriceFocused: (v: boolean) => void;
  isPriceFocusedZero: boolean;
  setIsPriceFocusedZero: (v: boolean) => void;
  isPercentageField: boolean;
  isAmountField: boolean;
  shouldLockValueChangeFieldWhileEditing: boolean;
  activeValueChangeFieldRef?: RefObject<string | null>;
  onDeleteStart?: () => void;
  onDeleteEnd?: () => void;
  autocompleteValidation?: RefObject<Record<string, boolean>>;
  sparePartBelongsToTool?: RefObject<Record<string, boolean>>;
  radioSourceCallbacks?: Record<string, () => unknown[]>;
  isInfoIcon?: boolean;
  infoText?: string;
  /** Stable per-field-instance storage for diagnosticType's preserved sibling values. */
  preserveOtherFieldValueRef: RefObject<Record<string, unknown>[] | null>;
}
const EDITABLE_TYPES = new Set(["COMMERCIAL_GOODWILL", "CHARGEABLE", "SPECIAL_CONTRACT"]);

/** Subtypes whose values are preserved while diagnosticType is set to an EDITABLE_TYPES value. */
const PRESERVE_FIELDS_SUBTYPE = [
  "diagnosticDiscountHidden",
  "diagnosticDiscountNetHidden",
  "diagnosticTotalAmountHidden",
  "diagnosticDiscount",
  "diagnosticNetAmount",
  "diagnosticTotalAmount",
];

const handleFieldChangeAsync = async (
  name: string,
  newValue: FieldValueType,
  setFieldValue: (
    field: string,
    value: unknown,
  ) => Promise<void | FormikErrors<Record<string, unknown>>>,
  allFields: Field[],
  field: Field,
  formikContext: ReturnType<typeof useFormikContext<Record<string, unknown>>>,
  actionCallbacks: Record<string, (...args: unknown[]) => unknown>,
): Promise<void> => {
  await setFieldValue(name, newValue);

  const sameDataField = allFields.find((f) => f.name === name);
  if (sameDataField?.sameDataFieldAs) {
    await setFieldValue(sameDataField.sameDataFieldAs, newValue);
  }

  const originalNameToMatch = sameDataField?.fieldMapping?.originalName;

  if (allFields && originalNameToMatch) {
    for (const dependentField of allFields) {
      const byValueOr = dependentField.requiredDependentFields?.byValueOr || [];
      const byValueAnd = dependentField.requiredDependentFields?.byValueAnd || [];
      const allDependencies = [...byValueOr, ...byValueAnd];
      const hasDependency = allDependencies.some((dep) => dep.fieldName === originalNameToMatch);

      if (hasDependency) {
        const isMet =
          byValueOr.some(
            (dep) => dep.fieldName === originalNameToMatch && dep.fieldValue === newValue,
          ) ||
          byValueAnd.every((dep) =>
            dep.fieldName === originalNameToMatch ? dep.fieldValue === newValue : true,
          );
        void formikContext.setFieldTouched(dependentField.name, isMet, true);
      }
    }
  }

  if (field.onValueChange) {
    const handler = actionCallbacks[field.onValueChange];
    if (typeof handler === "function") {
      const result = handler(newValue);
      if (result instanceof Promise) {
        result.catch((error: unknown) => {
          console.error(`onValueChange ${field.onValueChange} failed:`, error);
        });
      }
    }
  }
};

/**
 * Preserves the row's hidden price values when diagnosticType switches into an
 * EDITABLE_TYPES value, and restores them when it switches back out.
 *
 * The snapshot is kept in a ref owned by this field's own component instance rather
 * than on the shared `allFields` array/state: allFields is rebuilt and replaced by
 * several unrelated effects (position sync, diagnostics manager rebuilds, etc.), none
 * of which know to carry custom runtime properties forward, so storing it there caused
 * the preserved values to silently disappear before they could be restored.
 */
const checkPrices = (
  field: Field,
  formikContext: ReturnType<typeof useFormikContext<Record<string, unknown>>>,
  allFields: Field[],
  value: FieldValueType,
  preserveOtherFieldValueRef: RefObject<Record<string, unknown>[] | null>,
) => {
  if (field.subtype !== "diagnosticType") {
    return;
  }

  if (EDITABLE_TYPES.has(value as string)) {
    // Already preserved from a prior switch into an editable type — keep the
    // original snapshot instead of overwriting it with already-edited values.
    if (preserveOtherFieldValueRef.current) return;

    const preservedValuesForFields: Record<string, unknown>[] = PRESERVE_FIELDS_SUBTYPE.map(
      (subtype) => {
        const fieldToPreserve = allFields.find(
          (f) =>
            f.subtype === subtype && f.name.startsWith(field.fieldMapping?.nameStartsWith || ""),
        );
        if (fieldToPreserve) {
          return { [fieldToPreserve.name]: formikContext.values[fieldToPreserve.name] };
        }
        return undefined;
      },
    ).filter((item): item is Record<string, unknown> => item !== undefined);

    preserveOtherFieldValueRef.current = preservedValuesForFields;
    return;
  }

  if (preserveOtherFieldValueRef.current) {
    preserveOtherFieldValueRef.current.forEach((preservedField) => {
      const [fieldName, preservedValue] = Object.entries(preservedField)[0];
      void formikContext.setFieldValue(fieldName, preservedValue);
    });
    preserveOtherFieldValueRef.current = null;
  }
};
const resolvePriceFieldText = (
  rawValue: FieldValueType | null | undefined,
  isPriceFocused: boolean,
  isPriceFocusedZero: boolean,
  effectiveIsDisabled: boolean,
  isPercentageField: boolean,
  isAmountField: boolean,
): string => {
  if (isPriceFocusedZero || rawValue == null || rawValue === "") return "";
  const numericValue = Number(rawValue);
  const shouldFormat = (isPercentageField || isAmountField) && Number.isFinite(numericValue);
  if (!shouldFormat) return String(rawValue);
  return !effectiveIsDisabled && isPriceFocused ? String(rawValue) : numericValue.toFixed(2);
};
const shouldSetIsPriceSetManually = (
  field: Field,
  values: Record<string, unknown>,
  allFields: Field[],
  isPriceManuallyFieldName: string,
) => {
  const typeFieldName = `${field?.fieldMapping?.nameStartsWith}jobType`;

  if (allFields?.some((f) => f.name === isPriceManuallyFieldName)) {
    if (values[typeFieldName] && EDITABLE_TYPES.has(values[typeFieldName] as string)) {
      return true;
    }
    return false;
  }
  return false;
};
const renderTextPriceField = (ctx: FieldRenderCtx): ReactElement => {
  const {
    field,
    fullWidth,
    className,
    restProps,
    displayLabel,
    effectiveIsDisabled,
    values,
    setFieldValue,
    allFields,
    formikContext,
    t,
    handleChange,
    isPriceFocused,
    setIsPriceFocused,
    isPriceFocusedZero,
    setIsPriceFocusedZero,
    isPercentageField,
    isAmountField,
    shouldLockValueChangeFieldWhileEditing,
    activeValueChangeFieldRef,
    isInfoIcon,
    infoText,
  } = ctx;
  const { type, name } = field;
  const hiddenClass = field.isHidden ? "generic-field-hidden" : "";
  const rawValue = values[name] as FieldValueType | null | undefined;
  const nonPriceText = rawValue == null ? "" : String(rawValue);
  const fieldTextValue =
    type === "price"
      ? resolvePriceFieldText(
          rawValue,
          isPriceFocused,
          isPriceFocusedZero,
          effectiveIsDisabled,
          isPercentageField,
          isAmountField,
        )
      : nonPriceText;
  return (
    <span
      className={`${fullWidth} generic-field-text-input ${hiddenClass} ${className || ""}`}
      {...restProps}
    >
      <TextField
        type={type as "text"}
        as="div"
        id={name}
        label={displayLabel}
        className="a-text-field"
        name={name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const shouldReturn = updateDependentFields(
            field,
            formikContext,
            allFields,
            t,
            e.target.value,
          );
          if (shouldReturn) return;
          const isPriceManuallyFieldName = `${field?.fieldMapping?.nameStartsWith}isPriceSetManually`;
          if (
            type === "price" &&
            field.fieldMapping?.nameStartsWith &&
            shouldSetIsPriceSetManually(field, values, allFields, isPriceManuallyFieldName)
          ) {
            void setFieldValue(isPriceManuallyFieldName, true);
          }
          if (isPriceFocusedZero) setIsPriceFocusedZero(false);
          void handleChange(name, e.target.value);
        }}
        value={fieldTextValue}
        disabled={effectiveIsDisabled}
        onFocus={() => {
          if (type === "price" && !effectiveIsDisabled) {
            setIsPriceFocused(true);
            if (Number(values[name]) === 0) setIsPriceFocusedZero(true);
          }
          if (shouldLockValueChangeFieldWhileEditing && activeValueChangeFieldRef) {
            activeValueChangeFieldRef.current = name;
          }
        }}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
          if (type === "price") {
            setIsPriceFocused(false);
            setIsPriceFocusedZero(false);
            const currentVal = values[name];
            if (currentVal === "" || currentVal == null) void setFieldValue(name, 0);
          }
          onBlurActions(field, e, formikContext, t);
          if (
            shouldLockValueChangeFieldWhileEditing &&
            activeValueChangeFieldRef?.current === name
          ) {
            setTimeout(() => {
              if (activeValueChangeFieldRef?.current === name)
                activeValueChangeFieldRef.current = null;
            }, 0);
          }
        }}
      />
      {isInfoIcon && <InfoIconWithTooltip name={name} infoText={infoText || ""} />}
      <FieldError name={name} />
    </span>
  );
};

const renderNumberField = (ctx: FieldRenderCtx): ReactElement => {
  const {
    field,
    fullWidth,
    className,
    restProps,
    displayLabel,
    effectiveIsDisabled,
    values,
    setFieldValue,
  } = ctx;
  const { name } = field;
  return (
    <span className={`${fullWidth} ${className || ""}`} {...restProps}>
      <NumberInputFiled
        name={name}
        label={displayLabel}
        step={field.step as number}
        value={(values[name] as string) || ""}
        disabled={effectiveIsDisabled}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const newValue = e.target.value;
          void setFieldValue(name, newValue === "" ? (field.defaultValue ?? "") : newValue);
        }}
        minValue={field.minValue || 0}
      />
      <FieldError name={name} />
    </span>
  );
};

const renderButtonField = (): ReactElement => {
  return <Button />;
};

const renderRadiogroupField = (ctx: FieldRenderCtx): ReactElement => {
  const { field, effectiveIsDisabled, handleChange, radioSourceCallbacks } = ctx;
  const { name, radioButtons, defaultValue } = field;
  const resolvedRadioButtons = (
    field.radioButtonsSource
      ? (radioSourceCallbacks?.[field.radioButtonsSource]?.() ?? [])
      : (radioButtons?.map((button) => ({ ...button, value: button.value })) ?? [])
  ) as Parameters<typeof RadioGroup>[0]["radioButtons"];
  return (
    <RadioGroup
      name={name}
      direction="row"
      radioButtons={resolvedRadioButtons}
      defaultValue={defaultValue ?? undefined}
      disabled={effectiveIsDisabled}
      onChange={(value: FieldValueType) => {
        void handleChange(name, value);
      }}
    />
  );
};

const renderCheckboxField = (ctx: FieldRenderCtx): ReactElement => {
  const { field, fullWidth, className, restProps, effectiveIsDisabled, values, t, handleChange } =
    ctx;
  const { name, label, infoText } = field;

  if (name === "grantAccess") {
    return (
      <span className={`${fullWidth} ${className || ""}`} {...restProps}>
        <span className="grant-access-info">
          <Icon iconName="info-i-frame" />
          <p>{infoText}</p>
        </span>
        <span className="grant-access-checkbox">
          <Checkbox
            id={name}
            label={`${label ? t(label) : ""} ${field.isRequired ? "*" : ""}`}
            checked={(values[name] as boolean) || false}
            disabled={effectiveIsDisabled}
            onChange={(e) => {
              void handleChange(name, e.target.checked);
            }}
          />
        </span>
      </span>
    );
  }
  return (
    <span className={`${fullWidth} ${className || ""}`} {...restProps}>
      <Checkbox
        id={name}
        label={`${label ? t(label) : ""} ${field.isRequired ? "*" : ""}`}
        checked={(values[name] as boolean) || false}
        disabled={effectiveIsDisabled}
        onChange={(e) => {
          void handleChange(name, e.target.checked);
        }}
      />
    </span>
  );
};

const renderDatepickerField = (ctx: FieldRenderCtx): ReactElement => {
  const { field, fullWidth, className, restProps, displayLabel, effectiveIsDisabled } = ctx;
  const { name, calendar } = field;
  return (
    <span className={`${fullWidth} ${className || ""}`} {...restProps}>
      <DatePicker
        name={name}
        label={displayLabel}
        calendar={calendar}
        disabled={effectiveIsDisabled}
      />
      <FieldError name={name} />
    </span>
  );
};

const renderDropdownField = (ctx: FieldRenderCtx): ReactElement => {
  const {
    field,
    fullWidth,
    className,
    restProps,
    effectiveIsDisabled,
    values,
    setFieldValue,
    allFields,
    formikContext,
    t,
    handleChange,
  } = ctx;
  const { name, label, subtype, defaultValue } = field;
  const isMulti = field.multiSelect === true;
  const dropdownValue = isMulti
    ? (values[name] as string[]) || []
    : (values[name] as string) || (defaultValue as string) || "";
  return (
    <span className={`${fullWidth} ${className || ""}`} {...restProps}>
      <DynamicDropdown
        name={name}
        label={label}
        subtype={subtype}
        multiSelect={isMulti}
        className={`a-dropdown ${fullWidth}`}
        value={dropdownValue}
        onChange={(value) => {
          if (typeof value === "string")
            updateDependentFields(field, formikContext, allFields, t, value);
          checkPrices(field, formikContext, allFields, value, ctx.setAllFields);
          void handleChange(name, value);
        }}
        onRawOptionSelect={
          subtype === "diagnosticFaultCode"
            ? (rawItem) => {
                handleFaultCodeSelection(rawItem, setFieldValue, allFields, values);
              }
            : undefined
        }
        optionsEndpoint={field.optionsEndpoint}
        options={field.options}
        required={field.isRequired}
        disabled={effectiveIsDisabled}
        isSearchable={!!field.isSearchable}
      />
      <FieldError name={name} />
    </span>
  );
};

const renderUploadField = (ctx: FieldRenderCtx): ReactElement => {
  const {
    field,
    fullWidth,
    className,
    restProps,
    effectiveIsDisabled,
    values,
    setFieldValue,
    onDeleteStart,
    onDeleteEnd,
  } = ctx;
  const { name } = field;
  const currentFiles = (values[name] as Attachments[]) || [];
  return (
    <span className={`${fullWidth} ${className || ""}`} {...restProps}>
      <FileUpload
        name={name}
        isDisabled={effectiveIsDisabled}
        onFilesSelected={(files) => {
          void setFieldValue(name, files);
        }}
        fileTypeOptions={Array.isArray(field.options) ? field.options : []}
        initialFiles={currentFiles}
        onDeleteStart={onDeleteStart}
        existingFiles={(field.existingFiles as { name: string }[]) || []}
        onDeleteEnd={onDeleteEnd}
        allowedFormats={field?.allowedFormats || []}
      />
      <FieldError name={name} />
    </span>
  );
};

const renderTextareaField = (ctx: FieldRenderCtx): ReactElement => {
  const { field, fullWidth, className, restProps, effectiveIsDisabled, values, t, handleChange } =
    ctx;
  const { name, label } = field;
  return (
    <span className={`${fullWidth} ${className || ""}`} {...restProps}>
      <TextArea
        id={name}
        label={`${label ? t(label) : ""} ${field.isRequired ? "*" : ""}`}
        name={name}
        disabled={effectiveIsDisabled}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          void handleChange(name, e.target.value);
        }}
        value={(values[name] as string) || ""}
        placeholder=""
      />
      <FieldError name={name} />
    </span>
  );
};

const renderAutocompleteField = (ctx: FieldRenderCtx): ReactElement => {
  const {
    field,
    fullWidth,
    className,
    restProps,
    effectiveIsDisabled,
    values,
    setFieldValue,
    allFields,
    formikContext,
    t,
    handleChange,
    autocompleteValidation,
    sparePartBelongsToTool,
  } = ctx;
  const { name, label } = field;
  const effectiveIsRequired = resolveIsRequired(field, values);
  const { validateForm } = formikContext;

  // Extract context parameters for spare parts search
  let position = "";
  let brand = "";
  let isExchange = false;
  let bareTool = "";

  const isSparePart = name?.toLowerCase().includes("sparepartnumber");
  if (isSparePart) {
    // Extract position from the same row (e.g., diagnosticMaterials#0.position)
    const positionFieldName = name.replace(/sparepartnumber/i, "position");
    position = (values[positionFieldName] as string) || "";

    // Extract actionType to determine isExchange
    const actionType = (values["actionType"] as string) || "";
    isExchange = ["NEW_TOOL_EXCHANGE", "SPARE_PARTS_EXCHANGE", "ACCESSORIES_EXCHANGE"].includes(
      actionType,
    );

    // Extract brand from asset data if available
    const assetBrand = (values["brand"] as string) || (values["asset.brand"] as string) || "";
    brand = assetBrand;

    // Extract bareTool (bare tool number) if available
    // Try multiple possible keys to support both CreateJob and JobOverview
    const bareToolValue =
      (values["bareToolNumber"] as string) ||
      (values["asset.bareToolNumber"] as string) ||
      (values["baretoolNumber"] as string) ||
      (values["assetData#0_asset_bareToolNumber"] as string) ||
      "";
    bareTool = bareToolValue;
  }

  const incompatibleSelectionMessage = getSparePartCompatibilityMessage(
    field,
    name,
    values,
    allFields,
    sparePartBelongsToTool?.current,
  );

  return (
    <span className={`${fullWidth} ${className || ""}`} {...restProps}>
      <AutoComplete
        name={name}
        label={`${label ? t(label) : ""} ${effectiveIsRequired ? "*" : ""}`}
        disabled={effectiveIsDisabled}
        minLength={field.minLength || 1}
        brand={brand}
        position={position}
        isExchange={isExchange}
        bareTool={bareTool}
        incompatibleSelectionMessage={incompatibleSelectionMessage}
        onChange={(value: string) => {
          const isSparePartNumberField = name?.toLowerCase().includes("sparepartnumber");
          if (isSparePartNumberField && sparePartBelongsToTool) {
            sparePartBelongsToTool.current[name] = false;
          }

          if (value) {
            void handleChange(name, value);
          } else {
            void (async () => {
              await handleResetAutoCompleteFields(field, setFieldValue, allFields, handleChange);
            })();
          }
        }}
        onSelect={(option: AutoCompleteOption) => {
          void (async () => {
            if (name?.toLowerCase().includes("sparepartnumber") && sparePartBelongsToTool) {
              sparePartBelongsToTool.current[name] =
                (option as BareToolOption)?.belongsToTool === true;
            }
            await handleAutoCompleteSelect(option, field, setFieldValue, allFields);
            await validateForm();
          })();
        }}
        onSetFieldError={(fieldName: string, message: string) => {
          formikContext.setFieldError(fieldName, message);
        }}
        onSetFieldTouched={(fieldName: string, touched: boolean) => {
          void formikContext.setFieldTouched(fieldName, touched, false);
        }}
        onClearFieldError={(fieldName: string) => {
          formikContext.setFieldError(fieldName, "");
        }}
        onValidation={(isValid: boolean) => {
          if (
            (name?.toLowerCase().includes("baretoolnumber") ||
              name?.toLowerCase().includes("toolmodelname") ||
              name?.toLowerCase().includes("sparepartnumber")) &&
            autocompleteValidation
          ) {
            autocompleteValidation.current[name] = isValid;
          }
        }}
        value={(values[name] as string) || ""}
        isInfoIcon={field.isInfoIcon}
        infoText={field.infoText || ""}
      />
      <FieldError name={name} />
    </span>
  );
};

const renderBadgeField = (ctx: FieldRenderCtx): ReactElement => {
  const { field, values, t } = ctx;
  const { name } = field;
  return (
    <div className="spare-part-status">
      <span>{t("status")}</span>
      <StatusIndicator status={values[name] as string} type="sparePart" showStatusMessage={false} />
      <input type="text" value={(values[name] as string) ?? ""} onChange={() => {}} hidden={true} />
    </div>
  );
};

type FieldRenderer = (ctx: FieldRenderCtx) => ReactElement;

const FIELD_RENDERERS: Record<string, FieldRenderer> = {
  text: renderTextPriceField,
  email: renderTextPriceField,
  tel: renderTextPriceField,
  price: renderTextPriceField,
  number: renderNumberField,
  button: renderButtonField,
  radiogroup: renderRadiogroupField,
  checkbox: renderCheckboxField,
  datepicker: renderDatepickerField,
  dropdown: renderDropdownField,
  upload: renderUploadField,
  textarea: renderTextareaField,
  autocomplete: renderAutocompleteField,
  badge: renderBadgeField,
};

const GenericField = ({ field, className, ...restProps }: Readonly<GenericFieldProps>) => {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const {
    type,
    size,
    label,
    name,
    subtype,
    isDisabled,
    isInfoIcon,
    infoText,
    disabledForStatuses,
  } = field;
  const formikContext = useFormikContext<Record<string, unknown>>();
  const formValues = formikContext.values;
  const { setFieldValue } = formikContext;
  const userData = queryClient.getQueryData<{ countryCode?: string }>(["user"]);
  const countryConfiguration = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    userData?.countryCode,
  ]);
  const currencySymbol = countryConfiguration?.currencySymbol || "";
  const isPercentageField = Boolean(subtype && /tax|discount/i.test(subtype));
  const isAmountField = Boolean(subtype && /amount|price/i.test(subtype));
  const {
    allFields,
    setAllFields,
    onDeleteStart,
    onDeleteEnd,
    autocompleteValidation,
    sparePartBelongsToTool,
    radioSourceCallbacks,
    actionCallbacks,
    activeValueChangeFieldRef,
  } = useContext(GenericFormContext);
  const hasPermission = useHasPermission(field.permissions);
  const isVisible = isFieldVisible(field, allFields || [], formValues);

  const status = formValues["jobStatus"] as string;
  const isStatusDisabled = disabledForStatuses && status && disabledForStatuses.includes(status);
  const effectiveIsDisabled = isDisabled || !!isStatusDisabled;
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isPriceFocusedZero, setIsPriceFocusedZero] = useState(false);

  useFieldVisibilityReset({
    isVisible,
    name,
    formValues: formValues,
    setFieldValue: setFieldValue as (field: string, value: unknown) => void,
    sameDataFieldAs: field.sameDataFieldAs,
    defaultValue: field.defaultValue,
  });

  if (!isVisible) return null;
  if (!hasPermission) return null;

  const fullWidth = size === "3" ? "full-width" : "";
  const values = formValues;
  const shouldLockValueChangeFieldWhileEditing =
    !!field.onValueChange && LOCKED_VALUE_CHANGE_FIELDS_WHILE_EDITING.has(field.onValueChange);
  const translatedLabel = label ? t(label) : "";

  let labelSuffix = "";
  if (isPercentageField && !isAmountField) {
    labelSuffix = " (%)";
  } else if (isAmountField && currencySymbol) {
    labelSuffix = ` (${currencySymbol})`;
  }
  const displayLabel = `${translatedLabel}${labelSuffix} ${field.isRequired ? "*" : ""}`;

  const handleChange = (changeName: string, newValue: FieldValueType) =>
    handleFieldChangeAsync(
      changeName,
      newValue,
      setFieldValue,
      allFields,
      field,
      formikContext,
      actionCallbacks,
    );

  const renderer = FIELD_RENDERERS[type];
  const ctx: FieldRenderCtx = {
    field,
    fullWidth,
    className,
    restProps,
    displayLabel,
    effectiveIsDisabled,
    values,
    setFieldValue,
    allFields,
    formikContext,
    t,
    handleChange,
    isPriceFocused,
    setIsPriceFocused,
    isPriceFocusedZero,
    setIsPriceFocusedZero,
    isPercentageField,
    isAmountField,
    shouldLockValueChangeFieldWhileEditing,
    activeValueChangeFieldRef,
    onDeleteStart,
    onDeleteEnd,
    autocompleteValidation,
    sparePartBelongsToTool,
    radioSourceCallbacks,
    isInfoIcon,
    infoText,
    setAllFields,
  };

  return renderer ? (
    renderer(ctx)
  ) : (
    <div className="generic-field">{type + " FIELD: " + label}</div>
  );
};

export default GenericField;
