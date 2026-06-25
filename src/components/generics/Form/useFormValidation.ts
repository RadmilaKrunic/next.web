import { useCallback, useState, useRef, useEffect } from "react";
import { useValidator } from "./formValidation";
import Field from "../Field/GenericField.types";
import { ActionMandatoryFields } from "./GenericForm.types";

interface ValidationState {
  isTriggered: boolean;
  currentAction: string | null;
}

interface UseFormValidationProps {
  allFields: Field[] | null;
  mandatoryFieldsMap: Record<string, ActionMandatoryFields> | null;
  autocompleteValidationRef?: React.RefObject<Record<string, boolean>>;
}

interface UseFormValidationReturn {
  validate: (values: Record<string, unknown>) => Record<string, string>;
  validateByAction: (actionName: string, values: Record<string, unknown>) => Record<string, string>;
  startValidation: (actionName: string) => void;
  stopValidation: () => void;
  validationState: ValidationState;
  setCurrentAction: (actionName: string) => void;
}

export const useFormValidation = ({
  allFields,
  mandatoryFieldsMap,
  autocompleteValidationRef,
}: UseFormValidationProps): UseFormValidationReturn => {
  const validateFormByAction = useValidator();
  const [validationState, setValidationState] = useState<ValidationState>({
    isTriggered: false,
    currentAction: null,
  });

  // Use ref to store the latest validation state to avoid stale closures
  const validationStateRef = useRef(validationState);

  useEffect(() => {
    validationStateRef.current = validationState;
  }, [validationState]);

  const getMandatoryFieldsList = useCallback(
    (actionName: string): string[] => {
      return mandatoryFieldsMap?.[actionName]?.fieldList || [];
    },
    [mandatoryFieldsMap],
  );

  const validateByAction = useCallback(
    (actionName: string, values: Record<string, unknown>) => {
      if (!allFields) return {};

      return validateFormByAction({
        fields: allFields,
        values,
        mandatoryFields: getMandatoryFieldsList(actionName),
        autocompleteValidationRef,
      });
    },
    [allFields, validateFormByAction, getMandatoryFieldsList, autocompleteValidationRef],
  );

  const startValidation = useCallback((actionName: string) => {
    validationStateRef.current = { isTriggered: true, currentAction: actionName };
    setValidationState({ isTriggered: true, currentAction: actionName });
  }, []);

  const stopValidation = useCallback(() => {
    validationStateRef.current = { isTriggered: false, currentAction: null };
    setValidationState({ isTriggered: false, currentAction: null });
  }, []);

  const setCurrentAction = (actionName: string) => {
    validationStateRef.current = { isTriggered: true, currentAction: actionName };
  };

  const validate = useCallback(
    (values: Record<string, unknown>) => {
      const currentState = validationStateRef.current;

      if (!allFields) return {};

      // Always run validation for autocomplete and serial number fields
      const alwaysValidatedFields: string[] = [];

      // When validation is not triggered, validate only autocomplete and serial number fields
      if (!currentState.isTriggered || !currentState.currentAction) {
        const errors = validateFormByAction({
          fields: allFields,
          values,
          mandatoryFields: alwaysValidatedFields,
          autocompleteValidationRef,
        });

        // Filter to only include autocomplete and serial number errors
        const filteredErrors: Record<string, string> = {};
        for (const [fieldName, error] of Object.entries(errors)) {
          const field = allFields.find((f) => f.name === fieldName);
          if (field) {
            const isAutocomplete =
              field.type === "autocomplete" &&
              (fieldName?.toLowerCase().includes("baretoolnumber") ||
                fieldName?.toLowerCase().includes("toolmodelname"));
            const isSerialNumber = field.fieldMapping?.originalName === "serialNumber";
            if (isAutocomplete || isSerialNumber) {
              filteredErrors[fieldName] = error;
            }
          }
        }

        return filteredErrors;
      }

      // When validation is triggered, run full validation
      const actionErrors = validateByAction(currentState.currentAction, values);
      return actionErrors;
    },
    [allFields, validateByAction, validateFormByAction, autocompleteValidationRef],
  );

  return {
    validate,
    validateByAction,
    startValidation,
    stopValidation,
    validationState,
    setCurrentAction,
  };
};
