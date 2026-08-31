import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { createUser, getUserById } from "../../../../api/services/users/action";
import { DEFAULT_STALE_TIME_MS } from "../../../../utils/queryConstants";
import ActivityIndicatorWithDelay from "../../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";
import { useBreadcrumbs } from "../../../../hooks/useBreadcrumbs";
import { useTranslation } from "react-i18next";
import OverviewHeader from "../../../../components/ui/OverviewHeader";
import { Tab, TabNavigation } from "@bosch/react-frok";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useFormInitialization } from "../../../../hooks/useFormInitialization";
import GenericForm from "../../../../components/generics/Form/GenericForm.types";
import { HeaderUserData } from "../../../../api/services/header/action";
import { GenericFormContext } from "../../../../components/generics/Form/GenericForm.context";
import Field from "../../../../components/generics/Field/GenericField.types";
import { useFormValidation } from "../../../../components/generics/Form/useFormValidation";
import { Form, Formik } from "formik";
import GenericAction from "../../../../components/generics/Action/GenericAction";
import GenericSection from "../../../../components/generics/Section/GenericSection";
import { toggleSectionFieldsDisabled } from "../../../../components/generics/utils";
import axiosClient from "../../../../api/axios-client/axiosClient";
import "./EmployeeOverview.scss";
import { useActionWithValidation } from "../../../../hooks/useActionWithValidation";
import { MessagesContext } from "../../../../contexts/messagescontext";
import { formatDateToDisplay } from "../../../../utils/dateFormatter";
import { AscUser } from "../../../../types/user.type";
import { mapAccountRolesToAPIFormat } from "./EmployeeOverview.utils";
import DeleteEmployeeDialog from "../DeleteEmployeeDialog/DeleteEmployeeDialog";

function EmployeeOverview() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const { employeeId } = useParams<{ employeeId: string }>();
  const { setMessages } = useContext(MessagesContext);

  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: () => getUserById(employeeId || ""),
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: false,
  });
  const { firstName, lastName, accountRoles, isActive, createdOn, email } = employee || {};
  const status = isActive ? "ACTIVE" : "INACTIVE";

  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const employeeOverviewForm =
    uiConfigurationForms?.forms.find((form) => form.name === "EmployeeOverview") || null;
  const initialTab = employeeOverviewForm?.sections[0]?.name || "";
  const [selectedTab, setSelectedTab] = useState<string>(initialTab);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);

  const employeeInfoSection = employeeOverviewForm?.sections.find(
    (section) => section.name === "employeeInfo",
  );

  useBreadcrumbs([
    { label: t("employees"), href: "/employee-list" },
    { label: t("employeeOverview"), href: "/" },
  ]);

  const {
    initialFormValues,
    setInitialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    tabs,
    isInitialized,
  } = useFormInitialization(employeeOverviewForm);

  const { validate, validateByAction, startValidation, stopValidation, setCurrentAction } =
    useFormValidation({
      allFields,
      mandatoryFieldsMap: mandatoryFields,
    });

  const mapValuesToFormFields = useCallback((employeeData: AscUser): Record<string, unknown> => {
    const formFieldValues: Record<string, unknown> = {
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      email: employeeData.email,
      phoneNumber: employeeData.phoneNumber,
      accountRoles: employeeData.accountRoles.map((role: any) => role.id),
      employeeCode: employeeData.employeeCode,
    };
    return formFieldValues;
  }, []);

  useEffect(() => {
    if (employee && isInitialized) {
      const mappedValues = mapValuesToFormFields(employee);
      setInitialFormValues((prev) => ({
        ...prev,
        ...mappedValues,
      }));
    }
  }, [employee, isInitialized, setInitialFormValues, mapValuesToFormFields]);

  const toggleFieldDisabledState = useCallback(() => {
    if (employeeInfoSection) {
      let isFieldDisabled = false;
      employeeInfoSection.areas
        .find((area) => area.name === "basicInfo")
        ?.fields.forEach((field) => {
          field.isDisabled = !field.isDisabled;
          isFieldDisabled = !field.isDisabled;
        });

      const allFieldsDisabled = toggleSectionFieldsDisabled(
        allFields || [],
        employeeInfoSection,
        isFieldDisabled,
      );
      setAllFields(allFieldsDisabled);
    }
  }, [allFields, employeeInfoSection, setAllFields]);

  useEffect(() => {
    if (employeeInfoSection && !employeeInfoSection?.isDisabled) {
      employeeInfoSection.isDisabled = true;
      toggleFieldDisabledState();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCancelSaveEmployee = useMemo(
    () =>
      (
        formValues: Record<string, unknown>,
        {
          setErrors,
          setTouched,
          setFieldValue,
        }: { setFieldValue: any; setErrors: any; setTouched: any },
      ) => {
        if (!employee) {
          return;
        }
        if (employeeInfoSection) {
          employeeInfoSection.isDisabled = true;
          toggleFieldDisabledState();
        }
        const oldValues = mapValuesToFormFields(employee);
        Object.entries(oldValues).forEach(([key, value]) => setFieldValue(key, value));
        setErrors({});
        setTouched({});
      },
    [employee, employeeInfoSection, mapValuesToFormFields, toggleFieldDisabledState],
  );

  const enableEditSection = (sectionName: string) => {
    if (sectionName === "employeeInfo") {
      if (employeeInfoSection) {
        employeeInfoSection.isDisabled = false;
        toggleFieldDisabledState();
      }
    }
  };

  const handleActionWithValidation = useActionWithValidation({
    allFields,
    validateByAction,
    startValidation,
    stopValidation,
    setCurrentAction,
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
      setMessages([{ type: "success", duration: 5000, text: t("employeeUpdatedSuccessfully") }]);
      if (employeeInfoSection) {
        employeeInfoSection.isDisabled = true;
        toggleFieldDisabledState();
      }
    },
    onError: (error: any) => {
      if (error?.status === 409) {
        setMessages([{ type: "error", duration: 5000, text: t("emailAlreadyExists") }]);
        return;
      }

      setMessages([{ type: "error", duration: 5000, text: t("failedToUpdateEmployee") }]);
    },
  });

  const onSaveEmployee = useMemo(
    () =>
      (
        formValues: Record<string, unknown>,
        { setErrors, setTouched }: { setFieldValue: any; setErrors: any; setTouched: any },
      ) => {
        void handleActionWithValidation("save", formValues, { setErrors, setTouched }, () => {
          mutation.mutate({
            ...formValues,
            type: "ASC",
            ascId: user?.ascId,
            language: user?.language || "en",
            userId: employeeId,
            accountRoles: mapAccountRolesToAPIFormat(formValues.accountRoles as string[]),
          });
        });
      },
    [handleActionWithValidation, mutation, user, employeeId],
  );

  const onDeactivateEmployee = useCallback(() => {
    void axiosClient.put(`/v1/users/suspend/${employeeId}`).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    });
  }, [employeeId, queryClient]);

  const handleGenericAction = useCallback(
    (actionName: string) => {
      const actionMap: Record<string, () => void> = {
        onDeleteUser: () => setShowDeleteDialog(true),
        onDeactivateUser: () => onDeactivateEmployee(),
      };

      const action = actionMap[actionName];
      if (action) {
        action();
      }
    },
    [onDeactivateEmployee, setShowDeleteDialog],
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
        onSaveEmployee,
        onCancelSaveEmployee,
      },
    }),
    [allFields, setAllFields, mandatoryFields, onSaveEmployee, onCancelSaveEmployee],
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
        type="employee"
        id={employeeId || ""}
        idLabel={t("employeeId")}
        createdAt={formatDateToDisplay(createdOn || "")}
        createdAtLabel={t("createdAt")}
        items={[
          {
            icon: "customer",
            title: `${firstName} ${lastName}`,
            subtitle: `${t("employeeName")}`,
          },
          {
            icon: "mail",
            title: `${email || "-"}`,
            subtitle: `${t("email")}`,
          },
          {
            icon: "user",
            title: `${accountRoles?.map((role) => role.name).join(", ")}`,
            subtitle: `${t("roles")}`,
          },
        ]}
        status={status}
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
          key={employeeId}
        >
          {() => {
            return (
              <Form>
                {employeeOverviewForm?.sections
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
                  actions={employeeOverviewForm?.actions || []}
                  onActionClick={(actionName) => {
                    if (!actionName) return;
                    handleGenericAction(actionName);
                  }}
                  currentStatus={status}
                />
              </Form>
            );
          }}
        </Formik>
      </GenericFormContext.Provider>
      <DeleteEmployeeDialog
        setShowDeleteDialog={setShowDeleteDialog}
        showDeleteDialog={showDeleteDialog}
        employeeId={employeeId || ""}
      />
    </div>
  );
}

export default EmployeeOverview;
