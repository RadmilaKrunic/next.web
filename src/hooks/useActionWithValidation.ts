import { useCallback } from "react";
import Field from "components/generics/Field/GenericField.types";
import { getVisibleFieldsWithErrors } from "components/generics/Form/formValidation";
import { scrollToFirstError } from "utils/scrollToError";

export type ValidationActionHelpers = {
  setErrors: (errors: Record<string, unknown>) => void;
  setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, unknown>>;
};

type UseActionWithValidationParams = {
  allFields: Field[] | null;
  validateByAction: (
    actionName: string,
    values: Record<string, unknown>,
  ) => Record<string, unknown>;
  startValidation: (actionName: string) => void;
  stopValidation: () => void;
  setCurrentAction: (actionName: string) => void;
};

export const useActionWithValidation = ({
  allFields,
  validateByAction,
  startValidation,
  stopValidation,
  setCurrentAction,
}: UseActionWithValidationParams) => {
  return useCallback(
    async (
      actionName: string,
      formValues: Record<string, unknown>,
      helpers: ValidationActionHelpers,
      onSuccess: () => void | Promise<void>,
    ) => {
      if (!allFields) return;

      setCurrentAction(actionName);
      startValidation(actionName);

      const errors = validateByAction(actionName, formValues);
      const visibleErrors = getVisibleFieldsWithErrors(allFields, errors, formValues);

      if (visibleErrors.length > 0) {
        helpers.setErrors(errors);

        const touchedFields = Object.keys(errors).reduce(
          (acc, key) => {
            acc[key] = true;
            return acc;
          },
          {} as Record<string, boolean>,
        );

        await helpers.setTouched(touchedFields);
        scrollToFirstError(visibleErrors);
        return;
      }

      stopValidation();
      await onSuccess();
    },
    [allFields, setCurrentAction, startValidation, stopValidation, validateByAction],
  );
};
