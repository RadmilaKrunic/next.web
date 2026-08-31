import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import { DEFAULT_STALE_TIME_MS } from "utils/queryConstants";
import { createASC, getASCById } from "api/services/serviceCenters/action";
import ActivityIndicatorWithDelay from "components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";
import OverviewHeader from "components/ui/OverviewHeader";
import { formatDateToDisplay } from "utils/dateFormatter";
import { useBreadcrumbs } from "hooks/useBreadcrumbs";
import { HeaderUserData } from "api/services/header/action";
import GenericForm from "components/generics/Form/GenericForm.types";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Tab, TabNavigation } from "@bosch/react-frok";
import { useFormInitialization } from "hooks/useFormInitialization";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import Field from "components/generics/Field/GenericField.types";
import GenericSection from "components/generics/Section/GenericSection";
import { Formik, Form } from "formik";
import { toggleSectionFieldsDisabled } from "components/generics/utils";
import { useFormValidation } from "components/generics/Form/useFormValidation";
import { ServiceCenter } from "api/services/serviceCenters/serviceCenters.types";
import {
  mapBanking,
  mapBoschConfig,
  mapGeneralInfo,
  mapNotifications,
  mapPricing,
  mapReimbursement,
} from "../ASC.utils";
import Section from "components/generics/Section/GenericSection.types";
import { MessagesContext } from "contexts/messagescontext";
import { useActionWithValidation } from "../../../../hooks/useActionWithValidation";
import { scrollToTop } from "../../../../utils/scrollToError";
import GenericAction from "../../../../components/generics/Action/GenericAction";
import axiosClient from "../../../../api/axios-client/axiosClient";

function AscOverview() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { setMessages } = useContext(MessagesContext);

  const queryClient = useQueryClient();
  const { ascId: paramsAscId } = useParams<{ ascId: string }>();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const ascId = paramsAscId || user?.ascId || "";
  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const ascOverviewForm =
    uiConfigurationForms?.forms.find((form) => form.name === "ASCOverview") || null;
  const location = useLocation();

  const initialTab = location.hash.replace("#", "") || ascOverviewForm?.sections[0]?.name || "";
  const [selectedTab, setSelectedTab] = useState<string>(initialTab);

  const breadcrumbs = paramsAscId
    ? [
        { label: t("ascProfiles"), href: "/asc-profiles" },
        { label: t("ascOverview"), href: "/" },
      ]
    : [{ label: t("ascProfile"), href: "/" }];

  useBreadcrumbs(breadcrumbs);

  const {
    initialFormValues,
    setInitialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    tabs,
    isInitialized,
  } = useFormInitialization(ascOverviewForm);

  const { validate, validateByAction, startValidation, stopValidation, setCurrentAction } =
    useFormValidation({
      allFields,
      mandatoryFieldsMap: mandatoryFields,
    });

  const handleActionWithValidation = useActionWithValidation({
    allFields,
    validateByAction,
    startValidation,
    stopValidation,
    setCurrentAction,
  });

  const setFieldValueRef = useRef<any>(null);

  const { data: asc, isLoading } = useQuery({
    queryKey: ["ASC", ascId],
    queryFn: () => getASCById(ascId),
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: false,
    enabled: Boolean(ascId),
  });
  const status = asc?.isActive ? "ACTIVE" : "INACTIVE";
  const imageUrl = asc?.logo?.logoId
    ? `${import.meta.env.VITE_API_BASE_URL}/v1/files/static/${asc.logo.logoId}`
    : "";

  const toggleFieldDisabledState = useCallback(
    (section: Section) => {
      if (section) {
        let isFieldDisabled = false;
        section.areas.forEach((area) => {
          area.fields.forEach((field) => {
            field.isDisabled = !field.isDisabled;
            isFieldDisabled = !field.isDisabled;
          });
        });

        const allFieldsDisabled = toggleSectionFieldsDisabled(
          allFields || [],
          section,
          isFieldDisabled,
        );
        setAllFields(allFieldsDisabled);
      }
    },
    [allFields, setAllFields],
  );

  const enableEditSection = (sectionName: string) => {
    const section = ascOverviewForm?.sections.find((section) => section.name === sectionName);
    if (section) {
      section.isDisabled = false;
      toggleFieldDisabledState(section);
    }
  };

  const mapValuesToFormFields = useCallback((asc: ServiceCenter): Record<string, unknown> => {
    const formFieldValues: Record<string, unknown> = {
      name: asc.name,
      email: asc.email,
      phoneNumber: asc.phoneNumber,
      gst: asc.gst,
      companyVATNumber: asc.companyVATNumber,
      isActive: asc.isActive,
      streetName: asc.address?.street,
      city: asc.address?.city,
      state: asc.address?.stateProvinceRegion,
      postalCode: asc.address?.postalCode,
      country: asc.address?.countryCode,
      logo: asc?.logo?.logoId
        ? [{ name: asc.logo.name, type: asc.logo.type, attachmentId: asc.logo.logoId }]
        : [],
      houseNumber: asc.address?.houseNumber,
      bankName: asc.bankAccount?.bankName,
      accountNumber: asc.bankAccount?.accountNumber,
      notificationEmail: asc?.notification?.includes("EMAIL") || false,
      notificationSMS: asc?.notification?.includes("SMS") || false,
      parentNotificationEmail: asc?.parentNotification?.includes("EMAIL") || false,
      parentNotificationSMS: asc?.parentNotification?.includes("SMS") || false,
      biqicName: asc.biqicName,
      pkPriceChargeable: asc.pkPriceChargeable,
      laPriceChargeable: asc.laPriceChargeable,
      frPriceChargeable: asc.frPriceChargeable,
      customerCode: asc.customerCode,
      serviceCenterType: asc.serviceCenterType,
      laPrice: asc.laPrice,
      frPrice: asc.frPrice,
      pkPrice: asc.pkPrice,
      sparePartsDiscount: asc.sparePartsDiscount,
      accessoriesDiscount: asc.accessoriesDiscount,
      sparePartsIncentive: asc.sparePartsIncentive,
      accessoriesIncentive: asc.accessoriesIncentive,
      packagingCost: asc.packagingCost,
      defaultCountry: asc.defaultCountry,
      reimbursementConfig:
        asc.reimbursementConfig?.map((config) => {
          return {
            category: config.category,
            reimbursementMethods: {
              REPAIR: config.reimbursementMethods.REPAIR || "",
              EXCHANGE: config.reimbursementMethods.EXCHANGE || "",
            },
          };
        }) || null,
      reimbursementCreateOn: asc.reimbursementCreateOn,
      reimbursementPeriodType: asc.reimbursementPeriodType,
    };
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
  }, [asc, isInitialized, setInitialFormValues, mapValuesToFormFields]);

  const onCancelUpdate = useCallback(
    (
      formValues: Record<string, unknown>,
      {
        setErrors,
        setTouched,
        setFieldValue,
      }: { setFieldValue: any; setErrors: any; setTouched: any },
    ) => {
      if (!asc) {
        return;
      }
      const activeSection = ascOverviewForm?.sections.find(
        (section) => section.name === selectedTab,
      );
      if (activeSection) {
        activeSection.isDisabled = true;
        toggleFieldDisabledState(activeSection);
      }

      const oldValues = mapValuesToFormFields(asc);
      Object.entries(oldValues).forEach(([key, value]) => {
        setFieldValue(key, value);
      });
      setErrors({});
      setTouched({});
    },
    [asc, ascOverviewForm, selectedTab, toggleFieldDisabledState, mapValuesToFormFields],
  );

  const { mutate } = useMutation({
    mutationFn: (data: any) => {
      return createASC(data, false);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["ascProfiles"] });
      queryClient.setQueryData(["ASC", ascId], response);
      setMessages([{ type: "success", duration: 5000, text: t("dataUpdatedSuccessfully") }]);
      scrollToTop();
    },
    onError: () => {
      if (!asc) return;

      const oldValues = mapValuesToFormFields(asc);
      Object.entries(oldValues).forEach(([key, value]) => {
        setFieldValueRef.current?.(key, value);
      });
      setMessages([{ type: "error", duration: 5000, text: t("failedToUpdateData") }]);
      scrollToTop();
    },
  });

  const mapToAPIValues = useCallback(
    (formValues: Record<string, unknown>) => {
      if (!asc) return {};
      const updatedValues: any = {
        ...initialFormValues,
        ...mapGeneralInfo(selectedTab === "generalInfo" ? formValues : initialFormValues),
        bankAccount: {
          ...mapBanking(selectedTab === "banking" ? formValues : initialFormValues),
        },
        ...mapPricing(selectedTab === "pricing" ? formValues : initialFormValues),
        ...mapBoschConfig(
          selectedTab === "boschInternalConfiguration" ? formValues : initialFormValues,
        ),
        ...mapReimbursement(selectedTab === "reimbursement" ? formValues : initialFormValues, asc),
        ...mapNotifications(selectedTab === "notifications" ? formValues : initialFormValues),

        ascId: asc.ascId,
        currencySymbol: asc.currencySymbol,
        currency: asc.currency,
        reimbursementType: "DIRECT_SHIPMENT",
      };

      if (updatedValues.reimbursementPeriodType === "CUSTOM") {
        updatedValues.reimbursementCreateOn = null;
      }

      delete updatedValues["state"];
      delete updatedValues["streetName"];
      delete updatedValues["postalCode"];
      delete updatedValues["country"];
      delete updatedValues["houseNumber"];
      delete updatedValues["city"];
      delete updatedValues["accountNumber"];
      delete updatedValues["bankName"];
      delete updatedValues["notificationEmail"];
      delete updatedValues["notificationSMS"];
      delete updatedValues["parentNotificationEmail"];
      delete updatedValues["parentNotificationSMS"];
      Object.keys(updatedValues).forEach((key) => {
        if (key.includes("reimbursementMethod")) {
          delete updatedValues[key];
        }
      });

      return updatedValues;
    },
    [asc, initialFormValues, selectedTab],
  );

  const onSettledSaveUpdate = useCallback(() => {
    const section = ascOverviewForm?.sections.find((section) => section.name === selectedTab);
    if (section) {
      section.isDisabled = true;
      toggleFieldDisabledState(section);
    }
  }, [ascOverviewForm, selectedTab, toggleFieldDisabledState]);

  const onSaveUpdate = useCallback(
    (
      formValues: Record<string, unknown>,
      { setErrors, setTouched }: { setFieldValue: any; setErrors: any; setTouched: any },
    ) => {
      if (!asc) return;
      const apiValues = mapToAPIValues(formValues);
      handleActionWithValidation("save", formValues, { setErrors, setTouched }, () => {
        mutate(
          { serviceCenter: { ...apiValues } },
          {
            onSettled: onSettledSaveUpdate,
          },
        );
      });
    },
    [asc, mapToAPIValues, handleActionWithValidation, mutate, onSettledSaveUpdate],
  );

  const handleAscOverviewAction = useCallback(
    (actionName: string) => {
      if (actionName === "onDeactivateASC") {
        void axiosClient.put(`/v1/service-centers/${ascId}`).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["ASC", ascId] });
        });
      }
    },
    [ascId, queryClient],
  );

  const genericFormContextValue = useMemo(
    () => ({
      allFields: allFields || [],
      setAllFields: (value: React.SetStateAction<Field[]>) => {
        if (typeof value === "function") {
          setAllFields((prev) => value(prev || []));
        } else {
          setAllFields(value);
        }
      },
      mandatoryFields,
      setMandatoryFields: () => {},
      actionCallbacks: {
        onSaveUpdate,
        onCancelUpdate,
      },
    }),
    [allFields, setAllFields, mandatoryFields, onSaveUpdate, onCancelUpdate],
  );

  if (isLoading || !ascId) {
    return (
      <div className="loading-container">
        <ActivityIndicatorWithDelay delay={500} />
      </div>
    );
  }

  return (
    <div>
      <OverviewHeader
        type="ASC"
        id={ascId || ""}
        idLabel={t("ascId")}
        createdAt={formatDateToDisplay(asc?.createdOn || "")}
        createdAtLabel={t("createdAt")}
        items={[
          {
            icon: "imagery",
            title: `${asc?.name || "-"}`,
            subtitle: `${t("authorizedServiceCenter")}`,
            isImage: true,
            imgUrl: imageUrl,
          },
          {
            icon: "call",
            title: `${asc?.phoneNumber || "-"}`,
            subtitle: `${asc?.email || "-"}`,
          },
          {
            icon: "locator",
            title: `${asc?.address?.street || "-"}`,
            subtitle: `${asc?.address?.city || "-"}, ${asc?.address?.stateProvinceRegion || "-"}`,
          },
        ]}
        status={asc?.isActive ? "ACTIVE" : "INACTIVE"}
        showStatus={true}
      />
      <GenericFormContext.Provider value={genericFormContextValue}>
        <TabNavigation
          className="sticky-tab-navigation"
          selectedValue={selectedTab || tabs[0]?.name}
          onTabSelect={(_, data) => setSelectedTab(data.value as string)}
        >
          {tabs.map((tab) => (
            <Tab
              key={`${tab.name}_${tab.position}`}
              as={"a"}
              href={`#${tab.name}`}
              value={tab.name}
            >
              {t(tab.label)}
            </Tab>
          ))}
        </TabNavigation>
        <Formik
          initialValues={initialFormValues}
          validate={validate}
          onSubmit={() => {}}
          enableReinitialize={true}
          validateOnBlur={false}
        >
          {({ setFieldValue }) => {
            setFieldValueRef.current = setFieldValue;
            return (
              <Form>
                {ascOverviewForm?.sections
                  .filter((section) => section.name === selectedTab)
                  .map((section) => {
                    return (
                      <GenericSection
                        key={`${section.name}`}
                        section={section}
                        onEdit={() => enableEditSection(section.name)}
                      />
                    );
                  })}
                <GenericAction
                  actions={ascOverviewForm?.actions || []}
                  onActionClick={(actionName) => {
                    if (!actionName) return;
                    handleAscOverviewAction(actionName);
                  }}
                  currentStatus={status}
                />
              </Form>
            );
          }}
        </Formik>
      </GenericFormContext.Provider>
    </div>
  );
}

export default AscOverview;
