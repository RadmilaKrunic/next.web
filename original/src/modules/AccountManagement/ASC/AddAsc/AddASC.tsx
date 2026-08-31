import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GenericFormContext } from "../../../../components/generics/Form/GenericForm.context";
import { Form, Formik, FormikErrors } from "formik";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import GenericForm from "../../../../components/generics/Form/GenericForm.types";
import { HeaderUserData } from "../../../../api/services/header/action";
import { useFormInitialization } from "../../../../hooks/useFormInitialization";
import { useFormValidation } from "../../../../components/generics/Form/useFormValidation";
import GenericSection from "../../../../components/generics/Section/GenericSection";
import GenericAction from "../../../../components/generics/Action/GenericAction";
import Field from "../../../../components/generics/Field/GenericField.types";
import { ActivityIndicator } from "@bosch/react-frok";
import { scrollToFirstError, scrollToTop } from "../../../../utils/scrollToError";
import { getVisibleFieldsWithErrors } from "../../../../components/generics/Form/formValidation";
import { useBreadcrumbs } from "../../../../hooks/useBreadcrumbs";
import { useTranslation } from "react-i18next";
import { SetErrorsType, SetFieldValueType, SetTouchedType } from "./AddAsc.types";
import { createASC, getDraftAscById } from "../../../../api/services/serviceCenters/action";
import { MessagesContext } from "../../../../contexts/messagescontext";
import { useActionWithValidation } from "../../../../hooks/useActionWithValidation";
import { mapAccountRolesToAPIFormat } from "../../Employees/EmployeeOverview/EmployeeOverview.utils";
import { useNavigate, useParams } from "react-router";
import {
  CountryConfig,
  ReimbursementConfiguration,
} from "../../../../api/services/countryConfiguration/countryConfiguration";
import { DEFAULT_STALE_TIME_MS } from "../../../../utils/queryConstants";
import { DraftServiceCenter } from "../../../../api/services/serviceCenters/serviceCenters.types";

function AddASC() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { setMessages } = useContext(MessagesContext);
  const navigate = useNavigate();
  const { ascId } = useParams<{ ascId: string }>();

  useBreadcrumbs([
    { label: t("ascProfiles"), href: "/asc-profiles" },
    { label: ascId ? t("editASC") : t("addASC"), href: ascId ? `/asc-edit/${ascId}` : "/asc-add" },
  ]);

  const autocompleteValidationRef = useRef<Record<string, boolean>>({});
  const isSubmittingAsc = useRef(false);

  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const countryConfiguration = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    user?.countryCode,
  ]);

  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const addASCForm = uiConfigurationForms?.forms.find((form) => form.name === "AddASC") || null;

  const [openedSections, setOpenedSections] = useState<Record<string, boolean>>(() => {
    const state = addASCForm?.sections.reduce(
      (acc, section) => {
        if (section.name === "generalInfo") {
          acc[section.name] = true;
          return acc;
        }
        acc[section.name] = false;
        return acc;
      },

      {} as Record<string, boolean>,
    );
    return state || {};
  });

  const { data: asc } = useQuery({
    queryKey: ["ASC", ascId],
    queryFn: () => getDraftAscById(ascId || ""),
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: false,
    enabled: !!ascId,
  });

  const {
    sections,
    initialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    isInitialized,
    reset,
    setInitialFormValues,
  } = useFormInitialization(addASCForm);

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
        setErrors: SetErrorsType;
        setTouched: SetTouchedType;
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

  const mapValuesToFormFields = useCallback((asc: DraftServiceCenter): Record<string, unknown> => {
    const { serviceCenter, firstUser } = asc;
    const formFieldValues: Record<string, unknown> = {
      ascId: serviceCenter.ascId,
      name: serviceCenter.name,
      email: serviceCenter.email,
      phoneNumber: serviceCenter.phoneNumber,
      gst: serviceCenter.gst,
      companyVATNumber: serviceCenter.companyVATNumber,
      isActive: serviceCenter.isActive,
      street: serviceCenter.address.street,
      city: serviceCenter.address.city,
      state: serviceCenter.address.stateProvinceRegion,
      postalCode: serviceCenter.address.postalCode,
      country: serviceCenter.address.countryCode,
      logo: serviceCenter?.logo?.logoId
        ? [
            {
              attachmentId: serviceCenter.logo?.logoId,
              name: serviceCenter.logo?.name,
              type: serviceCenter.logo?.type,
            },
          ]
        : [],
      houseNumber: serviceCenter.address.houseNumber,
      pkPriceChargeable: serviceCenter.pkPriceChargeable ?? 0,
      laPriceChargeable: serviceCenter.laPriceChargeable ?? 0,
      frPriceChargeable: serviceCenter.frPriceChargeable ?? 0,
      biqicName: serviceCenter.biqicName,
      customerCode: serviceCenter.customerCode,
      serviceCenterType: serviceCenter.serviceCenterType,
      laPrice: serviceCenter.laPrice,
      frPrice: serviceCenter.frPrice,
      pkPrice: serviceCenter.pkPrice,
      sparePartsDiscount: serviceCenter.sparePartsDiscount,
      accessoriesDiscount: serviceCenter.accessoriesDiscount,
      sparePartsIncentive: serviceCenter.sparePartsIncentive,
      accessoriesIncentive: serviceCenter.accessoriesIncentive,
      packagingCost: serviceCenter.packagingCost,
      defaultCountry: serviceCenter.defaultCountry,
      accountRoles: firstUser?.accountRoles?.map((role) => role.id) || [],
      firstName: firstUser?.firstName || "",
      lastName: firstUser?.lastName || "",
      userPhoneNumber: firstUser?.phoneNumber || "",
      userEmail: firstUser?.email || "",
      employeeCode: firstUser?.employeeCode || "",
      reimbursementPeriodType: serviceCenter.reimbursementPeriodType || "WEEKLY",
      reimbursementCreateOn: serviceCenter.reimbursementCreateOn || "1",
    };
    asc.serviceCenter?.reimbursementConfig?.forEach((config) => {
      const repairName = `reimbursementMethod_${config.category}_repair`;
      const exchangeName = `reimbursementMethod_${config.category}_exchange`;
      formFieldValues[repairName] = config.reimbursementMethods.REPAIR || "";
      formFieldValues[exchangeName] = config.reimbursementMethods.EXCHANGE || "";
    });
    return formFieldValues;
  }, []);

  useEffect(() => {
    if (asc && isInitialized) {
      const mappedValues = mapValuesToFormFields(asc);
      setInitialFormValues((prev) => ({
        ...prev,
        ...mappedValues,
      }));
    }

    if (!ascId && isInitialized && countryConfiguration?.reimbursementConfig?.length) {
      const defaultReimbursementValues: Record<string, unknown> = {};
      countryConfiguration?.reimbursementConfig?.forEach((config) => {
        const repairName = `reimbursementMethod_${config.category}_repair`;
        const exchangeName = `reimbursementMethod_${config.category}_exchange`;
        defaultReimbursementValues[repairName] = config.reimbursementMethods.REPAIR || "";
        defaultReimbursementValues[exchangeName] = config.reimbursementMethods.EXCHANGE || "";
      });
      const reimbursementCreateOn = countryConfiguration?.reimbursementCreateOn || "1";
      const reimbursementPeriodType = countryConfiguration?.reimbursementPeriodType || "WEEKLY";

      setInitialFormValues((prev) => ({
        ...prev,
        ...defaultReimbursementValues,
        reimbursementCreateOn,
        reimbursementPeriodType,
      }));
    }
  }, [
    asc,
    isInitialized,
    setInitialFormValues,
    mapValuesToFormFields,
    ascId,
    countryConfiguration?.reimbursementConfig,
    countryConfiguration?.reimbursementCreateOn,
    countryConfiguration?.reimbursementPeriodType,
  ]);

  const { mutate } = useMutation({
    mutationFn: (data: any) => {
      return createASC(data.payload, data.isDraft);
    },
    onSuccess: () => {
      setMessages([{ type: "success", duration: 5000, text: t("ASCCreatedSuccessfully") }]);
      queryClient.invalidateQueries({ queryKey: ["ascProfiles"] });
      if (ascId) {
        queryClient.invalidateQueries({ queryKey: ["ASC", ascId] });
      }
      navigate("/asc-profiles");
      scrollToTop();
    },
    onError: (error: any) => {
      if (error?.response?.data?.detail === "userCreationFailed") {
        setMessages([{ type: "warning", text: t("ascDraftCreatedWithoutUser") }]);
        navigate("/asc-profiles");
        scrollToTop();
        return;
      }
      setMessages([{ type: "error", duration: 5000, text: t("failedToCreateAsc") }]);
      scrollToTop();
    },
  });

  const handleActionWithValidation = useActionWithValidation({
    allFields,
    validateByAction,
    startValidation,
    stopValidation,
    setCurrentAction,
  });

  const mapReimbursementFormValuesToApiPayload = useCallback(
    (
      formValues: Record<string, unknown>,
      reimbursementConfig: CountryConfig["reimbursementConfig"],
    ): ReimbursementConfiguration[] => {
      const reimbursementPayload: ReimbursementConfiguration[] = [];
      reimbursementConfig.forEach((config) => {
        const repairName = `reimbursementMethod_${config.category}_repair`;
        const exchangeName = `reimbursementMethod_${config.category}_exchange`;
        reimbursementPayload.push({
          category: config.category,
          reimbursementMethods: {
            REPAIR: (formValues[repairName] as string) || "",
            EXCHANGE: (formValues[exchangeName] as string) || "",
          },
        });
      });
      return reimbursementPayload;
    },
    [],
  );

  const mapFirstUserToApiPayload = useCallback(
    (formValues: Record<string, any>): Record<string, unknown> | null => {
      const { firstName, lastName, userEmail, userPhoneNumber, accountRoles, employeeCode } =
        formValues;

      if (
        !firstName &&
        !lastName &&
        !userEmail &&
        !userPhoneNumber &&
        !accountRoles?.length &&
        !employeeCode
      ) {
        return null;
      }

      return {
        firstName: firstName,
        lastName: lastName,
        email: userEmail,
        phoneNumber: userPhoneNumber,
        accountRoles: mapAccountRolesToAPIFormat(accountRoles as string[]),
        employeeCode: employeeCode,
        language: user?.language || "en",
        locale: user?.locale || "en-US",
      };
    },
    [user?.language, user?.locale],
  );

  const mapFormValuesToApiPayload = useCallback(
    (formValues: Record<string, any>): Record<string, unknown> => {
      const apiValues: Record<string, any> = {
        serviceCenter: {
          name: formValues.name,
          gst: formValues.gst,
          email: formValues.email,
          phoneNumber: formValues.phoneNumber,
          companyVATNumber: formValues.companyVATNumber,
          logo: {
            logoId: formValues.logo[0]?.attachmentId,
            name: formValues.logo[0]?.name,
            type: formValues.logo[0]?.type,
          },
          isActive: formValues.isActive,
          address: {
            houseNumber: formValues.houseNumber,
            street: formValues.street,
            city: formValues.city,
            stateProvinceRegion: formValues.state,
            postalCode: formValues.postalCode,
            countryCode: formValues.countryCode,
          },
          laPriceChargeable: null,
          frPriceChargeable: null,
          pkPriceChargeable: null,
          biqicName: formValues.biqicName,
          customerCode: formValues.customerCode,
          serviceCenterType: formValues.serviceCenterType,
          laPrice: +formValues.laPrice!,
          frPrice: +formValues.frPrice!,
          pkPrice: +formValues.pkPrice!,
          defaultCountry: formValues.defaultCountry,
          reimbursementConfig: mapReimbursementFormValuesToApiPayload(
            formValues,
            countryConfiguration?.reimbursementConfig || [],
          ),
          currency: countryConfiguration?.currency,
          currencySymbol: countryConfiguration?.currencySymbol,
          reimbursementType: "DIRECT_SHIPMENT",
          reimbursementPeriodType: formValues.reimbursementPeriodType,
          reimbursementCreateOn: formValues.reimbursementCreateOn,
          sparePartsDiscount: +formValues.sparePartsDiscount!,
          accessoriesDiscount: +formValues.accessoriesDiscount!,
          sparePartsIncentive: +formValues.sparePartsIncentive!,
          accessoriesIncentive: +formValues.accessoriesIncentive!,
          packagingCost: +formValues.packagingCost!,
        },
        firstUser: mapFirstUserToApiPayload(formValues),
      };
      if (ascId) {
        apiValues.serviceCenter.ascId = ascId;
      }
      if (asc?.firstUser?.userId) {
        apiValues.firstUser.userId = asc.firstUser.userId;
      }
      if (apiValues.serviceCenter.reimbursementPeriodType === "CUSTOM") {
        apiValues.serviceCenter.reimbursementCreateOn = null;
      }
      return apiValues;
    },
    [
      countryConfiguration?.currency,
      countryConfiguration?.currencySymbol,
      ascId,
      asc,
      mapReimbursementFormValuesToApiPayload,
      countryConfiguration?.reimbursementConfig,
      mapFirstUserToApiPayload,
    ],
  );

  const onSaveDraft = useCallback(
    (
      formValues: Record<string, unknown>,
      { setErrors, setTouched }: { setErrors: any; setTouched: any },
    ) => {
      const payload = mapFormValuesToApiPayload(formValues);

      handleActionWithValidation("save", formValues, { setErrors, setTouched }, () => {
        mutate({ payload, isDraft: true });
      });
    },
    [mapFormValuesToApiPayload, handleActionWithValidation, mutate],
  );

  const onSubmit = useCallback(
    (formValues: Record<string, unknown>) => {
      const payload = mapFormValuesToApiPayload(formValues);

      mutate({ payload, isDraft: false });
      isSubmittingAsc.current = true;
    },
    [mapFormValuesToApiPayload, mutate],
  );

  const handleGenericAction = useCallback(
    (
      actionName: string,
      formValues: Record<string, unknown>,
      helpers: {
        setErrors: SetErrorsType;
        setTouched: SetTouchedType;
        setFieldValue: SetFieldValueType;
      },
    ) => {
      const actionMap: Record<string, () => void> = {
        onSubmit: () => {
          void handleAction(
            "submit",
            { values: formValues, setErrors: helpers.setErrors, setTouched: helpers.setTouched },
            () => {
              onSubmit(formValues);
            },
          );
        },
        onCancel: onCancelForm,
        saveDraft: () =>
          onSaveDraft(formValues, { setErrors: helpers.setErrors, setTouched: helpers.setTouched }),
      };
      const action = actionMap[actionName];
      if (action) {
        action();
      }
    },
    [onCancelForm, handleAction, onSaveDraft, onSubmit],
  );

  const onNextSectionPricing = useCallback(
    (
      formValues: Record<string, unknown>,
      helpers: {
        setErrors: SetErrorsType;
        setTouched: SetTouchedType;
      },
    ) => {
      void handleAction(
        "nextSectionPricing",
        { values: formValues, setErrors: helpers.setErrors, setTouched: helpers.setTouched },
        () => {
          setOpenedSections((prev) => ({
            ...prev,
            pricing: true,
            generalInfo: false,
          }));
        },
      );
    },
    [handleAction],
  );

  const onNextSectionConfiguration = useCallback(
    (
      formValues: Record<string, unknown>,
      helpers: {
        setErrors: (errors: FormikErrors<Record<string, unknown>>) => void;
        setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, string>>;
      },
    ) => {
      void handleAction(
        "nextSectionConfiguration",
        { values: formValues, setErrors: helpers.setErrors, setTouched: helpers.setTouched },
        () => {
          setOpenedSections((prev) => ({
            ...prev,
            boschInternalConfiguration: true,
            pricing: false,
          }));
        },
      );
    },
    [handleAction],
  );

  const onNextSectionReimbursement = useCallback(
    (
      formValues: Record<string, unknown>,
      helpers: {
        setErrors: (errors: FormikErrors<Record<string, unknown>>) => void;
        setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, string>>;
      },
    ) => {
      void handleAction(
        "nextSectionReimbursement",
        { values: formValues, setErrors: helpers.setErrors, setTouched: helpers.setTouched },
        () => {
          setOpenedSections((prev) => ({
            ...prev,
            reimbursement: true,
            boschInternalConfiguration: false,
          }));
        },
      );
    },
    [handleAction],
  );

  const onNextSectionAddAdmin = useCallback(
    (
      formValues: Record<string, unknown>,
      helpers: {
        setErrors: (errors: FormikErrors<Record<string, unknown>>) => void;
        setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, string>>;
      },
    ) => {
      void handleAction(
        "nextSectionAddAdmin",
        { values: formValues, setErrors: helpers.setErrors, setTouched: helpers.setTouched },
        () => {
          setOpenedSections((prev) => ({
            ...prev,
            addAdmin: true,
            reimbursement: false,
          }));
        },
      );
    },
    [handleAction],
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
        onNextSectionPricing: onNextSectionPricing,
        onNextSectionConfiguration: onNextSectionConfiguration,
        onNextSectionReimbursement: onNextSectionReimbursement,
        onNextSectionAddAdmin: onNextSectionAddAdmin,
        saveDraft: (
          formValues: Record<string, unknown>,
          {
            setErrors,
            setTouched,
          }: {
            setErrors: any;
            setTouched: any;
          },
        ) => {
          onSaveDraft(formValues, { setErrors, setTouched });
        },
      },
      autocompleteValidation: autocompleteValidationRef,
    }),
    [
      allFields,
      setAllFields,
      mandatoryFields,
      onSaveDraft,
      onNextSectionPricing,
      onNextSectionConfiguration,
      onNextSectionReimbursement,
      onNextSectionAddAdmin,
    ],
  );

  const onHeaderClick = useCallback((sectionName: string) => {
    setOpenedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  }, []);

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
                  <GenericSection
                    key={`${section.name}_${section.index}`}
                    section={section}
                    onHeaderClick={() => onHeaderClick(section.name)}
                    isCollapsed={openedSections[section.name] === false}
                  />
                ))}

                {addASCForm && (
                  <GenericAction
                    actions={addASCForm.actions || []}
                    onActionClick={(actionName) => {
                      if (isSubmittingAsc.current) return;

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

export default AddASC;
