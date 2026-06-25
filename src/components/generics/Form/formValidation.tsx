import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import Section from "../Section/GenericSection.types";
import Field from "../Field/GenericField.types";
import { isFieldVisible } from "../utils";
import GenericForm, { ActionMandatoryFields } from "./GenericForm.types";

export type ValidationErrors = Record<string, string>;

export const getMandatoryFieldsForSection = (section: Section, actionName: string): string[] => {
  if (section.actions === null || section.actions === undefined) {
    return [];
  }
  const action = section.actions?.find((a) => a.name?.toLowerCase() === actionName?.toLowerCase());
  return action?.mandatoryFields ?? [];
};

export const getMandatoryFieldsForForm = (form: GenericForm, actionName: string): string[] => {
  if (form.actions === null || form.actions === undefined) {
    return [];
  }
  const action = form.actions?.find((a) => a.name?.toLowerCase() === actionName?.toLowerCase());
  return action?.mandatoryFields ?? [];
};

const areAllFieldsEmpty = (fieldNames: string[], values: Record<string, unknown>): boolean => {
  return fieldNames.every((fieldName) => {
    const value = values[fieldName];
    return value === undefined || value === null || value === "";
  });
};

const checkDependencyCondition = (
  field: Field,
  values: Record<string, unknown>,
): { isMet: boolean; hasCondition: boolean } => {
  const dep = field.requiredDependentFields;
  if (!dep || (!dep.byValueAnd && !dep.byValueOr)) {
    return { isMet: false, hasCondition: false };
  }

  let andConditionMet = false;
  let orConditionMet = false;

  if (dep.byValueAnd && dep.byValueAnd.length > 0) {
    andConditionMet = dep.byValueAnd.every((el) => values[el.fieldName] === el.fieldValue);
  }
  if (dep.byValueOr && dep.byValueOr.length > 0) {
    orConditionMet = dep.byValueOr.some((el) => values[el.fieldName] === el.fieldValue);
  }

  return { isMet: andConditionMet || orConditionMet, hasCondition: true };
};

const hasRequiredDependency = (field: Field): boolean => {
  return (
    field.requiredDependentFields !== undefined &&
    (field.requiredDependentFields.byValueAnd !== undefined ||
      field.requiredDependentFields.byValueOr !== undefined)
  );
};

export const getUploadFieldErrors = (field: Field, values: Record<string, unknown>): string[] => {
  if (field.type !== "upload") return [];

  const value = values[field.name];
  const uploadedFiles = Array.isArray(value) ? value : [];
  const requiredDocs = field.requiredDocuments;

  if (!requiredDocs || requiredDocs.length === 0) return [];

  const failingMessages: string[] = [];

  for (const reqDoc of requiredDocs) {
    const conditionMet = reqDoc.requiredForFields.every(({ fieldName, fieldValue }) =>
      fieldValue === "*" ? Boolean(values[fieldName]) : values[fieldName] === fieldValue,
    );

    if (conditionMet) {
      const hasRequiredFile = uploadedFiles.some((file) =>
        reqDoc.documentTypes.some((docType) => file?.type?.toLowerCase() === docType.toLowerCase()),
      );

      if (!hasRequiredFile) {
        failingMessages.push(reqDoc.errorMessage);
      }
    }
  }

  if (failingMessages.length > 0) {
    field.patternText = failingMessages[0];
  }

  return failingMessages;
};

export const getVisibleFieldsWithErrors = (
  fields: Field[],
  errors: Record<string, unknown>,
  values: Record<string, unknown>,
): string[] => {
  const visibleFields = [];
  for (const field of fields) {
    const fieldName = field.name;
    const isVisible = isFieldVisible(field, fields, values);
    if (isVisible && errors[fieldName]) {
      visibleFields.push(fieldName);
    }
  }

  return visibleFields;
};

// ── Helpers extracted from validateSingleField to reduce cognitive complexity ─

function applyGroupErrors(
  list: string[],
  errors: Record<string, string>,
  msgKey: string,
  t: (key: string) => string,
  onlyTouched: boolean | undefined,
  touchedFields: Record<string, boolean> | undefined,
): void {
  for (const dep of list) {
    if (!onlyTouched || touchedFields?.[dep]) {
      errors[dep] = t(msgKey);
    }
  }
}

function clearMatchingGroupErrors(
  list: string[],
  errors: Record<string, string>,
  msg: string,
): void {
  for (const dep of list) {
    if (errors[dep] === msg) delete errors[dep];
  }
}

function validateAllEmptyGroup(
  field: Field,
  errors: Record<string, string>,
  values: Record<string, unknown>,
  onlyTouched: boolean | undefined,
  touchedFields: Record<string, boolean> | undefined,
  t: (key: string) => string,
  byValueConditionMet: boolean,
): boolean {
  const allEmptyList = field.requiredDependentFields?.allEmpty;
  if (!byValueConditionMet && allEmptyList && allEmptyList.length > 0) {
    const groupAllEmpty = areAllFieldsEmpty(allEmptyList, values);
    if (groupAllEmpty) {
      const msgKey = field.requiredDependentFields?.errorMessageAllEmpty;
      if (msgKey) applyGroupErrors(allEmptyList, errors, msgKey, t, onlyTouched, touchedFields);
      return true;
    }
    const msgKey = field.requiredDependentFields?.errorMessageAllEmpty;
    if (msgKey) clearMatchingGroupErrors(allEmptyList, errors, t(msgKey));
  }
  return false;
}

interface RequiredFieldCheckParams {
  errors: Record<string, string>;
  fieldName: string;
  shouldCheckRequired: boolean;
  hasByValueCondition: boolean;
  byValueConditionMet: boolean;
  isCurrentFieldEmpty: boolean;
  fieldLabel: string;
  t: (key: string) => string;
}

function handleRequiredFieldCheck({
  errors,
  fieldName,
  shouldCheckRequired,
  hasByValueCondition,
  byValueConditionMet,
  isCurrentFieldEmpty,
  fieldLabel,
  t,
}: RequiredFieldCheckParams): boolean {
  if (!shouldCheckRequired) return false;
  if (hasByValueCondition) {
    if (!byValueConditionMet) {
      delete errors[fieldName];
    }
  } else if (isCurrentFieldEmpty) {
    errors[fieldName] = `${t(fieldLabel)} ${t("isRequired")}`;
    return true;
  }
  return false;
}

function validatePattern(
  field: Field,
  errors: Record<string, string>,
  fieldName: string,
  value: unknown,
  hasValue: boolean,
  t: (key: string) => string,
): void {
  if (!field.pattern || !hasValue) return;
  const regex = new RegExp(atob(field.pattern));
  const valueToTest =
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";
  if (regex.test(valueToTest)) {
    if (
      field.patternText &&
      typeof field.patternText === "string" &&
      errors[fieldName] === t(field.patternText)
    ) {
      delete errors[fieldName];
    }
    if (
      field.sameDataFieldAs &&
      field.patternText &&
      typeof field.patternText === "string" &&
      errors[field.sameDataFieldAs] === t(field.patternText)
    ) {
      delete errors[field.sameDataFieldAs];
    }
  } else {
    const msg =
      field.patternText && typeof field.patternText === "string"
        ? t(field.patternText)
        : t("invalidFormat");
    errors[fieldName] = msg;
    if (field.sameDataFieldAs) {
      errors[field.sameDataFieldAs] = msg;
    }
  }
}

function validateLengthAndRange(
  field: Field,
  errors: Record<string, string>,
  fieldName: string,
  value: unknown,
  hasValue: boolean,
  t: (key: string) => string,
): void {
  if (field.maxLength && hasValue && typeof value === "string" && value.length > field.maxLength) {
    errors[fieldName] = `${t("valueExceedsMaxLength")} ${field.maxLength}`;
    return;
  }
  if (field.minLength && hasValue && typeof value === "string" && value.length < field.minLength) {
    errors[fieldName] = `${t("valueIsShorterThanMinLength")} ${field.minLength}`;
    return;
  }
  if (field.minValue !== undefined && typeof value === "number" && value < field.minValue) {
    errors[fieldName] = `${t("valueIsLessThanMinValue")} ${field.minValue}`;
    return;
  }
  if (field.maxValue && typeof value === "number" && value > field.maxValue) {
    errors[fieldName] = `${t("valueExceedsMaxValue")} ${field.maxValue}`;
  }
}

function validateAutocompleteField({
  field,
  errors,
  fieldName,
  value,
  hasValue,
  autocompleteValidationRef,
  t,
}: {
  field: Field;
  errors: Record<string, string>;
  fieldName: string;
  value: unknown;
  hasValue: boolean;
  autocompleteValidationRef: RefObject<Record<string, boolean>> | undefined;
  touchedFields: Record<string, boolean> | undefined;
  t: (key: string) => string;
}): void {
  if (
    field.type !== "autocomplete" ||
    (!fieldName?.toLowerCase().includes("baretoolnumber") &&
      !fieldName?.toLowerCase().includes("toolmodelname"))
  ) {
    return;
  }

  if (hasValue && typeof value === "string") {
    const isValidated = autocompleteValidationRef?.current[fieldName];
    if (isValidated === false) {
      const isBareTool = fieldName?.toLowerCase().includes("baretoolnumber");
      const message = isBareTool ? t("bareToolNumberNotFound") : t("toolModelNameNotFound");
      errors[fieldName] = message.replace(isBareTool ? "{{id}}" : "{{name}}", value);
    } else if (isValidated === true) {
      delete errors[fieldName];
    }
  }
}

function validateSerialNumberField({
  field,
  errors,
  fieldName,
  value,
  hasValue,
  values,
  t,
}: {
  field: Field;
  errors: Record<string, string>;
  fieldName: string;
  value: unknown;
  hasValue: boolean;
  values: Record<string, unknown>;
  touchedFields: Record<string, boolean> | undefined;
  t: (key: string) => string;
}): void {
  const originalName = field.fieldMapping?.originalName;
  if (originalName !== "serialNumber") {
    return;
  }

  if (!hasValue || typeof value !== "string") {
    delete errors[fieldName];
    return;
  }

  const serialValue = value;
  if (
    (serialValue.length < 9 && serialValue.length !== 3 && serialValue !== "999") ||
    serialValue.length === 10 ||
    serialValue.length === 11
  ) {
    const brandKey = fieldName.split("_serialNumber")[0] + "_brand";
    const brandValue = values[brandKey];
    const message =
      brandValue === "DREMEL" ? t("dremelSerialNumberMustHave") : t("serialNumberMustHave");
    errors[fieldName] = message;
  } else {
    delete errors[fieldName];
  }
}

interface ValidateSingleFieldParams {
  field: Field;
  errors: Record<string, string>;
  mandatoryFields: string[];
  values: Record<string, unknown>;
  fields: Field[];
  onlyTouched: boolean | undefined;
  touchedFields: Record<string, boolean> | undefined;
  t: (key: string) => string;
  autocompleteValidationRef?: RefObject<Record<string, boolean>>;
}

function validateSingleField({
  field,
  errors,
  mandatoryFields,
  values,
  fields,
  onlyTouched,
  touchedFields,
  t,
  autocompleteValidationRef,
}: ValidateSingleFieldParams): void {
  const fieldName = field.name;
  const originalName = field.fieldMapping?.originalName;

  if (!isFieldVisible(field, fields, values)) {
    delete errors[fieldName];
    return;
  }

  const value = values[fieldName];
  const hasValue = !(value === undefined || value === null || value === "");
  const isCurrentFieldEmpty = !hasValue;

  const isMandatoryForAction = mandatoryFields.some(
    (mf) => originalName?.toLowerCase() === mf?.toLowerCase(),
  );
  const shouldCheckRequired = Boolean(
    isMandatoryForAction && (!onlyTouched || touchedFields?.[fieldName]),
  );

  const hasByValueCondition = hasRequiredDependency(field);
  let byValueConditionMet = false;
  if (hasByValueCondition) {
    byValueConditionMet = checkDependencyCondition(field, values).isMet;
  }

  const uploadErrors = shouldCheckRequired ? getUploadFieldErrors(field, values) : [];
  if (uploadErrors.length > 0) {
    const translated = uploadErrors.map((key) => t(key));
    errors[fieldName] = translated.length === 1 ? translated[0] : JSON.stringify(translated);
    return;
  }

  if (field.type === "upload" && field.requiredDocuments && field.requiredDocuments.length > 0) {
    return;
  }

  if (shouldCheckRequired && hasByValueCondition && byValueConditionMet && isCurrentFieldEmpty) {
    const errorMessagesDep = field.requiredDependentFields?.errorMessageByValue;
    errors[fieldName] = errorMessagesDep
      ? t(errorMessagesDep)
      : `${t(field.label)} ${t("isRequired")}`;
    return;
  }

  if (
    validateAllEmptyGroup(field, errors, values, onlyTouched, touchedFields, t, byValueConditionMet)
  ) {
    return;
  }

  if (
    handleRequiredFieldCheck({
      errors,
      fieldName,
      shouldCheckRequired,
      hasByValueCondition,
      byValueConditionMet,
      isCurrentFieldEmpty,
      fieldLabel: field.label,
      t,
    })
  ) {
    return;
  }

  validatePattern(field, errors, fieldName, value, hasValue, t);
  validateLengthAndRange(field, errors, fieldName, value, hasValue, t);
  validateSerialNumberField({
    field,
    errors,
    fieldName,
    value,
    hasValue,
    values,
    touchedFields,
    t,
  });
  validateAutocompleteField({
    field,
    errors,
    fieldName,
    value,
    hasValue,
    autocompleteValidationRef,
    touchedFields,
    t,
  });
}

export const validateByAction = ({
  errors,
  mandatoryFields,
  values,
  fields,
  onlyTouched,
  touchedFields,
  t,
  autocompleteValidationRef,
}: {
  errors: Record<string, string>;
  mandatoryFields: string[];
  values: Record<string, unknown>;
  fields: Field[];
  onlyTouched?: boolean;
  touchedFields?: Record<string, boolean>;
  t: (key: string) => string;
  autocompleteValidationRef?: RefObject<Record<string, boolean>>;
}): ValidationErrors => {
  fields.forEach((field) => {
    validateSingleField({
      field,
      errors,
      mandatoryFields,
      values,
      fields,
      onlyTouched,
      touchedFields,
      t,
      autocompleteValidationRef,
    });
  });
  return errors;
};
export const useValidator = () => {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const validated = ({
    fields,
    values,
    mandatoryFields,
    onlyTouched = false,
    touchedFields = {},
    autocompleteValidationRef,
  }: {
    fields: Field[];
    values: Record<string, unknown>;
    mandatoryFields: string[];
    onlyTouched?: boolean;
    touchedFields?: Record<string, boolean>;
    autocompleteValidationRef?: RefObject<Record<string, boolean>>;
  }): ValidationErrors => {
    const errors: ValidationErrors = {};

    validateByAction({
      errors,
      mandatoryFields,
      values,
      fields,
      onlyTouched,
      touchedFields,
      t,
      autocompleteValidationRef,
    });

    return errors;
  };

  return validated;
};

export const getMandatoryFields = (form: GenericForm): Record<string, ActionMandatoryFields> => {
  const result: Record<string, ActionMandatoryFields> = {};
  form.sections.forEach((section) => {
    if (section.actions) {
      section.actions.forEach((action) => {
        if (!action?.name) return;
        const key = action.name.toLowerCase();
        if (!result[key]) {
          result[key] = { fieldList: [], section };
        }
        result[key].fieldList = [
          ...(result[key].fieldList || []),
          ...(action.mandatoryFields || []),
        ];
      });
    }
  });
  if (form.actions) {
    form.actions.forEach((action) => {
      if (!action?.name) return;
      const key = action.name.toLowerCase();
      if (!result[key]) {
        result[key] = { fieldList: [] };
      }
      result[key].fieldList = [...(result[key].fieldList || []), ...(action.mandatoryFields || [])];
    });
  }
  return result;
};
