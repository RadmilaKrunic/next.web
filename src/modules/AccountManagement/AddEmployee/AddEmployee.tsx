import React, { useCallback, useMemo, useRef } from "react";
import { GenericFormContext } from "../../../components/generics/Form/GenericForm.context";
import { Form, Formik, FormikErrors } from "formik";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import GenericForm from "../../../components/generics/Form/GenericForm.types";
import { HeaderUserData } from "../../../api/services/header/action";
import { useFormInitialization } from "../../../hooks/useFormInitialization";
import { useFormValidation } from "../../../components/generics/Form/useFormValidation";
import GenericSection from "../../../components/generics/Section/GenericSection";
import GenericAction from "../../../components/generics/Action/GenericAction";
import Field from "../../../components/generics/Field/GenericField.types";
import { ActivityIndicator } from "@bosch/react-frok";
import { useNavigate } from "react-router";
import { scrollToFirstError } from "../../../utils/scrollToError";
import { getVisibleFieldsWithErrors } from "../../../components/generics/Form/formValidation";
import { useBreadcrumbs } from "../../../hooks/useBreadcrumbs";
import { useTranslation } from "react-i18next";
import { createUser } from "../../../api/services/users/action";

function AddEmployee() {
  const navigate = useNavigate();
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  useBreadcrumbs([
    { label: t("employees"), href: "/employee-list" },
    { label: t("addEmployee"), href: "/" },
  ]);

  const autocompleteValidationRef = useRef<Record<string, boolean>>({});
  const isSubmittingEmployee = useRef(false);

  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const addEmployeeForm =
    uiConfigurationForms?.forms.find((form) => form.name === "AddEmployee") || null;

  const {
    sections,
    initialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    isInitialized,
    reset,
  } = useFormInitialization(addEmployeeForm);

  const { validate, validateByAction, startValidation, stopValidation, setCurrentAction } =
    useFormValidation({
      allFields,
      mandatoryFieldsMap: mandatoryFields,
      autocompleteValidationRef,
    });

  const allMandatoryFieldsFilled = useCallback(
    (actionName: string, values: Record<string, unknown>) => {
      const errors = validateByAction(actionName, values);
      const fields = allFields || [];
      const visibleErrors = getVisibleFieldsWithErrors(fields, errors, values);
      const listOfErrors = Object.keys(errors);
      return { errors, visibleErrors, listOfErrors, hasErrors: visibleErrors.length > 0 };
    },
    [allFields, validateByAction],
  );

  const handleAction = useCallback(
    async (
      actionName: string,
      formikProps: {
        values: Record<string, unknown>;
        setErrors: (errors: Record<string, string>) => void;
        setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, string>>;
      },
      onSuccess?: () => void | Promise<void>,
    ) => {
      if (!allFields) return;

      setCurrentAction(actionName);
      startValidation(actionName);
      const { errors, visibleErrors, listOfErrors, hasErrors } = allMandatoryFieldsFilled(
        actionName,
        formikProps.values,
      );

      if (hasErrors) {
        formikProps.setErrors(errors);
        const touchedFields = listOfErrors.reduce(
          (acc, key) => {
            acc[key] = true;
            return acc;
          },
          {} as Record<string, boolean>,
        );
        await formikProps.setTouched(touchedFields);
        scrollToFirstError(visibleErrors);
        return;
      }

      stopValidation();

      if (onSuccess) {
        await onSuccess();
      }
    },
    [allFields, startValidation, stopValidation, setCurrentAction, allMandatoryFieldsFilled],
  );

  const mutation = useMutation({
    mutationFn: createUser,

    onSuccess: (data) => {
      console.log("Success! New user created:", data);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      console.error("Failed to create user:", error.message);
    },
  });

  const onSubmitEmployee = useCallback(
    (formValues: Record<string, unknown>) => {
      console.log("Submitting employee with values:", formValues);
      mutation.mutate({
        ...formValues,
        type: "ASC",
        ascId: user?.ascId,
        jobListColumnPreference: ["jobId", "toolModelName", "jobStatus", "createdAt"],
        language: user?.language || "en",
      });
      navigate(`/employee-list`);
    },
    [navigate, mutation, user],
  );

  const onCancelForm = useCallback(
    (
      _formValues?: Record<string, unknown>,
      helpers?: { setFieldValue: (field: string, value: unknown) => void },
    ) => {
      reset();
      if (helpers) {
        for (const key of Object.keys(initialFormValues)) {
          helpers.setFieldValue(key, initialFormValues[key]);
        }
      }
    },
    [reset, initialFormValues],
  );

  const handleGenericAction = useCallback(
    (
      actionName: string,
      formValues: Record<string, unknown>,
      helpers: {
        setErrors: (errors: FormikErrors<Record<string, unknown>>) => void;
        setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, string>>;
        setFieldValue: (field: string, value: unknown) => void;
      },
    ) => {
      const actionMap: Record<string, () => void> = {
        onSubmit: () => {
          void handleAction(
            "addemployee",
            { values: formValues, setErrors: helpers.setErrors, setTouched: helpers.setTouched },
            () => {
              onSubmitEmployee(formValues);
            },
          );
        },
        onCancel: () => onCancelForm(),
      };

      const action = actionMap[actionName];
      if (action) {
        action();
      }
    },
    [onSubmitEmployee, onCancelForm, handleAction],
  );

  const genericFormContextValue = useMemo(
    () => ({
      allFields: allFields || [],
      setAllFields: (action: React.SetStateAction<Field[]>) => {
        setAllFields((prev) => {
          if (typeof action === "function") {
            return action(prev || []);
          }
          return action;
        });
      },
      mandatoryFields,
      setMandatoryFields: () => {},
      actionCallbacks: {
        onSubmit: onSubmitEmployee,
        onCancel: onCancelForm,
      },
      autocompleteValidation: autocompleteValidationRef,
    }),
    [allFields, setAllFields, mandatoryFields, onSubmitEmployee, onCancelForm],
  );

  if (!isInitialized) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }
  return (
    <div>
      <GenericFormContext.Provider value={genericFormContextValue}>
        <Formik
          initialValues={initialFormValues}
          onSubmit={() => {}}
          enableReinitialize={true}
          validateOnBlur={false}
          validateOnChange={true}
          validateOnMount={false}
          validate={validate}
        >
          {({ values, setErrors, setTouched, setFieldValue }) => {
            return (
              <Form>
                {sections.map((section) => (
                  <GenericSection key={`${section.name}_${section.index}`} section={section} />
                ))}

                {addEmployeeForm && (
                  <GenericAction
                    actions={addEmployeeForm.actions || []}
                    onActionClick={(actionName) => {
                      if (isSubmittingEmployee.current) return;

                      const wrappedSetTouched = async (touched: Record<string, boolean>) => {
                        await setTouched(touched);
                        return undefined as void | Record<string, string>;
                      };
                      if (actionName) {
                        handleGenericAction(actionName, values, {
                          setErrors,
                          setTouched: wrappedSetTouched,
                          setFieldValue: (field: string, value: unknown) => {
                            void setFieldValue(field, value);
                          },
                        });
                      }
                    }}
                  />
                )}
              </Form>
            );
          }}
        </Formik>
      </GenericFormContext.Provider>
    </div>
  );
}

export default AddEmployee;
