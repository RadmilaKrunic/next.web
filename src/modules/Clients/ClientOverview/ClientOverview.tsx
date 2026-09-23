import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getCustomerById } from "../../../api/services/customers/customers";
import { Customer } from "../../../api/services/customers/customers.types";
import { DEFAULT_STALE_TIME_MS } from "../../../utils/queryConstants";
import ActivityIndicatorWithDelay from "../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";
import { useBreadcrumbs } from "../../../hooks/useBreadcrumbs";
import { useTranslation } from "react-i18next";
import OverviewHeader from "../../../components/ui/OverviewHeader/OverviewHeader";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormInitialization } from "../../../hooks/useFormInitialization";
import GenericForm from "../../../components/generics/Form/GenericForm.types";
import { HeaderUserData } from "../../../api/services/header/action";
import { GenericFormContext } from "../../../components/generics/Form/GenericForm.context";
import Field from "../../../components/generics/Field/GenericField.types";
import { useFormValidation } from "../../../components/generics/Form/useFormValidation";
import {
  toggleSectionFieldsDisabled,
  convertAPIDataToFormValues,
} from "../../../components/generics/utils";
import axiosClient from "../../../api/axios-client/axiosClient";
import { useActionWithValidation } from "../../../hooks/useActionWithValidation";
import OverviewContent from "../../../components/ui/OverviewContent/OverviewContent";

function ClientOverview() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => getCustomerById(clientId || ""),
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: false,
  });
  const { firstName, lastName, isActive, assetsCount, billingAddress, mobileNumber, primaryEmail } =
    client || {};
  const status = isActive ? "ACTIVE" : "INACTIVE";

  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const clientOverviewForm =
    uiConfigurationForms?.forms.find((form) => form.name === "ClientOverview") || null;
  const initialTab = clientOverviewForm?.sections[0]?.name || "";
  const [selectedTab, setSelectedTab] = useState<string>(initialTab);

  const clientInfoSection = clientOverviewForm?.sections.find(
    (section) => section.name === "clientInfo",
  );

  useBreadcrumbs([
    { label: t("clients"), href: "/clients" },
    { label: t("clientOverview"), href: "/" },
  ]);

  const {
    initialFormValues,
    setInitialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    tabs,
    isInitialized,
  } = useFormInitialization(clientOverviewForm);

  const { validate, validateByAction, startValidation, stopValidation, setCurrentAction } =
    useFormValidation({
      allFields,
      mandatoryFieldsMap: mandatoryFields,
    });

  const mapValuesToFormFields = useCallback(
    (clientData: Customer): Record<string, unknown> =>
      convertAPIDataToFormValues(clientData, allFields || []),
    [allFields],
  );

  useEffect(() => {
    if (client && isInitialized && allFields && allFields.length > 0) {
      const mappedValues = mapValuesToFormFields(client);
      setInitialFormValues((prev) => ({
        ...prev,
        ...mappedValues,
      }));
    }
  }, [client, isInitialized, allFields, setInitialFormValues, mapValuesToFormFields]);

  const toggleFieldDisabledState = useCallback(() => {
    if (clientInfoSection) {
      let isFieldDisabled = false;
      clientInfoSection.areas.forEach((area) => {
        area.fields.forEach((field) => {
          field.isDisabled = !field.isDisabled;
          isFieldDisabled = !field.isDisabled;
        });
      });

      const allFieldsDisabled = toggleSectionFieldsDisabled(
        allFields || [],
        clientInfoSection,
        isFieldDisabled,
      );
      setAllFields(allFieldsDisabled);
    }
  }, [allFields, clientInfoSection, setAllFields]);

  const setClientInfoDisabled = useCallback(
    (disabled: boolean) => {
      if (clientInfoSection) {
        clientInfoSection.isDisabled = disabled;
        toggleFieldDisabledState();
      }
    },
    [clientInfoSection, toggleFieldDisabledState],
  );

  useEffect(() => {
    if (clientInfoSection && !clientInfoSection?.isDisabled) {
      setClientInfoDisabled(true);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCancelSaveClient = useMemo(
    () =>
      (
        formValues: Record<string, unknown>,
        {
          setErrors,
          setTouched,
          setFieldValue,
        }: { setFieldValue: any; setErrors: any; setTouched: any },
      ) => {
        if (!client) {
          return;
        }
        setClientInfoDisabled(true);
        const oldValues = mapValuesToFormFields(client);
        Object.entries(oldValues).forEach(([key, value]) => setFieldValue(key, value));
        setErrors({});
        setTouched({});
      },
    [client, mapValuesToFormFields, setClientInfoDisabled],
  );

  const enableEditSection = (sectionName: string) => {
    if (sectionName === "clientInfo") {
      setClientInfoDisabled(false);
    }
  };

  const handleActionWithValidation = useActionWithValidation({
    allFields,
    validateByAction,
    startValidation,
    stopValidation,
    setCurrentAction,
  });

  const onSaveClient = useMemo(
    () =>
      (
        formValues: Record<string, unknown>,
        { setErrors, setTouched }: { setFieldValue: any; setErrors: any; setTouched: any },
      ) => {
        void handleActionWithValidation("save", formValues, { setErrors, setTouched }, () => {
          console.log("onSaveClient formValues:", formValues);
        });
      },
    [handleActionWithValidation],
  );

  const onArchiveClient = useCallback(() => {
    void axiosClient.put(`/v1/clients/archive/${clientId}`).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
    });
  }, [clientId, queryClient]);

  const onCreateJob = useCallback(() => {
    navigate(`/create-job`);
  }, [navigate]);

  const handleGenericAction = useCallback(
    (actionName: string) => {
      const actionMap: Record<string, () => void> = {
        onArchiveClient: () => onArchiveClient(),
        onCreateJob: () => onCreateJob(),
      };

      const action = actionMap[actionName];
      if (action) {
        action();
      }
    },
    [onArchiveClient, onCreateJob],
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
        onSaveClient,
        onCancelSaveClient,
      },
    }),
    [allFields, setAllFields, mandatoryFields, onSaveClient, onCancelSaveClient],
  );

  if (isLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicatorWithDelay delay={500} />
      </div>
    );
  }

  return (
    <div>
      <OverviewHeader
        type="client"
        createdAt={client?.createdOn || ""}
        id={clientId || ""}
        idLabel={t("clientId")}
        createdAtLabel={t("createdAt")}
        items={[
          {
            icon: "customer",
            title: `${firstName} ${lastName}`,
            subtitle: `${mobileNumber || "-"} | ${primaryEmail || "-"}`,
          },
          {
            icon: "locator",
            title: `${billingAddress?.street || "-"}`,
            subtitle: `${billingAddress?.city || "-"}, ${billingAddress?.stateProvinceRegion || "-"}`,
          },
          {
            icon: "drill-driver-cordless",
            title: `${assetsCount || "-"}`,
            subtitle: `${t("totalAssets")}`,
          },
        ]}
        status={status}
        showStatus={true}
      />
      <GenericFormContext.Provider value={genericFormContextValue}>
        <OverviewContent
          form={clientOverviewForm}
          selectedTab={selectedTab}
          tabs={tabs.map((tab) => ({ ...tab, label: t(tab.label) }))}
          onTabSelect={setSelectedTab}
          initialFormValues={initialFormValues}
          validate={validate}
          formKey={clientId}
          onEditSection={enableEditSection}
          currentStatus={status}
          onActionClick={handleGenericAction}
        />
      </GenericFormContext.Provider>
    </div>
  );
}

export default ClientOverview;
