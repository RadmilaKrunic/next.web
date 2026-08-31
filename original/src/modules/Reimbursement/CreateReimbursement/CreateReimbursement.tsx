import React, { useCallback, useContext, useMemo, useState } from "react";
import { useBreadcrumbs } from "../../../hooks/useBreadcrumbs";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HeaderUserData } from "../../../api/services/header/action";
import GenericForm from "../../../components/generics/Form/GenericForm.types";
import { useFormInitialization } from "../../../hooks/useFormInitialization";
import { ActivityIndicator, Chip } from "@bosch/react-frok";
import { GenericFormContext } from "../../../components/generics/Form/GenericForm.context";
import { Form, Formik } from "formik";
import GenericAction from "../../../components/generics/Action/GenericAction";
import GenericSection from "../../../components/generics/Section/GenericSection";
import Field from "../../../components/generics/Field/GenericField.types";
import { useFormValidation } from "../../../components/generics/Form/useFormValidation";
import { DEFAULT_STALE_TIME_MS } from "../../../utils/queryConstants";
import { generateReimbursement } from "../../../api/services/reimbursements/action";
import "./CreateReimbursement.scss";
import { formatDateToDisplay } from "../../../utils/dateFormatter";
import { CountryConfig } from "../../../api/services/countryConfiguration/countryConfiguration";
import { useNavigate } from "react-router-dom";
import { MessagesContext } from "../../../contexts/messagescontext";

function CreateReimbursement() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  useBreadcrumbs([
    { label: t("ascList"), href: "/reimbursement#asc-list" },
    { label: t("createReimbursement"), href: "" },
  ]);
  const navigate = useNavigate();
  const { setMessages } = useContext(MessagesContext);
  const [isCreatingReimbursement, setIsCreatingReimbursement] = useState(false);

  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const createReimbursementForm =
    uiConfigurationForms?.forms.find((form) => form.name === "createReimbursement") || null;
  const [formValues, setFormValues] = React.useState<Record<string, any>>({});
  const countryCode = user?.countryCode;

  const { currencySymbol } =
    queryClient.getQueryData<CountryConfig>(["countryConfiguration", countryCode]) || {};

  const { data: reimbursementDryRunInfo } = useQuery({
    queryKey: ["reimbursementDryRunInfo", formValues["ascDetails"], formValues["dateRange"]],
    queryFn: () =>
      generateReimbursement({
        serviceCenterIds: formValues["ascDetails"]?.split(","),
        startDate: formValues["dateRange"].split(",")[0],
        endDate: formValues["dateRange"].split(",")[1],
        dryRun: true,
      }),
    enabled: !!formValues["ascDetails"] && !!formValues["dateRange"]?.split(",")[1],
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    staleTime: DEFAULT_STALE_TIME_MS,
  });
  const { approvedClaimCount, totalAmount } = reimbursementDryRunInfo || {};

  const {
    sections,
    reset,
    initialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    isInitialized,
  } = useFormInitialization(createReimbursementForm);

  const { validate } = useFormValidation({
    allFields,
    mandatoryFieldsMap: mandatoryFields,
  });

  const createReimbursementError = useCallback(() => {
    setIsCreatingReimbursement(false);
    setMessages((prev) => [
      ...prev,
      { text: t("createReimbursementError"), type: "error", duration: 3000 },
    ]);
  }, [setMessages, t]);

  const createReimbursement = useCallback(() => {
    const payload = {
      serviceCenterIds: formValues["ascDetails"]?.split(","),
      startDate: formValues["dateRange"].split(",")[0],
      endDate: formValues["dateRange"].split(",")[1],
      dryRun: false,
    };
    setIsCreatingReimbursement(true);
    generateReimbursement(payload)
      .then(() => {
        setIsCreatingReimbursement(false);
        queryClient.invalidateQueries({ queryKey: ["reimbursements"] });
        navigate("/reimbursement#reimbursement-list");
      })
      .catch(createReimbursementError);
  }, [formValues, navigate, createReimbursementError, queryClient]);

  const handleGenericAction = useCallback(
    (actionName: string) => {
      const actionMap: Record<string, () => void> = {
        onCreate: createReimbursement,
        onCancel: () => {
          reset();
        },
      };
      const action = actionMap[actionName];
      if (action) {
        action();
      }
    },
    [reset, createReimbursement],
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
      actionCallbacks: {},
    }),
    [allFields, setAllFields, mandatoryFields],
  );

  const status =
    !!formValues["ascDetails"] && !!formValues["dateRange"]?.split(",")[1] && !!approvedClaimCount
      ? "ENABLED"
      : "DISABLED";

  if (!isInitialized) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

  return (
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
        {({ values }) => {
          setFormValues(values);
          return (
            <div className="create-reimbursement-container">
              {isCreatingReimbursement && (
                <div className="reimbursement-loading-container">
                  <h5>{t("creatingReimbursementLoader")}</h5>
                  <ActivityIndicator size="large" />
                </div>
              )}
              <Form>
                <GenericSection section={sections[0]}></GenericSection>
                <div className="create-reimbursement-subsection">
                  <h5 className="create-reimbursement-subsection-title">{t("eligibleClaims")}</h5>
                  <div className="create-reimbursement-subsection-content">
                    <span>
                      <div>
                        <b>
                          {t("totalClaimsIncluded")}: {approvedClaimCount ?? "N/A"}
                        </b>
                      </div>
                      {reimbursementDryRunInfo ? (
                        <div className="date-range-text">
                          {t("dateRange")}:
                          {formatDateToDisplay(reimbursementDryRunInfo.periodStartDate)} -
                          {formatDateToDisplay(reimbursementDryRunInfo.periodEndDate)}
                        </div>
                      ) : (
                        <div className="date-range-text">{t("selectDateRangeReimbursement")}</div>
                      )}
                    </span>
                    {!!totalAmount && (
                      <div>
                        {t("totalReimbursementAmount")}:
                        <Chip selected label={`${currencySymbol}${totalAmount}`} />
                      </div>
                    )}
                  </div>
                </div>

                {createReimbursementForm && (
                  <GenericAction
                    actions={createReimbursementForm.actions || []}
                    onActionClick={(actionName) => {
                      if (actionName) {
                        handleGenericAction(actionName);
                      }
                    }}
                    currentStatus={status}
                  />
                )}
              </Form>
            </div>
          );
        }}
      </Formik>
    </GenericFormContext.Provider>
  );
}

export default CreateReimbursement;
