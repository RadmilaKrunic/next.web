import { useBreadcrumbs } from "../../../hooks/useBreadcrumbs";
import GenericSection from "../../../components/generics/Section/GenericSection";
import { getVisibleFieldsWithErrors } from "../../../components/generics/Form/formValidation";
import { useFormValidation } from "../../../components/generics/Form/useFormValidation";
import { Formik, Form } from "formik";
import GenericAction from "../../../components/generics/Action/GenericAction";
import "./CreateJob.scss";
import { useTranslation } from "react-i18next";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAssetCollapsedTitle, getCustomerCollapsedTitle } from "./CreateJob.utils";
import { CreateJobContext } from "./CreateJob.context";
import Field from "../../../components/generics/Field/GenericField.types";
import { useAccessoriesManager } from "../../../hooks/useAccessoriesManager";
import { useFormInitialization } from "../../../hooks/useFormInitialization";
import { scrollToFirstError } from "../../../utils/scrollToError";

import { createOrder, getOrderReceipt } from "../../../api/services/orders/orders";
import { Order } from "../../../api/services/orders/orders.types";
import { useNavigate, useParams } from "react-router";
import { useOrderById } from "../../../api/services/orders/hooks";

import {
  getAllFieldsFromSection,
  setDuplicatedSection,
  mapValuesToAPI,
  mapFieldToFieldMapping,
  convertAPIDataToFormValues,
} from "../../../components/generics/utils";

import GenericForm from "../../../components/generics/Form/GenericForm.types";
import { GenericFormContext } from "../../../components/generics/Form/GenericForm.context";
import { useQueryClient } from "@tanstack/react-query";
import { HeaderUserData } from "../../../api/services/header/action";
import { ActivityIndicator } from "@bosch/react-frok";
import { MessagesContext } from "../../../contexts/messagescontext";

function CreateJob() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const { setMessages } = useContext(MessagesContext);

  const autocompleteValidationRef = useRef<Record<string, boolean>>({});

  const isEditMode = !!orderId;

  const { data: orderData, isLoading: isLoadingOrder, error: orderError } = useOrderById(orderId);

  useEffect(() => {
    if (!isEditMode || isLoadingOrder) return;

    if (orderError || !orderData) {
      console.error("Failed to load order:", orderError);
      const navigateResult = navigate("/job-list");
      if (navigateResult instanceof Promise) {
        navigateResult.catch(() => undefined);
      }
      return;
    }

    const isEditable = orderData.jobs.every(
      (job) => job.jobStatus?.trim().toUpperCase() === "DRAFT",
    );

    if (!isEditable) {
      setMessages((prev) => [
        ...prev,
        { text: t("errorEditDraft"), type: "error", duration: 3000 },
      ]);
      const navigateResult = navigate(-1);
      if (navigateResult instanceof Promise) {
        navigateResult.catch(() => undefined);
      }
    }
  }, [isEditMode, isLoadingOrder, orderError, orderData, navigate, setMessages, t]);

  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const createJobForm =
    uiConfigurationForms?.forms.find((form) => form.name === "CreateJob") || null;

  useBreadcrumbs([
    {
      label: isEditMode ? t("editOrder") : t("createJob"),
      href: isEditMode ? `/edit-order/${orderId}` : "/create-job",
    },
  ]);

  const [openAssetIndices, setOpenAssetIndices] = useState<Set<number>>(new Set());
  const [isCustomerOpen, setIsCustomerOpen] = useState(true);
  const [currentMode] = useState<"create" | "view" | "edit">(isEditMode ? "edit" : "create");
  const [currentStatus] = useState<string | undefined>("IN_CREATION");
  const [draftOpenenFirstTime, setDraftOpenenFirstTime] = useState<boolean>(false);

  // Prepare accessories data from orderData for multi-job support
  const apiJobsAccessories = useMemo(() => {
    if (!isEditMode || !orderData?.jobs) return [];

    return orderData.jobs.map((job, index) => ({
      jobIndex: index,
      accessories: job.asset?.accessories || [],
    }));
  }, [isEditMode, orderData]);

  const toggleAssetAccordion = useCallback((index: number) => {
    setOpenAssetIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Use custom hooks
  const {
    sections,
    setSections,
    initialFormValues,
    setInitialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    isInitialized,
    reset,
  } = useFormInitialization(createJobForm);

  const { assetsAccessories, setAssetsAccessories, mapAccessoriesFields } = useAccessoriesManager({
    mode: currentMode,
    allFields,
    setAllFields,
    setInitialFormValues,
    apiJobsAccessories: apiJobsAccessories, // Multi-job: jobIndex is defined for each job
    convertAPIDataToFormValues,
    apiData: orderData,
  });

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

  useEffect(() => {
    if (isEditMode && !draftOpenenFirstTime && allFields) {
      const { hasErrors } = allMandatoryFieldsFilled("next", initialFormValues);
      if (!hasErrors) {
        setOpenAssetIndices(new Set([1]));
        setIsCustomerOpen(false);
        setDraftOpenenFirstTime(true);
      }
    }
  }, [initialFormValues, isEditMode, allMandatoryFieldsFilled, draftOpenenFirstTime, allFields]);

  // Track the last action to detect when switching between actions
  const lastActionRef = useRef<string | null>(null);
  const hasCreatedSectionsRef = useRef(false);
  const isSubmittingOrderRef = useRef(false);
  useEffect(() => {
    hasCreatedSectionsRef.current = false;
  }, [orderId]);

  useEffect(() => {
    if (isEditMode && orderData?.jobs?.length && isInitialized && !hasCreatedSectionsRef.current) {
      const numberOfJobs = orderData.jobs.length;
      const currentAssetSections = sections.filter((s) => s.name.startsWith("assetData"));

      if (currentAssetSections.length < numberOfJobs) {
        const sectionsToAdd = numberOfJobs - currentAssetSections.length;
        const baseAssetSection = currentAssetSections[0];

        const newSections = [...sections];
        let newFieldsList = [...(allFields || [])];

        for (let i = 0; i < sectionsToAdd; i++) {
          const newIndex = currentAssetSections.length + i;
          const duplicatedSection = setDuplicatedSection(
            structuredClone(baseAssetSection),
            newIndex,
          );

          newSections.push(duplicatedSection);

          let newFields = getAllFieldsFromSection(duplicatedSection);
          newFields = newFields.map((field) => mapFieldToFieldMapping(field));
          newFieldsList = [...newFieldsList, ...newFields];
        }

        setSections(newSections);
        setAllFields(newFieldsList);
        hasCreatedSectionsRef.current = true;
      }
    }
  }, [
    isEditMode,
    orderData,
    isInitialized,
    sections,
    allFields,
    setSections,
    setAllFields,
    setOpenAssetIndices,
  ]);

  // API preparation
  const prepareForAPI = useCallback(
    (formValues: Record<string, unknown>): Record<string, unknown> => {
      //Specific for job/accessory fields mapping
      const allFieldsWithAccessories = mapAccessoriesFields();

      const mappedValues = mapValuesToAPI(formValues, allFieldsWithAccessories || []) as Record<
        string,
        unknown
      >;

      const order = (mappedValues["order"] as Record<string, unknown>) || {};
      const customer = order["customer"] as Record<string, unknown> | undefined;

      if (
        customer?.["useBillingAddressForDelivery"] ||
        order["pickupType"] === "PICKUP_IN_WORKSHOP"
      ) {
        if (customer) {
          customer["deliveryAddress"] = null;
        }
      }

      order["ascId"] = order["ascId"] ?? user?.ascId;
      if (customer) {
        customer["ascId"] = customer["ascId"] ?? user?.ascId;
      }
      order["countryCode"] = order["countryCode"] ?? user?.countryCode;

      if (mappedValues.jobs && Array.isArray(mappedValues.jobs)) {
        const jobsArray = mappedValues.jobs as Array<Record<string, unknown> | undefined>;

        const jobsWithIndices = jobsArray.map((job, index) => ({ job, originalIndex: index }));
        const validJobsWithIndices = jobsWithIndices.filter(
          (item): item is { job: Record<string, unknown>; originalIndex: number } =>
            item.job !== undefined && item.job !== null,
        );
        for (const { job } of validJobsWithIndices) {
          job["jobStatus"] = "READY_FOR_DIAGNOSTIC";
          job["ascId"] = job["ascId"] || user?.ascId;
          job["orderId"] = job["orderId"] || order["orderId"];

          const asset = job["asset"] as Record<string, unknown> | undefined;
          if (asset && !asset["hasAccessories"]) {
            delete asset["accessories"];
          }
        }

        mappedValues.jobs = validJobsWithIndices.map((item) => item.job);
      }

      return mappedValues;
    },
    [mapAccessoriesFields, user?.ascId, user?.countryCode],
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

      // Update lastActionRef
      lastActionRef.current = actionName;

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

        // Scroll to first error field
        scrollToFirstError(visibleErrors);
        return;
      }

      // Validation passed - stop validation and proceed
      stopValidation();

      if (onSuccess) {
        await onSuccess();
      }
    },
    [allFields, startValidation, stopValidation, setCurrentAction, allMandatoryFieldsFilled],
  );

  const handleCreateOrder = useCallback(
    async (formValues: Record<string, unknown>, isDraft: boolean) => {
      if (isSubmittingOrderRef.current) return;

      isSubmittingOrderRef.current = true;
      setIsSubmittingOrder(true);

      try {
        const payload = prepareForAPI(formValues);
        const response = await createOrder(isDraft, payload as unknown as Order);

        if (response) {
          if (!isDraft) {
            const receiptBlob = await getOrderReceipt(response.order.orderId);
            if (receiptBlob) {
              const pdfUrl = URL.createObjectURL(receiptBlob);
              window.open(pdfUrl, "_blank");
              setTimeout(() => URL.revokeObjectURL(pdfUrl), 10000);
            }
          }
          await queryClient.invalidateQueries({ queryKey: ["jobs"] });
          await navigate("/job-list");
        }
      } catch (error: unknown) {
        console.error("Failed to create order:", error);
      } finally {
        isSubmittingOrderRef.current = false;
        setIsSubmittingOrder(false);
      }
    },
    [prepareForAPI, navigate, queryClient],
  );

  const addNewMultipleSection = useCallback(
    (prefix: string, values: Record<string, unknown>) => {
      const multipleSectionList = sections.filter(
        (section) => section.isMultiple && section.name.startsWith(prefix),
      );

      const maxIndex: number = multipleSectionList.reduce(
        (max, section) => Math.max(max, section.index || 0),
        sections[0].index || 0,
      );

      const index = maxIndex + 1;
      const newSection = structuredClone(multipleSectionList[0]);
      const duplicatedSection = setDuplicatedSection(newSection, index);

      setSections([...sections, duplicatedSection]);

      let newFields = getAllFieldsFromSection(duplicatedSection);
      newFields = newFields.map((field) => mapFieldToFieldMapping(field));

      const newValues = newFields.reduce(
        (acc, field) => {
          acc[field.name] = field.defaultValue ?? "";
          return acc;
        },
        {} as Record<string, unknown>,
      );

      const updatedValues = { ...values, ...newValues };
      setInitialFormValues(updatedValues);
      setAllFields((prevFields) => (prevFields ? [...prevFields, ...newFields] : newFields));

      let accessoryFields = newFields.filter((field) => {
        return field.name.includes(`${prefix}#${index}_accessory#0`);
      });

      if (accessoryFields.length === 0) {
        accessoryFields = newFields
          .filter((field) => {
            return field.name.includes(`${prefix}#0_accessory`);
          })
          .map((field) => {
            field.name = field.name.replace(
              `${prefix}#0_accessory#`,
              `${prefix}#${index}_accessory#`,
            );
            return field;
          });
      }

      setAssetsAccessories((prevAccessories) => [
        ...prevAccessories,
        {
          assetIndex: `${index}`,
          accessoriesIndex: "0",
          fields: accessoryFields,
        },
      ]);
    },
    [sections, setSections, setAllFields, setInitialFormValues, setAssetsAccessories],
  );

  const deleteSection = useCallback(
    (sectionIndex: number, setFieldValue?: (field: string, value: unknown) => unknown) => {
      if (sectionIndex < 0 || sectionIndex >= sections.length) {
        return;
      }

      const sectionToDelete = sections[sectionIndex];
      if (!sectionToDelete) return;

      const sectionName = sectionToDelete.name;

      const updatedSections = sections.filter((_, index) => index !== sectionIndex);

      const prefix = sectionName.split("#")[0];
      const multipleSections = updatedSections.filter(
        (section) => section.isMultiple && section.name.startsWith(prefix),
      );

      for (const [idx, section] of multipleSections.entries()) {
        section.index = idx;
      }

      setSections(updatedSections);

      const fieldsToDelete = (allFields || []).filter((field) =>
        field.name.startsWith(sectionName),
      );
      const fieldsToKeep = (allFields || []).filter((field) => !field.name.startsWith(sectionName));
      setAllFields(fieldsToKeep);

      if (setFieldValue) {
        for (const field of fieldsToDelete) {
          setFieldValue(field.name, undefined);
        }
      }

      const updatedValues = Object.keys(initialFormValues).reduce(
        (acc, key) => {
          if (!key.startsWith(sectionName)) {
            acc[key] = initialFormValues[key];
          }
          return acc;
        },
        {} as Record<string, unknown>,
      );
      setInitialFormValues(updatedValues);

      const assetIndex = sectionToDelete?.index?.toString();
      if (assetIndex) {
        const updatedAccessories = assetsAccessories.filter((acc) => acc.assetIndex !== assetIndex);
        setAssetsAccessories(updatedAccessories);
      }
    },
    [
      sections,
      allFields,
      initialFormValues,
      assetsAccessories,
      setAllFields,
      setSections,
      setInitialFormValues,
      setAssetsAccessories,
    ],
  );

  const onSaveDraft = useCallback(
    (formValues?: Record<string, unknown>) => {
      if (formValues) {
        void handleCreateOrder(formValues, true);
      }
    },
    [handleCreateOrder],
  );

  const onSubmitOrder = useCallback(
    (formValues?: Record<string, unknown>) => {
      if (formValues) {
        // Expand all asset sections before submitting
        const allIndices = sections.slice(1).map((_, i) => i + 1);
        setOpenAssetIndices(new Set(allIndices));
        void handleCreateOrder(formValues, false);
      }
    },
    [handleCreateOrder, sections],
  );

  const onNextSection = useCallback(
    (
      formValues?: Record<string, unknown>,
      helpers?: {
        setErrors: (errors: Record<string, string>) => void;
        setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, string>>;
      },
    ) => {
      if (formValues && helpers) {
        void handleAction(
          "next",
          {
            values: formValues,
            setErrors: helpers.setErrors,
            setTouched: helpers.setTouched,
          },
          () => {
            setOpenAssetIndices(new Set([1]));
            setIsCustomerOpen(false);
          },
        );
      }
    },
    [handleAction],
  );

  const onCancelForm = useCallback(
    (
      _formValues?: Record<string, unknown>,
      helpers?: { setFieldValue: (field: string, value: unknown) => void },
    ) => {
      reset();
      setOpenAssetIndices(new Set());
      setIsCustomerOpen(true);
      setAssetsAccessories([]);
      if (helpers) {
        for (const key of Object.keys(initialFormValues)) {
          helpers.setFieldValue(key, initialFormValues[key]);
        }
      }
    },
    [reset, initialFormValues, setAssetsAccessories],
  );

  const onAddMoreTools = useCallback(
    (formValues?: Record<string, unknown>) => {
      if (formValues) {
        addNewMultipleSection("assetData", formValues);
        setOpenAssetIndices((prev) => new Set([...prev, sections.length]));
      }
    },
    [addNewMultipleSection, sections.length],
  );

  // Handler for GenericAction component
  const handleGenericAction = useCallback(
    (
      actionName: string | undefined,
      formValues: Record<string, unknown>,
      helpers: {
        setErrors: (errors: Record<string, string>) => void;
        setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, string>>;
        setFieldValue: (field: string, value: unknown) => void;
      },
    ) => {
      if (!actionName) return;

      const actionMap: Record<string, () => void> = {
        onAddMoreTools: () => onAddMoreTools(formValues),
        onCancelCreateJob: () => onCancelForm(formValues, helpers),
        onSaveAsDraft: () => onSaveDraft(formValues),
        onSubmit: () => {
          void handleAction(
            "submit",
            { values: formValues, setErrors: helpers.setErrors, setTouched: helpers.setTouched },
            () => {
              onSubmitOrder(formValues);
            },
          );
        },
        saveDraft: () => onSaveDraft(formValues),
        nextSection: () => onNextSection(formValues, helpers),
      };

      const action = actionMap[actionName];
      if (action) {
        action();
      }
    },
    [onAddMoreTools, onCancelForm, onSaveDraft, onSubmitOrder, onNextSection, handleAction],
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
        onSubmit: onSubmitOrder,
        onSaveAsDraft: onSaveDraft,
        onAddMoreTools: onAddMoreTools,
        onCancelCreateJob: onCancelForm,
        saveDraft: onSaveDraft,
        nextSection: onNextSection,
      },
      onDeleteStart: () => setIsDeletingFile(true),
      onDeleteEnd: () => setIsDeletingFile(false),
      autocompleteValidation: autocompleteValidationRef,
    }),
    [
      allFields,
      setAllFields,
      mandatoryFields,
      onSubmitOrder,
      onSaveDraft,
      onNextSection,
      onCancelForm,
      onAddMoreTools,
    ],
  );

  const createJobContextValue = useMemo(
    () => ({ assetsAccessories, setAssetsAccessories, isDeletingFile, setIsDeletingFile }),
    [assetsAccessories, setAssetsAccessories, isDeletingFile, setIsDeletingFile],
  );

  if (!isInitialized || (isEditMode && isLoadingOrder)) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

  return (
    <GenericFormContext.Provider value={genericFormContextValue}>
      <CreateJobContext.Provider value={createJobContextValue}>
        <Formik
          initialValues={initialFormValues}
          onSubmit={(values, { setErrors, setTouched }) => {
            if (isSubmittingOrderRef.current) return;

            const wrappedSetTouched = async (touched: Record<string, boolean>) => {
              await setTouched(touched);
              return undefined as void | Record<string, string>;
            };
            return handleAction(
              "submit",
              { values, setErrors, setTouched: wrappedSetTouched },
              () => {
                const allIndices = sections.slice(1).map((_, i) => i + 1);
                setOpenAssetIndices(new Set(allIndices));
                return handleCreateOrder(values, false);
              },
            );
          }}
          enableReinitialize={true}
          validateOnBlur={false}
          validateOnChange={true}
          validateOnMount={false}
          validate={validate}
        >
          {({ values, setErrors, setTouched, setFieldValue }) => {
            return (
              <Form>
                <GenericSection
                  section={sections[0]}
                  getCollapsedTitle={getCustomerCollapsedTitle}
                  isCollapsed={!isCustomerOpen}
                  onHeaderClick={() => {
                    setIsCustomerOpen(!isCustomerOpen);
                  }}
                  currentMode={currentMode}
                  currentStatus={currentStatus}
                  isGloballyDisabled={isDeletingFile || isSubmittingOrder}
                />

                {sections.map((section, index) => {
                  return index === 0 ? null : (
                    <GenericSection
                      key={`${section.name}_${section.index}`}
                      section={section}
                      isCollapsed={!openAssetIndices.has(index)}
                      getCollapsedTitle={(values) => getAssetCollapsedTitle(values, index - 1)}
                      onDelete={
                        index > 1
                          ? () => {
                              deleteSection(index, setFieldValue);
                            }
                          : undefined
                      }
                      onHeaderClick={() => {
                        toggleAssetAccordion(index);
                      }}
                      currentMode={currentMode}
                      currentStatus={currentStatus}
                      isGloballyDisabled={isDeletingFile || isSubmittingOrder}
                    />
                  );
                })}

                {createJobForm && (
                  <GenericAction
                    actions={createJobForm.actions || []}
                    onActionClick={(actionName) => {
                      if (isSubmittingOrderRef.current) return;

                      const wrappedSetTouched = async (touched: Record<string, boolean>) => {
                        await setTouched(touched);
                        return undefined as void | Record<string, string>;
                      };
                      handleGenericAction(actionName, values, {
                        setErrors,
                        setTouched: wrappedSetTouched,
                        setFieldValue: (field: string, value: unknown) => {
                          void setFieldValue(field, value);
                        },
                      });
                    }}
                    currentMode={currentMode}
                    currentStatus={currentStatus}
                    isGloballyDisabled={isDeletingFile || isSubmittingOrder}
                  />
                )}
              </Form>
            );
          }}
        </Formik>
      </CreateJobContext.Provider>
    </GenericFormContext.Provider>
  );
}

export default CreateJob;
