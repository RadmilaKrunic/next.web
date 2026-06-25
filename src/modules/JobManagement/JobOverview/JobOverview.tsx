import { useEffect, useState, useMemo, useCallback, useRef, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { TabNavigation, Tab, Notification } from "@bosch/react-frok";
import "./JobOverview.scss";
import GenericSection from "components/generics/Section/GenericSection";
import GenericAction from "components/generics/Action/GenericAction";
import {
  convertAPIDataToFormValues,
  setSectionDisabledState,
  mapValuesToAPI,
} from "components/generics/utils";
import { getUploadFieldErrors } from "components/generics/Form/formValidation";
import Field from "components/generics/Field/GenericField.types";
import { GenericFormContext, ActionCallback } from "components/generics/Form/GenericForm.context";
import GenericForm from "components/generics/Form/GenericForm.types";
import Section from "components/generics/Section/GenericSection.types";
import { Formik, Form, useFormikContext } from "formik";
import { useFormValidation } from "components/generics/Form/useFormValidation";
import { scrollToTop } from "utils/scrollToError";
import { getApiErrorMessage } from "utils/getApiErrorMessage";
import { CreateJobContext } from "../CreateJob/CreateJob.context";
import { useTranslation } from "react-i18next";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { User } from "types/user.type";
import { Message } from "contexts/messagescontext";
import { useAccessoriesManager } from "hooks/useAccessoriesManager";
import { useBreadcrumbs } from "hooks/useBreadcrumbs";
import { useDiagnosticData } from "hooks/useDiagnosticData";
import {
  postMessage,
  getCostEstimationPdf,
  type ValidateAndSaveResponse,
} from "api/services/jobs/action";
import JobOverviewHeader from "./JobOverviewHeader/JobOverviewHeader";
import {
  useJobById,
  usePatchJobById,
  usePostCustomerData,
  usePostJobStatusStartDiagnostic,
  useToggleJobHold,
  usePostValidateAndSave,
  usePostDiagnostic,
  usePostRepairApproval,
  usePostInternalApprovalRequest,
  usePostStartReview,
  usePostStartRepair,
  usePostFinishRepair,
  usePostToolDelivered,
  usePostCreateCostEstimate,
  usePostCustomerAnswer,
} from "api/services/jobs/hooks";
import { useUpdateApprovalStatus } from "api/services/approvals/hooks";
import ApprovalDecisionModal from "../../ClaimManagement/ApprovalList/ApprovalListTable/ApprovalDecisionModal/ApprovalDecisionModal";
import AddSpecialMaterialModal from "./AddSpecialMaterialModal/AddSpecialMaterialModal";
import AnswerModal from "./AnswerModal/AnswerModal";
import { CUSTOMER_ANSWER_OPTIONS } from "./AnswerModal/AnswerModal.constants";
import ExplosionDrawingModal from "./ExplosionDiagram/ExplosionDrawingModal";
import { PositionItem } from "./ExplosionDiagram/ExplosionDrawing.types";
import { SpecialMaterial } from "./AddSpecialMaterialModal/SpecialMeterialItem/SpecialMaterialItem";
import {
  getBoschInternalPending,
  useDiagnosticsManager,
  getChargeablePendingInfo,
} from "hooks/useDiagnosticsManager";
import { useFormInitialization } from "hooks/useFormInitialization";
import {
  useActionWithValidation,
  type ValidationActionHelpers,
} from "hooks/useActionWithValidation";
import { usePositionDropdownSync } from "hooks/usePositionDropdownSync";
import { useSectionEditing } from "hooks/useSectionEditing";
import { DiagnosticsContext } from "./DiagnosticsContext";
import {
  SUMMARY_TYPE_FILTER,
  aggregateRowPrices,
  distributeGrossToRows,
  distributeNetToRows,
  calculateSummaryTotalAmountDistribution,
  calculateSummaryNetAmountDistribution,
  roundToTwo,
} from "utils/priceCalculator";
import { MessagesContext } from "../../../contexts/messagescontext";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";
import {
  areAllActionsDisabled,
  ActionDependencyContext,
} from "components/generics/Action/actionDependency";
import { JobOverviewItem, JobDiagnostic } from "../JobList/JobList.types";
import ActivityIndicatorWithDelay from "../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";

/** Bridges Formik values → React state for actionType/jobType that drive the manager. */
function FormikDiagnosticsSync({
  setCurrentActionType,
  setCurrentJobType,
}: {
  setCurrentActionType: (v: string) => void;
  setCurrentJobType: (v: string) => void;
}) {
  const { values } = useFormikContext<Record<string, unknown>>();
  const actionType = (values.actionType as string) || "";
  const jobType = (values.jobType as string) || "";

  useEffect(() => {
    setCurrentActionType(actionType);
  }, [actionType, setCurrentActionType]);
  useEffect(() => {
    setCurrentJobType(jobType);
  }, [jobType, setCurrentJobType]);

  return null;
}

export default function JobOverview() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const { setMessages } = useContext(MessagesContext);
  const [arePricesValidated, setArePricesValidated] = useState(false);
  const [summaryTypeOptions, setSummaryTypeOptions] = useState<{ label: string; value: string }[]>([
    { value: "totalSummary", label: "totalSummary" },
  ]);
  const hasSendForReviewPermission = useHasPermission([
    PERMISSIONS.DIAGNOSTICS.CAN_SEND_FOR_REVIEW,
  ]);
  const userData = queryClient.getQueryData<User>(["user"]);
  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    userData?.countryCode,
  ]);
  const jobOverviewForm =
    uiConfigurationForms?.forms.find((form) => form.name === "JobOverview") ?? null;
  const { jobId } = useParams<{ jobId: string }>();
  const tabFromHash = globalThis.location.hash.substring(1);

  const postMessageMutation = useMutation({
    mutationFn: postMessage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", jobId] });
      setMessages((prev) => [
        ...prev,
        { text: t("successAddNote"), type: "success", duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [...prev, { text: t("errorAddNote"), type: "error", duration: 3000 }]);
    },
  });

  const location = useLocation();
  const fromRef = useRef((location.state as { from?: string } | null)?.from);
  const isFromApprovalList = fromRef.current === "approval-list";
  useBreadcrumbs([
    isFromApprovalList
      ? { label: t("approvalList"), href: "/approval-list" }
      : { label: t("jobList"), href: "/job-list" },
    { label: jobId || "", href: "" },
  ]);

  const {
    initialFormValues,
    setInitialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    tabs,
    setTabs,
  } = useFormInitialization(jobOverviewForm);

  // Invalidate on every open so stale cache does not serve outdated job/diagnostic data.
  useEffect(() => {
    if (!jobId) return;
    void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    void queryClient.invalidateQueries({ queryKey: ["diagnostic", jobId] });
  }, [jobId, queryClient]);

  const { data: jobData, isLoading: loading, error } = useJobById(jobId || "");
  const { diagnosticData, diagnosticLoading, shouldFetchDiagnostic } = useDiagnosticData({
    jobId: jobId || "",
    jobData,
    tabs: tabs || [],
  });

  const currentStatus = jobData?.job?.jobStatus || "";
  const isCustomerApprovalPendingStatus =
    currentStatus === "CUSTOMER_APPROVAL_PENDING" || currentStatus === "MULTIPLE_APPROVAL_PENDING";

  const getDiagnosticFromValidateResponse = useCallback(
    (data: ValidateAndSaveResponse): JobDiagnostic | null => {
      if (data.diagnostic) return data.diagnostic;

      const hasTopLevelDiagnosticData =
        Array.isArray(data.materials) ||
        Array.isArray(data.archivedMaterials) ||
        !!data.priceSummary ||
        typeof data.actionType === "string" ||
        typeof data.jobType === "string";

      if (!hasTopLevelDiagnosticData || !jobId) return null;
      const responce = { ...data, jobId } as JobDiagnostic;
      return responce;
    },
    [jobId],
  );

  const mergedJobData = useMemo(() => {
    if (!jobData) return jobData;
    return {
      ...jobData,
      diagnostic: diagnosticData,
    };
  }, [jobData, diagnosticData]);

  const patchJobMutation = usePatchJobById({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      setMessages((prev) => [
        ...prev,
        { text: t("successSaveAssetData"), type: "success", duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorSaveAssetData"), type: "error", duration: 3000 },
      ]);
    },
  });

  const postJobStatusMutation = usePostJobStatusStartDiagnostic({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      setMessages((prev) => [
        ...prev,
        { text: t("successUpdateJobStatus"), type: "success", duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorUpdateJobStatus"), type: "error", duration: 3000 },
      ]);
    },
  });

  const toggleJobHoldMutation = useToggleJobHold({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      const messageKey = preToggleHoldStateRef.current
        ? "successResumeJobHold"
        : "successToggleJobHold";
      setMessages((prev) => [...prev, { text: t(messageKey), type: "success", duration: 3000 }]);
      scrollToTop();
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorToggleJobHold"), type: "error", duration: 3000 },
      ]);
    },
  });

  const postCustomerMutation = usePostCustomerData({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["order", jobData?.order?.orderId] });
      void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["autocomplete"] });
      setMessages((prev) => [
        ...prev,
        { text: t("successCustomerDataUpdate"), type: "success", duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorUpdateCustomerData"), type: "error", duration: 3000 },
      ]);
    },
  });

  const startRepairMutation = usePostStartRepair({
    onSuccess: async () => {
      resyncMaterialsFromAPI();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["job", jobId] }),
        queryClient.refetchQueries({ queryKey: ["diagnostic", jobId] }),
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successStartRepair"), type: "success", duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorStartRepair"), type: "error", duration: 3000 },
      ]);
    },
  });

  const finishRepairMutation = usePostFinishRepair({
    onSuccess: async () => {
      resyncMaterialsFromAPI();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["job", jobId] }),
        queryClient.refetchQueries({ queryKey: ["diagnostic", jobId] }),
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successFinishRepair"), type: "success", duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorFinishRepair"), type: "error", duration: 3000 },
      ]);
    },
  });

  const toolDeliveredMutation = usePostToolDelivered({
    onSuccess: async () => {
      resyncMaterialsFromAPI();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["job", jobId] }),
        queryClient.refetchQueries({ queryKey: ["diagnostic", jobId] }),
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successToolDelivered"), type: "success", duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorToolDelivered"), type: "error", duration: 3000 },
      ]);
    },
  });

  const approvePreApprovalMutation = useUpdateApprovalStatus({
    onSuccess: async () => {
      setMessages((prev) => [
        ...prev,
        { text: `${t("successfulJobPreApprovalDecision")}`, type: "success", duration: 3000 },
      ]);
      resyncMaterialsFromAPI();
        await Promise.all([
      queryClient.refetchQueries({ queryKey: ["job", jobId] }),
        queryClient.refetchQueries({ queryKey: ["diagnostic", jobId] }),
          queryClient.refetchQueries({ queryKey: ["approvals"] }),
       ]);
      const updatedJob = queryClient.getQueryData<JobOverviewItem>(["job", jobId]);
      if (!updatedJob?.job?.pendingApprovals?.includes("BOSCH_INTERNAL")) {
        await navigate("/approval-list");
      }
      scrollToTop();
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: `${t("errorJobPreApprovalDecision")}`, type: "error", duration: 3000 },
      ]);
      scrollToTop();
    },
  });

  const startReviewMutation = usePostStartReview({
    onSuccess: async () => {
      resyncMaterialsFromAPI();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["job", jobId] }),
        queryClient.refetchQueries({ queryKey: ["diagnostic", jobId] }),
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successSubmitForReview"), type: "success", duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorSubmitForReview"), type: "error", duration: 3000 },
      ]);
    },
  });

  const repairApprovalMutation = usePostRepairApproval({
    onSuccess: async () => {
      resyncMaterialsFromAPI();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["job", jobId] }),
        queryClient.refetchQueries({ queryKey: ["diagnostic", jobId] }),
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successApproveForRepair"), type: "success", duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorApproveForRepair"), type: "error", duration: 3000 },
      ]);
    },
  });

  const internalApprovalRequestMutation = usePostInternalApprovalRequest({
    onSuccess: async () => {
      resyncMaterialsFromAPI();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["job", jobId] }),
        queryClient.refetchQueries({ queryKey: ["diagnostic", jobId] }),
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successRequestInternalApproval"), type: "success", duration: 3000 },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          text: getApiErrorMessage(error, t, "errorRequestInternalApproval"),
          type: "error",
          duration: 5000,
        },
      ]);
      scrollToTop();
    },
  });

  const customerAnswerMutation = usePostCustomerAnswer({
    onSuccess: async () => {
      resyncMaterialsFromAPI();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["job", jobId] }),
        queryClient.refetchQueries({ queryKey: ["diagnostic", jobId] }),
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successSubmitCustomerAnswer"), type: "success", duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorSubmitCustomerAnswer"), type: "error", duration: 3000 },
      ]);
    },
  });

  const createCostEstimateMutation = usePostCreateCostEstimate({
    onSuccess: async () => {
      resyncMaterialsFromAPI();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["job", jobId] }),
        queryClient.refetchQueries({ queryKey: ["diagnostic", jobId] }),
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successCreateCostEstimate"), type: "success", duration: 3000 },
      ]);
      if (jobId) {
        const blob = await getCostEstimationPdf(jobId);
        if (blob) {
          const url = URL.createObjectURL(blob);
          const newWindow = window.open(url, "_blank");
          if (newWindow) {
            setTimeout(() => {
              URL.revokeObjectURL(url);
            }, 1000);
          }
        }
      }
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { text: t("errorCreateCostEstimate"), type: "error", duration: 3000 },
      ]);
    },
  });

  const silentDiagnosticMutation = usePostDiagnostic();

  const validateAndSaveMutation = usePostValidateAndSave({
    onSuccess: async (data) => {
      isResyncingRef.current = true;

      const validatedDiagnostic = getDiagnosticFromValidateResponse(data);
      if (validatedDiagnostic && jobId) {
        // Merge with the existing cached diagnostic so any fields not returned by the
        // validate API (e.g. technicianNote) are preserved from the previous cache entry.
        // Fields present in validatedDiagnostic always override.
        const existingDiagnostic = queryClient.getQueryData<JobDiagnostic>(["diagnostic", jobId]);
        queryClient.setQueryData(["diagnostic", jobId], {
          ...existingDiagnostic,
          ...validatedDiagnostic,
        });
      }

      if (data.errorMessages && data.errorMessages.length > 0) {
        const uniqueErrorKeys = [
          ...new Set(
            data.errorMessages.filter((item) => item.key !== "2004").map((item) => item.key),
          ),
        ];
        const errorText =
          uniqueErrorKeys.length > 0
            ? `${t("priceNotAvailable")}: ${uniqueErrorKeys.join(", ")}`
            : t("orderSimulationFailed");
        resyncMaterialsFromAPI(false);
        setMessages((prev) => [...prev, { text: errorText, type: "error", duration: 5000 }]);
        scrollToTop();
        return;
      }

      markAllValidated();
      resyncMaterialsFromAPI(true);
      // Keep pricing flow FE-driven: use validate response merged into diagnostic cache
      // and let diagnostics manager recalculate row/summary values from that local data.
      await queryClient.refetchQueries({ queryKey: ["job", jobId] });
      setArePricesValidated(true);
      setMessages((prev) => [
        ...prev,
        {
          text: t("successValidateAndSave"),
          type: "success",
          duration: 3000,
        },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          text: getApiErrorMessage(error, t, "errorValidateAndSave"),
          type: "error",
          duration: 5000,
        },
      ]);
      setArePricesValidated(false);
      scrollToTop();
    },
  });

  const [selectedTab, setSelectedTab] = useState<string>("");
  const [showAddSpecialMaterialModal, setShowAddSpecialMaterialModal] = useState(false);
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);
  const [preApprovalDecision, setPreApprovalDecision] = useState<
    "approved" | "rejected" | "revised" | null
  >(null);
  const [isExplosionDrawingModalOpen, setIsExplosionDrawingModalOpen] = useState(false);
  const [existingPartNumbersForModal, setExistingPartNumbersForModal] = useState<Set<string>>(
    new Set(),
  );

  const skipFormResetRef = useRef(false);
  const formValuesRef = useRef<Record<string, unknown>>({});
  const allFieldsRef = useRef<Field[] | null>(null);
  allFieldsRef.current = allFields;
  /** Fields excluding archived spare-parts areas — used for type/status checks that must not include archived rows. */
  const materialsFieldsRef = useRef<Field[]>([]);
  materialsFieldsRef.current = (allFields ?? []).filter(
    (f) => !f.name.includes("archivedSpareParts"),
  );
  const setFieldValueRef = useRef<((field: string, value: unknown) => void) | null>(null);
  const activeValueChangeFieldRef = useRef<string | null>(null);
  const isDistributingRef = useRef(false);
  const isResyncingRef = useRef(false);
  const clearResyncRafRef = useRef<number | null>(null);
  const preToggleHoldStateRef = useRef(false);
  const prevMergedJobDataRef = useRef<typeof mergedJobData>(undefined);
  const hashTabAppliedRef = useRef(false);
  const autocompleteValidationRef = useRef<Record<string, boolean>>({});
  const sparePartBelongsToToolRef = useRef<Record<string, boolean>>({});

  const { validate, validateByAction, startValidation, stopValidation, setCurrentAction } =
    useFormValidation({
      allFields,
      mandatoryFieldsMap: mandatoryFields,
      autocompleteValidationRef,
    });

  const visibleTabs = useMemo(() => {
    return tabs.filter((tab) => {
      return !tab.hiddenForStatuses?.includes(currentStatus);
    });
  }, [tabs, currentStatus]);

  useEffect(() => {
    if (visibleTabs.length === 0) return;

    const hashMatchedTab = visibleTabs.find((tab) => tab.name === tabFromHash)?.name;

    if (!selectedTab) {
      const initialTab = hashMatchedTab ?? visibleTabs[0].name;
      setSelectedTab(initialTab);
      if (initialTab === tabFromHash) {
        hashTabAppliedRef.current = true;
      }
    } else if (!hashTabAppliedRef.current && hashMatchedTab) {
      setSelectedTab(hashMatchedTab);
      hashTabAppliedRef.current = true;
    }
  }, [visibleTabs, selectedTab, tabFromHash]);

  const [currentActionType, setCurrentActionType] = useState(
    (initialFormValues?.actionType as string) || "",
  );
  const [currentJobType, setCurrentJobType] = useState(
    (initialFormValues?.jobType as string) || "",
  );
  useEffect(() => {
    setCurrentActionType((initialFormValues?.actionType as string) || "");
    setCurrentJobType((initialFormValues?.jobType as string) || "");
  }, [initialFormValues]);

  const {
    materials,
    apiMaterialsLoaded,
    apiMaterialsEmpty,
    hasExistingDiagnostic,
    setMaterials,
    allowedPositions,
    addSpecialMaterialsAllowed,
    positionDropdownOptions,
    getPositionConfig,
    onAddRow: onAddSparePart,
    onDeleteRow: onDeleteSparePart,
    onRestoreRow: onRestoreSparePart,
    onAddMaterials: addMaterialsToForm,
    getExistingPartNumbers,
    markAllValidated,
    markRowDirty,
    enableValidate: managerEnableValidate,
    resyncMaterialsFromAPI,
    setRevisedRowPending,
    canArchiveOnDelete,
    discountBase,
    automaticRows,
  } = useDiagnosticsManager({
    diagnosticData: tabs.length > 0 ? diagnosticData : undefined,
    currentActionType,
    currentJobType,
    tabs,
    setTabs,
    allFields,
    setAllFields,
    setInitialFormValues,
    skipFormResetRef,
    formValuesRef,
    arePricesValidated,
    setArePricesValidated,
    isResyncingRef,
    jobStatus: currentStatus,
  });

  const { assetsAccessories, setAssetsAccessories } = useAccessoriesManager({
    mode: "view",
    allFields,
    setAllFields,
    setInitialFormValues,
    apiJobsAccessories: jobData?.job?.asset?.accessories
      ? [{ accessories: jobData.job.asset.accessories }] // Single job: jobIndex is undefined
      : [],
    convertAPIDataToFormValues,
    apiData: mergedJobData,
  });

  const { editingSections, setEditingSections, enableSectionEditing, disableSectionEditing } =
    useSectionEditing({
      tabs,
      allFields,
      setAllFields,
      assetsAccessories,
      setAssetsAccessories,
      mergedJobData,
      setInitialFormValues,
    });

  usePositionDropdownSync({
    allFields,
    setAllFields,
    setTabs,
    allowedPositions,
    getPositionConfig,
    formValuesRef,
    skipFormResetRef,
  });

  const onCancelNewNote = useCallback(
    (
      formValues?: Record<string, unknown>,
      helpers?: { setFieldValue: (field: string, value: unknown) => void },
    ) => {
      if (helpers?.setFieldValue) {
        helpers.setFieldValue("note", "");
      }
      setEditingSections((prev) => {
        const newSet = new Set(prev);
        newSet.delete("notes");
        return newSet;
      });
    },
    [setEditingSections],
  );

  const onSaveNewNote = useCallback(
    (
      formValues?: Record<string, unknown>,
      helpers?: { setFieldValue: (field: string, value: unknown) => void },
    ) => {
      if (!jobId) return;

      const noteValue = (formValues?.note as string)?.trim() || "";
      if (!noteValue) return;

      const messageData = {
        jobId,
        messageId: null,
        messageType: "GENERAL" as const,
        decision: null,
        message: noteValue,
      };

      postMessageMutation.mutate(messageData);
      onCancelNewNote(formValues, helpers);
    },
    [jobId, postMessageMutation, onCancelNewNote],
  );

  type ActionHelpers = ValidationActionHelpers;

  const handleActionWithValidation = useActionWithValidation({
    allFields,
    validateByAction,
    startValidation,
    stopValidation,
    setCurrentAction,
  });

  const onSaveCustomer = useCallback(
    async (formValues?: Record<string, unknown>, helpers?: ActionHelpers) => {
      const orderId = jobData?.order?.orderId;
      if (!allFields || !formValues || !helpers || !orderId) return;

      const mappedValues = mapValuesToAPI(formValues, allFields) as Record<string, unknown>;
      const mappedOrder = mappedValues["order"] as Record<string, unknown>;
      const mappedCustomer = mappedOrder["customer"] as Record<string, unknown>;
      if (mappedCustomer["useBillingAddressForDelivery"]) {
        mappedCustomer["deliveryAddress"] = null;
      }
      const payload: Record<string, any> = mappedCustomer;
      const onSaveCustomerError = () => {
        setMessages((prev) => [
          ...prev,
          { text: t("errorUpdateCustomerData"), type: "error", duration: 3000 },
        ]);
      };
      const doMutate = () => {
        postCustomerMutation.mutate(
          { orderId, payload },
          {
            onSuccess: () => {
              disableSectionEditing("customerAndPaymentData");
            },
            onError: onSaveCustomerError,
          },
        );
        disableSectionEditing("customerAndPaymentData");
      };

      if (helpers) {
        await handleActionWithValidation("onSaveCustomer", formValues, helpers, doMutate);
      } else {
        doMutate();
      }
    },
    [
      jobData?.order?.orderId,
      allFields,
      postCustomerMutation,
      disableSectionEditing,
      handleActionWithValidation,
      setMessages,
      t,
    ],
  );

  const onCancelSaveCustomer = useCallback(() => {
    disableSectionEditing("customerAndPaymentData", true);
  }, [disableSectionEditing]);

  const onCancelEditAsset = useCallback(() => {
    disableSectionEditing("assetData", true);
  }, [disableSectionEditing]);

  const onSaveAsset = useCallback(
    async (formValues: Record<string, unknown>, helpers?: ActionHelpers) => {
      if (!jobId || !allFields) return;

      const mappedData = mapValuesToAPI(formValues, allFields) as Record<string, unknown>;
      const mappedJob = (mappedData["job"] as Record<string, unknown> | undefined) ?? {};
      const mappedAsset = (mappedJob["asset"] as Record<string, unknown> | undefined) ?? {};

      if (!mappedAsset["hasAccessories"]) {
        mappedAsset["accessories"] = null;
      }

      mappedJob["asset"] = mappedAsset;
      const payload: Record<string, unknown> = mappedJob;
      const doMutate = () => {
        patchJobMutation.mutate(
          { jobId, data: payload },
          {
            onSuccess: () => {
              disableSectionEditing("assetData", true);
            },
          },
        );
      };

      if (helpers) {
        await handleActionWithValidation("onSaveAsset", formValues, helpers, doMutate);
      } else {
        doMutate();
      }
    },
    [jobId, allFields, patchJobMutation, disableSectionEditing, handleActionWithValidation],
  );

  const handleAddSpecialMaterials = useCallback(
    (materials: SpecialMaterial[]) => {
      const jobType = (formValuesRef.current?.jobType as string) || "";
      addMaterialsToForm(
        materials.map((m) => ({
          position: "SP",
          partNumber: m.partNumber,
          description: m.partName,
          type: jobType,
          quantity: 1,
          unitPrice: m.unitPrice,
          origin: "specialMaterial" as const,
        })),
        setFieldValueRef.current ?? undefined,
      );
    },
    [addMaterialsToForm],
  );

  const handleExplosionDrawingSubmit = useCallback(
    (positions: PositionItem[]) => {
      const jobType = (formValuesRef.current?.jobType as string) || "";
      addMaterialsToForm(
        positions
          .filter((p) => p.partNumber)
          .map((p) => ({
            position: "SP",
            partNumber: p.partNumber,
            description: p.partName,
            type: jobType,
            quantity: p.quantity,
            unitPrice: null,
            origin: "explosionDrawing" as const,
          })),
        setFieldValueRef.current ?? undefined,
      );
    },
    [addMaterialsToForm],
  );

  const getExistingMaterialsAsPositionItems = useCallback((): PositionItem[] => {
    return materials.map((item) => ({
      position: item.position,
      partNumber: item.partNumber,
      partName: item.description,
      type: item.type,
      positionType: "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
  }, [materials]);

  const onAddSpecialMaterials = useCallback(
    (formValues: Record<string, unknown>) => {
      if (!addSpecialMaterialsAllowed) {
        console.warn("Adding special materials is not allowed for this country configuration.");
        return;
      }
      setExistingPartNumbersForModal(getExistingPartNumbers(formValues));
      setShowAddSpecialMaterialModal(true);
    },
    [getExistingPartNumbers, addSpecialMaterialsAllowed],
  );

  const onProductDetails = useCallback(() => {
    setIsExplosionDrawingModalOpen(true);
  }, []);

  const onSubmitForReview = useCallback(() => {
    if (!jobId) return;
    startReviewMutation.mutate({ jobId });
  }, [jobId, startReviewMutation]);

  const onStartRepair = useCallback(() => {
    if (!jobId) return;
    startRepairMutation.mutate({ jobId });
  }, [jobId, startRepairMutation]);

  const onFinishRepair = useCallback(() => {
    if (!jobId) return;

    const uploadField = (allFieldsRef.current ?? []).find(
      (f) => f.fieldMapping?.originalName === "upload",
    );
    if (uploadField) {
      const existingAttachments = jobData?.job?.asset?.attachments ?? [];
      const FormikFormatValues = {
        ...formValuesRef.current,
        [uploadField.name]: existingAttachments,
      };
      const uploadErrors = getUploadFieldErrors(uploadField, FormikFormatValues);
      if (uploadErrors.length > 0) {
        setMessages((prev) => [
          ...prev,
          ...uploadErrors.map((key): Message => ({ text: t(key), type: "error", duration: 3000 })),
        ]);
        scrollToTop();
        return;
      }
    }

    finishRepairMutation.mutate({ jobId });
  }, [jobId, finishRepairMutation, jobData?.job?.asset?.attachments, setMessages, t]);

  const onToolDelivered = useCallback(() => {
    if (!jobId) return;
    toolDeliveredMutation.mutate({ jobId });
  }, [jobId, toolDeliveredMutation]);

  const onApprovePreApproval = useCallback(() => {
    if (!jobId) return;
    setPreApprovalDecision("approved");
  }, [jobId]);

  const onRejectPreApproval = useCallback(() => {
    if (!jobId) return;
    setPreApprovalDecision("rejected");
  }, [jobId]);

  const onRevisePreApproval = useCallback(() => {
    if (!jobId) return;
    setPreApprovalDecision("revised");
  }, [jobId]);

  const handlePreApprovalConfirm = useCallback(
    (comments: string) => {
      if (!jobId || !preApprovalDecision) return;
      let approvalStatus = "REVISED";
      if (preApprovalDecision === "approved") approvalStatus = "APPROVED";
      else if (preApprovalDecision === "rejected") approvalStatus = "REJECTED";

      const currentValues = formValuesRef.current;
      const currentAllFields = allFieldsRef.current ?? [];
      const materialIds = currentAllFields
        .filter(
          (field) =>
            field.fieldMapping?.originalName === "preApprovalCheckbox" &&
            currentValues[field.name] === true,
        )
        .map((field) => {
          const materialIdFieldName = field.name.replace("preApprovalCheckbox", "materialId");
          return currentValues[materialIdFieldName] as string;
        })
        .filter(Boolean);

      approvePreApprovalMutation.mutate({
        jobId,
        materialIds,
        approvalStatus,
        message: comments || null,
      });
      setPreApprovalDecision(null);
    },
    [jobId, preApprovalDecision, approvePreApprovalMutation],
  );

  const getPreApprovalModalTitle = useCallback(() => {
    switch (preApprovalDecision) {
      case "approved":
        return t("approvePreApproval");
      case "rejected":
        return t("rejectPreApproval");
      case "revised":
        return t("revisePreApproval");
      default:
        return "";
    }
  }, [preApprovalDecision, t]);
  const buildDiagnosticPayload = useCallback(
    (
      formValues: Record<string, unknown>,
      currentAllFields: Field[],
      options?: { preserveCalculatedPrices?: boolean },
    ): Record<string, unknown> => {
      const mappedData = mapValuesToAPI(formValues, currentAllFields) as Record<string, unknown>;
      const payload = (mappedData["diagnostic"] as Record<string, unknown>) ?? {};
      const preserveCalculatedPrices = options?.preserveCalculatedPrices ?? false;
      if (Array.isArray(payload.materials)) {
        const normalizedMaterials = (payload.materials as Record<string, unknown>[])
          .filter((m) => m !== null && m !== undefined)
          .map((m, index) => {
            const order = Number(m.order);
            return {
              ...m,
              order: Number.isFinite(order) && order > 0 ? order : index + 1,
            };
          })
          .sort((a, b) => Number(a.order) - Number(b.order));

        payload.materials = normalizedMaterials;
        const withoutIds = (payload.materials as unknown[]).some((m) => {
          const id = (m as Record<string, unknown>)["id"];
          return !id;
        });
        const newDiagnostic =
          payload.status === "DRAFT" || payload.status === null || payload.status === undefined;

        if (withoutIds || newDiagnostic) {
          (payload.materials as unknown[]).forEach((m) => {
            if (newDiagnostic && !preserveCalculatedPrices) {
              payload.status = "DRAFT";
              (m as Record<string, unknown>)["price"] = null;
              return;
            }
            const price = (m as Record<string, unknown>)["price"];
            if (
              !preserveCalculatedPrices &&
              (price as Record<string, unknown>)?.["unitPrice"] === null
            ) {
              (m as Record<string, unknown>)["price"] = null;
            }
          });
        }

        if (
          preserveCalculatedPrices ||
          (payload.priceSummary !== null &&
            payload.priceSummary !== undefined &&
            !withoutIds &&
            !newDiagnostic)
        ) {
          const totalAggregate = aggregateRowPrices(
            formValues,
            currentAllFields,
            SUMMARY_TYPE_FILTER.totalSummary,
            discountBase,
          );
          payload.priceSummary = {
            suggestedNetPrice: totalAggregate.suggestedNetPrice,
            discount: totalAggregate.discount,
            netAmount: totalAggregate.netAmount,
            taxAmount: totalAggregate.taxAmount,
            grossAmount: totalAggregate.grossAmount,
            totalAmount: totalAggregate.totalAmount,
            discountAmount: totalAggregate.discountAmount,
          };
        }
      }

      if (Array.isArray(payload.archivedMaterials)) {
        payload.archivedMaterials = (payload.archivedMaterials as Record<string, unknown>[]).filter(
          (m) => m !== null && m !== undefined && Boolean(m.partNumber),
        );
      }
      if (!Array.isArray(payload.archivedMaterials) || payload.archivedMaterials.length === 0) {
        delete payload.archivedMaterials;
      }
      return payload;
    },
    [discountBase],
  );

  const onApproveForRepair = useCallback(async () => {
    if (!jobId) return;
    if (allFieldsRef.current) {
      const diagnosticPayload = buildDiagnosticPayload(
        formValuesRef.current,
        allFieldsRef.current,
        {
          preserveCalculatedPrices: true,
        },
      );
      try {
        await silentDiagnosticMutation.mutateAsync({ jobId, payload: diagnosticPayload });
      } catch (e) {
        console.error(e);
      }
    }
    repairApprovalMutation.mutate({ jobId });
  }, [jobId, repairApprovalMutation, silentDiagnosticMutation, buildDiagnosticPayload]);

  const onRequestInternalApproval = useCallback(async () => {
    if (!jobId) return;
    if (allFieldsRef.current) {
      const diagnosticPayload = buildDiagnosticPayload(
        formValuesRef.current,
        allFieldsRef.current,
        {
          preserveCalculatedPrices: true,
        },
      );
      try {
        await silentDiagnosticMutation.mutateAsync({ jobId, payload: diagnosticPayload });
      } catch (e) {
        console.error(e);
      }
    }
    internalApprovalRequestMutation.mutate({ jobId });
  }, [jobId, internalApprovalRequestMutation, silentDiagnosticMutation, buildDiagnosticPayload]);

  const onValidate = useCallback(
    async (formValues: Record<string, unknown>, helpers?: ActionHelpers) => {
      const currentAllFields = allFieldsRef.current;
      if (!jobId || !currentAllFields) return;
      const payload = buildDiagnosticPayload(formValues, currentAllFields);
      if (helpers) {
        await handleActionWithValidation("validate", formValues, helpers, () =>
          validateAndSaveMutation.mutate({ jobId, payload }),
        );
      } else {
        validateAndSaveMutation.mutate({ jobId, payload });
      }
    },
    [jobId, validateAndSaveMutation, buildDiagnosticPayload, handleActionWithValidation],
  );

  const onHold = useCallback(() => {
    if (!jobId) return;
    preToggleHoldStateRef.current = jobData?.job?.isOnHold ?? false;
    setEditingSections(new Set());
    toggleJobHoldMutation.mutate({ jobId });
  }, [jobId, toggleJobHoldMutation, jobData?.job?.isOnHold, setEditingSections]);

  const onGoToNextStep = useCallback(() => {
    if (!jobId) return;
    postJobStatusMutation.mutate(
      {
        jobId,
      },
      {
        onSuccess: () => {
          setSelectedTab("diagnosticData");
        },
      },
    );
  }, [jobId, postJobStatusMutation, setSelectedTab]);

  const onCreateCostEstimate = useCallback(async () => {
    if (!jobId) return;
    if (allFieldsRef.current) {
      const diagnosticPayload = buildDiagnosticPayload(
        formValuesRef.current,
        allFieldsRef.current,
        {
          preserveCalculatedPrices: true,
        },
      );
      try {
        await silentDiagnosticMutation.mutateAsync({ jobId, payload: diagnosticPayload });
      } catch (e) {
        console.error(e);
      }
    }
    createCostEstimateMutation.mutate({ jobId });
  }, [jobId, createCostEstimateMutation, silentDiagnosticMutation, buildDiagnosticPayload]);

  const onCustomerAnswer = useCallback(() => {
    setIsAnswerModalOpen(true);
  }, []);

  const onAnswerModalSave = useCallback(
    (selectedAnswer: string) => {
      if (!jobId) return;
      customerAnswerMutation.mutate(
        { jobId, answer: selectedAnswer },
        { onSuccess: () => setIsAnswerModalOpen(false) },
      );
    },
    [jobId, customerAnswerMutation],
  );

  const onAnswerModalClose = useCallback(() => {
    setIsAnswerModalOpen(false);
  }, []);

  const handleGenericAction = useCallback(
    (
      actionName: string,
      formValues: Record<string, unknown>,
      helpers: {
        setErrors: (errors: Record<string, unknown>) => void;
        setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, unknown>>;
        setFieldValue: (field: string, value: unknown) => void;
      },
    ) => {
      const values = formValues;

      const actionHelpers = {
        setFieldValue: helpers.setFieldValue,
        setErrors: helpers.setErrors,
        setTouched: helpers.setTouched,
      };

      const actionMap: Record<string, () => void> = {
        onHold: () => onHold(),
        onGoToNextStep: () => onGoToNextStep(),
        onCustomerAnswer: () => onCustomerAnswer(),
        onSaveCustomer: () => {
          void onSaveCustomer(values, actionHelpers);
        },
        onCancelSaveCustomer: () => onCancelSaveCustomer(),
        onSaveAsset: () => {
          void onSaveAsset(values, actionHelpers);
        },
        onCancelEditAsset: () => onCancelEditAsset(),
        onAddSparePart: () => onAddSparePart(values),
        onAddSpecialMaterials: () => onAddSpecialMaterials(values),
        onProductDetails: () => onProductDetails(),
        onValidate: () => {
          void onValidate(values, actionHelpers);
        },
        onApproveForRepair: () => {
          void onApproveForRepair();
        },
        onRequestInternalApproval: () => {
          void onRequestInternalApproval();
        },
        onSubmitForReview: () => onSubmitForReview(),
        onStartRepair: () => onStartRepair(),
        onFinishRepair: () => onFinishRepair(),
        onToolDelivered: () => onToolDelivered(),
        onCreateCostEstimate: () => {
          void onCreateCostEstimate();
        },
        onApprovePreApproval: () => onApprovePreApproval(),
        onRejectPreApproval: () => onRejectPreApproval(),
        onRevisePreApproval: () => onRevisePreApproval(),
      };

      const action = actionMap[actionName];
      if (action) {
        action();
      }
    },
    [
      onHold,
      onGoToNextStep,
      onCustomerAnswer,
      onSaveCustomer,
      onCancelSaveCustomer,
      onSaveAsset,
      onCancelEditAsset,
      onAddSparePart,
      onAddSpecialMaterials,
      onProductDetails,
      onValidate,
      onApproveForRepair,
      onRequestInternalApproval,
      onSubmitForReview,
      onStartRepair,
      onFinishRepair,
      onToolDelivered,
      onCreateCostEstimate,
      onApprovePreApproval,
      onRejectPreApproval,
      onRevisePreApproval,
    ],
  );

  const onSummaryDiscountChange = useCallback(
    (newDiscountValue: unknown) => {
      if (discountBase !== "GROSS_PRICE") return;

      const fields = allFieldsRef.current;
      const setFV = setFieldValueRef.current;
      if (!fields || !setFV) return;

      const values = formValuesRef.current;
      const grossField = fields.find((f) => f.subtype === "diagnosticSummaryGrossAmountMaterial");
      const totalField = fields.find((f) => f.subtype === "diagnosticSummaryTotalAmountMaterial");
      const typeField = fields.find((f) => f.subtype === "diagnosticSummaryType");

      const discountPercent = Math.max(0, roundToTwo(Number(newDiscountValue) || 0));
      const currentSummaryType = (values[typeField?.name ?? ""] as string) || "totalSummary";
      const typeFilter =
        SUMMARY_TYPE_FILTER[currentSummaryType] ?? SUMMARY_TYPE_FILTER.totalSummary;

      const grossAmountSum = grossField ? Number(values[grossField.name]) || 0 : 0;
      const newAmountToDistribute = roundToTwo(grossAmountSum * (1 - discountPercent / 100));

      const activeDiscountMaterialField = fields.find(
        (f) =>
          f.subtype === "diagnosticSummaryDiscountMaterial" &&
          f.dependentFields?.some((df) => df.fieldValue === "GROSS_PRICE"),
      );
      if (activeDiscountMaterialField) setFV(activeDiscountMaterialField.name, discountPercent);

      isDistributingRef.current = true;
      if (totalField) setFV(totalField.name, newAmountToDistribute);
      distributeGrossToRows(discountPercent, typeFilter, values, setFV, fields);
    },
    [discountBase],
  );
  const onSummaryDiscountNetChange = useCallback(
    (newDiscountValue: unknown) => {
      if (discountBase !== "NET_PRICE") return;

      const fields = allFieldsRef.current;
      const setFV = setFieldValueRef.current;
      if (!fields || !setFV) return;

      const values = formValuesRef.current;

      const suggestedNetField = fields.find(
        (f) => f.subtype === "diagnosticSummarySuggestedNetPriceMaterial",
      );
      const netField = fields.find((f) => f.subtype === "diagnosticSummaryNetAmountMaterial");
      const hiddenDiscountField = fields.find(
        (f) => f.subtype === "diagnosticSummaryDiscountMaterialHidden",
      );
      const typeField = fields.find((f) => f.subtype === "diagnosticSummaryType");

      const discountPercent = Math.max(0, Number(newDiscountValue) || 0);
      const currentSummaryType = (values[typeField?.name ?? ""] as string) || "totalSummary";
      const typeFilter =
        SUMMARY_TYPE_FILTER[currentSummaryType] ?? SUMMARY_TYPE_FILTER.totalSummary;

      const suggestedNetPriceSum = suggestedNetField
        ? Number(values[suggestedNetField.name]) || 0
        : 0;

      const newAmountToDistribute = roundToTwo(suggestedNetPriceSum * (1 - discountPercent / 100));

      const activeDiscountNetMaterialField = fields.find(
        (f) =>
          f.subtype === "diagnosticSummaryDiscountNetMaterial" &&
          f.dependentFields?.some((df) => df.fieldValue === "NET_PRICE"),
      );
      if (activeDiscountNetMaterialField)
        setFV(activeDiscountNetMaterialField.name, discountPercent);

      isDistributingRef.current = true;
      if (netField) setFV(netField.name, newAmountToDistribute);
      if (hiddenDiscountField) setFV(hiddenDiscountField.name, discountPercent);
      distributeNetToRows(discountPercent, typeFilter, values, setFV, fields);
    },
    [discountBase],
  );

  useEffect(() => {
    setFieldValueRef.current?.("discountBase", discountBase);
  }, [discountBase]);

  useEffect(() => {
    if (!isResyncingRef.current) return;
    if (clearResyncRafRef.current !== null) {
      cancelAnimationFrame(clearResyncRafRef.current);
    }
    clearResyncRafRef.current = requestAnimationFrame(() => {
      clearResyncRafRef.current = requestAnimationFrame(() => {
        clearResyncRafRef.current = null;
        isResyncingRef.current = false;
      });
    });
  }, [initialFormValues]);

  const enableValidate = useCallback(() => {
    if (validateAndSaveMutation.isPending) return false;
    if (isCustomerApprovalPendingStatus) return false;
    const { pendingTypeFields } = getChargeablePendingInfo(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    if (pendingTypeFields.length === 0) return false;
    if (!managerEnableValidate()) return false;
    return true;
  }, [validateAndSaveMutation.isPending, isCustomerApprovalPendingStatus, managerEnableValidate]);

  const enableAddingSparePart = useCallback(() => {
    if (allowedPositions.length === 0) return false;
    const positionFields = (allFields ?? []).filter((f) => f.subtype === "diagnosticPosition");
    const positionCounts: Record<string, number> = {};
    positionFields.forEach((f) => {
      const val = formValuesRef.current[f.name] as string;
      if (val) positionCounts[val] = (positionCounts[val] ?? 0) + 1;
    });
    return allowedPositions.some((p) => (positionCounts[p.position] ?? 0) < p.maxCount);
  }, [allowedPositions, allFields]);

  const enableAddingSpecialMaterials = useCallback(
    () => addSpecialMaterialsAllowed,
    [addSpecialMaterialsAllowed],
  );

  const enableGoToNextStep = useCallback(
    () => !postJobStatusMutation.isPending,
    [postJobStatusMutation.isPending],
  );

  const enableHold = useCallback(
    () => !toggleJobHoldMutation.isPending,
    [toggleJobHoldMutation.isPending],
  );

  const enableStartRepair = useCallback(
    () => !startRepairMutation.isPending,
    [startRepairMutation.isPending],
  );

  const enableFinishRepair = useCallback(
    () => !finishRepairMutation.isPending,
    [finishRepairMutation.isPending],
  );

  const enableSubmitForReview = useCallback(
    () => !startReviewMutation.isPending && arePricesValidated,
    [startReviewMutation.isPending, arePricesValidated],
  );

  const enableToolDelivered = useCallback(
    () => !toolDeliveredMutation.isPending,
    [toolDeliveredMutation.isPending],
  );

  const enableSaveCustomer = useCallback(
    () => !postCustomerMutation.isPending,
    [postCustomerMutation.isPending],
  );

  const enableSaveAsset = useCallback(
    () => !patchJobMutation.isPending,
    [patchJobMutation.isPending],
  );

  const enableSaveNote = useCallback(
    () => !postMessageMutation.isPending,
    [postMessageMutation.isPending],
  );

  const enableProductDetails = useCallback(() => {
    const spPosition = allowedPositions.find((p) => p.position === "SP");
    if (!spPosition) return false;
    const positionFields = (allFields ?? []).filter((f) => f.subtype === "diagnosticPosition");
    const spCount = positionFields.filter(
      (f) => (formValuesRef.current[f.name] as string) === "SP",
    ).length;
    return spCount < spPosition.maxCount;
  }, [allowedPositions, allFields]);

  const onSummaryTotalAmountChange = useCallback(
    (newTotalAmountValue: unknown) => {
      if (discountBase !== "GROSS_PRICE") return;
      // Guard: prevent re-entry if already distributing
      if (isDistributingRef.current) return;

      const fields = allFieldsRef.current;
      const setFV = setFieldValueRef.current;
      if (!fields || !setFV) return;

      const values = formValuesRef.current;
      const grossField = fields.find((f) => f.subtype === "diagnosticSummaryGrossAmountMaterial");
      const totalSummaryField = fields.find((f) => f.subtype === "diagnosticSummaryTotalAmount");
      const discountField = fields.find((f) => f.subtype === "diagnosticSummaryDiscountMaterial");
      const hiddenDiscountField = fields.find(
        (f) => f.subtype === "diagnosticSummaryDiscountMaterialHidden",
      );
      const typeField = fields.find((f) => f.subtype === "diagnosticSummaryType");

      const rawTotalAmountValue = Math.max(0, Number(newTotalAmountValue) || 0);
      const currentSummaryType = (values[typeField?.name ?? ""] as string) || "totalSummary";
      const typeFilter =
        SUMMARY_TYPE_FILTER[currentSummaryType] ?? SUMMARY_TYPE_FILTER.totalSummary;
      const currentGrossAmountSum = grossField ? Number(values[grossField.name]) || 0 : 0;

      // Clamp: total amount cannot exceed gross amount sum (discount cannot go negative)
      const totalAmountValue =
        currentGrossAmountSum > 0
          ? Math.min(rawTotalAmountValue, currentGrossAmountSum)
          : rawTotalAmountValue;

      const newDiscount = calculateSummaryTotalAmountDistribution(
        totalAmountValue,
        currentGrossAmountSum,
      );

      const materialTotalField = fields.find(
        (f) => f.subtype === "diagnosticSummaryTotalAmountMaterial",
      );
      if (materialTotalField) setFV(materialTotalField.name, totalAmountValue);
      if (discountField) setFV(discountField.name, newDiscount);
      if (hiddenDiscountField) setFV(hiddenDiscountField.name, newDiscount);
      if (totalSummaryField) setFV(totalSummaryField.name, totalAmountValue);
      isDistributingRef.current = true;
      distributeGrossToRows(newDiscount, typeFilter, values, setFV, fields);
    },
    [discountBase],
  );

  const onSummaryNetAmountChange = useCallback(
    (newNetAmountValue: unknown) => {
      if (discountBase !== "NET_PRICE") return;
      // Guard: prevent re-entry if already distributing
      if (isDistributingRef.current) return;

      const fields = allFieldsRef.current;
      const setFV = setFieldValueRef.current;
      if (!fields || !setFV) return;

      const values = formValuesRef.current;

      const suggestedNetField = fields.find(
        (f) => f.subtype === "diagnosticSummarySuggestedNetPriceMaterial",
      );
      const discountField = fields.find(
        (f) => f.subtype === "diagnosticSummaryDiscountNetMaterial",
      );
      const hiddenDiscountField = fields.find(
        (f) => f.subtype === "diagnosticSummaryDiscountMaterialHidden",
      );
      const typeField = fields.find((f) => f.subtype === "diagnosticSummaryType");

      const rawNetAmountValue = Math.max(0, Number(newNetAmountValue) || 0);
      const currentSummaryType = (values[typeField?.name ?? ""] as string) || "totalSummary";
      const typeFilter =
        SUMMARY_TYPE_FILTER[currentSummaryType] ?? SUMMARY_TYPE_FILTER.totalSummary;

      const suggestedNetPriceSum = suggestedNetField
        ? Number(values[suggestedNetField.name]) || 0
        : 0;

      // Clamp: net amount cannot exceed suggested net price sum (discount cannot go negative)
      const netAmountValue =
        suggestedNetPriceSum > 0
          ? Math.min(rawNetAmountValue, suggestedNetPriceSum)
          : rawNetAmountValue;

      const newDiscount = calculateSummaryNetAmountDistribution(
        netAmountValue,
        suggestedNetPriceSum,
      );

      const materialNetField = fields.find(
        (f) => f.subtype === "diagnosticSummaryNetAmountMaterial",
      );
      if (materialNetField) setFV(materialNetField.name, netAmountValue);
      if (discountField) setFV(discountField.name, newDiscount);
      if (hiddenDiscountField) setFV(hiddenDiscountField.name, newDiscount);

      isDistributingRef.current = true;
      distributeNetToRows(newDiscount, typeFilter, values, setFV, fields);
    },
    [discountBase],
  );
  const hasPricesPopulated = useMemo(
    () =>
      materials.some(
        (m) => m.unitPrice !== 0 || m.netAmount !== 0 || m.grossAmount !== 0 || m.totalAmount !== 0,
      ),
    [materials],
  );

  const showStartRepair = useCallback(() => {
    const { pendingTypeFields } = getChargeablePendingInfo(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    if (pendingTypeFields.length === 0) return true;
    return (
      hasSendForReviewPermission ||
      pendingTypeFields.every((tf) => {
        const type = formValuesRef.current[tf.name] as string;
        return type === "WARRANTY" || type === "SERVICE_OFFERING";
      })
    );
  }, [formValuesRef, hasSendForReviewPermission]);

  const enableApproveForRepair = useCallback(() => {
    if (repairApprovalMutation.isPending) return false;
    const { pendingTypeFields } = getChargeablePendingInfo(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    if (pendingTypeFields.length === 0) return true;
    if (!arePricesValidated) return false;

    return pendingTypeFields.every((tf) => {
      const type = formValuesRef.current[tf.name] as string;
      return type === "WARRANTY" || type === "SERVICE_OFFERING";
    });
  }, [repairApprovalMutation.isPending, formValuesRef, arePricesValidated]);
  const enableRequestApproval = useCallback(() => {
    if (internalApprovalRequestMutation.isPending) return false;
    if (materials.some((m) => m.status === "REVISED" || m.status === "REJECTED")) return false;
    if (!arePricesValidated) return false;
    if (currentStatus === "REVISED") {
      const { hasBoschInternalPending } = getBoschInternalPending(
        materialsFieldsRef.current,
        formValuesRef.current,
      );
      return hasBoschInternalPending && materials.every((m) => m.status !== "REVISED");
    }
    if (currentStatus === "REJECTED") {
      const { hasBoschInternalPending } = getBoschInternalPending(
        materialsFieldsRef.current,
        formValuesRef.current,
      );
      return hasBoschInternalPending && materials.every((m) => m.status !== "REJECTED");
    }
    const pendingApprovals: string[] = mergedJobData?.job?.pendingApprovals ?? [];
    const { hasBoschInternalPending } = getBoschInternalPending(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    return hasBoschInternalPending && !pendingApprovals.includes("BOSCH_INTERNAL");
  }, [
    internalApprovalRequestMutation.isPending,
    formValuesRef,
    mergedJobData?.job?.pendingApprovals,
    currentStatus,
    materials,
    arePricesValidated,
  ]);

  const showRequestApproval = useCallback(() => {
    if (currentStatus === "REVISED" || currentStatus === "REJECTED") {
      const { hasBoschInternalPending } = getBoschInternalPending(
        materialsFieldsRef.current,
        formValuesRef.current,
      );
      return hasBoschInternalPending;
    }
    const pendingApprovals: string[] = mergedJobData?.job?.pendingApprovals ?? [];
    const { hasBoschInternalPending } = getBoschInternalPending(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    return hasBoschInternalPending && !pendingApprovals.includes("BOSCH_INTERNAL");
  }, [formValuesRef, mergedJobData?.job?.pendingApprovals, currentStatus]);
  const showApproveForRepair = useCallback(() => {
    if (enableRequestApproval()) return false;
    const { hasChargeablePending } = getChargeablePendingInfo(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    const { hasBoschInternalPending } = getBoschInternalPending(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    return !hasChargeablePending || !hasBoschInternalPending;
  }, [formValuesRef, enableRequestApproval]);

  const showCreateCostEstimate = useCallback(() => {
    const pendingApprovals: string[] = mergedJobData?.job?.pendingApprovals ?? [];
    const { hasChargeablePending } = getChargeablePendingInfo(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    return hasChargeablePending && !pendingApprovals.includes("CUSTOMER");
  }, [mergedJobData?.job?.pendingApprovals]);

  const enableCreateCostEstimate = useCallback(() => {
    if (createCostEstimateMutation.isPending) return false;
    if (!arePricesValidated) return false;
    const pendingApprovals: string[] = mergedJobData?.job?.pendingApprovals ?? [];
    const { hasChargeablePending } = getChargeablePendingInfo(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    return hasChargeablePending && !pendingApprovals.includes("CUSTOMER");
  }, [
    createCostEstimateMutation.isPending,
    mergedJobData?.job?.pendingApprovals,
    arePricesValidated,
    formValuesRef,
  ]);

  const showCustomerAnswer = useCallback(() => {
    if (isCustomerApprovalPendingStatus) return true;
    const pendingApprovals: string[] = mergedJobData?.job?.pendingApprovals ?? [];
    const { hasChargeablePending } = getChargeablePendingInfo(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    return hasChargeablePending && pendingApprovals.includes("CUSTOMER");
  }, [isCustomerApprovalPendingStatus, mergedJobData?.job?.pendingApprovals]);

  const enableCustomerAnswer = useCallback(() => {
    if (customerAnswerMutation.isPending) return false;
    if (isCustomerApprovalPendingStatus) return true;
    const pendingApprovals: string[] = mergedJobData?.job?.pendingApprovals ?? [];
    const { hasChargeablePending } = getChargeablePendingInfo(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    return hasChargeablePending && pendingApprovals.includes("CUSTOMER");
  }, [
    customerAnswerMutation.isPending,
    isCustomerApprovalPendingStatus,
    mergedJobData?.job?.pendingApprovals,
  ]);

  const handleDiagnosticsAreaValueChange = useCallback(
    (areaName: string) => {
      if (!arePricesValidated) return;
      if (!areaName.startsWith("diagnosticData")) return;
      setArePricesValidated(false);
    },
    [arePricesValidated],
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
        onSaveNewNote,
        onCancelNewNote,
        onSaveAsset,
        onCancelEditAsset,
        onSaveCustomer,
        onCancelSaveCustomer,
        onAddSparePart,
        onAddSpecialMaterials,
        onProductDetails,
        onValidate,
        onHold,
        onGoToNextStep,
        onCustomerAnswer,
        onDeleteSparePart,
        onSummaryDiscountChange,
        onSummaryDiscountNetChange,
        onSummaryTotalAmountChange,
        onSummaryNetAmountChange,
        enableAddingSparePart,
        enableAddingSpecialMaterials,
        enableProductDetails,
        enableValidate,
        enableGoToNextStep,
        enableHold,
        enableStartRepair,
        enableFinishRepair,
        enableSubmitForReview,
        enableToolDelivered,
        enableSaveCustomer,
        enableSaveAsset,
        enableSaveNote,
        showStartRepair,
        showApproveForRepair,
        enableApproveForRepair,
        showCreateCostEstimate,
        enableCreateCostEstimate,
        showRequestApproval,
        enableRequestApproval,
        showCustomerAnswer,
        enableCustomerAnswer,
        onApproveForRepair,
        onRequestInternalApproval,
        onSubmitForReview,
        onStartRepair,
        onFinishRepair,
        onToolDelivered,
        onCreateCostEstimate,
      } as Record<string, ActionCallback>,
      radioSourceCallbacks: {
        getRadioButtonsForSummaryType: () => summaryTypeOptions,
      },
      activeValueChangeFieldRef,
      onAreaValueChange: handleDiagnosticsAreaValueChange,
      onDeleteStart: () => setIsDeletingFile(true),
      onDeleteEnd: () => setIsDeletingFile(false),
      autocompleteValidation: autocompleteValidationRef,
      sparePartBelongsToTool: sparePartBelongsToToolRef,
    }),
    [
      allFields,
      setAllFields,
      mandatoryFields,
      onSaveNewNote,
      onCancelNewNote,
      onSaveAsset,
      onCancelEditAsset,
      onSaveCustomer,
      onCancelSaveCustomer,
      onAddSparePart,
      onAddSpecialMaterials,
      onProductDetails,
      onValidate,
      onHold,
      onGoToNextStep,
      onCustomerAnswer,
      onDeleteSparePart,
      onSummaryDiscountChange,
      onSummaryDiscountNetChange,
      onSummaryTotalAmountChange,
      onSummaryNetAmountChange,
      enableAddingSparePart,
      enableAddingSpecialMaterials,
      enableProductDetails,
      enableValidate,
      enableGoToNextStep,
      enableHold,
      enableStartRepair,
      enableFinishRepair,
      enableSubmitForReview,
      enableToolDelivered,
      enableSaveCustomer,
      enableSaveAsset,
      enableSaveNote,
      showStartRepair,
      showApproveForRepair,
      enableApproveForRepair,
      showCreateCostEstimate,
      enableCreateCostEstimate,
      showRequestApproval,
      enableRequestApproval,
      showCustomerAnswer,
      enableCustomerAnswer,
      handleDiagnosticsAreaValueChange,
      onApproveForRepair,
      onRequestInternalApproval,
      onSubmitForReview,
      onStartRepair,
      onFinishRepair,
      onToolDelivered,
      onCreateCostEstimate,
      summaryTypeOptions,
    ],
  );

  const createJobContextValue = useMemo(
    () => ({
      assetsAccessories: assetsAccessories,
      setAssetsAccessories: setAssetsAccessories,
    }),
    [assetsAccessories, setAssetsAccessories],
  );

  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);

  const diagnosticsContextValue = useMemo(
    () => ({
      materials,
      apiMaterialsLoaded,
      apiMaterialsEmpty,
      hasExistingDiagnostic,
      setMaterials,
      onAddRow: onAddSparePart,
      onAddMaterials: addMaterialsToForm,
      onDeleteRow: onDeleteSparePart,
      onRestoreRow: onRestoreSparePart,
      addSpecialMaterialsAllowed,
      positionDropdownOptions,
      allowedPositions,
      getExistingPartNumbers,
      getExistingMaterialsAsPositionItems,
      summaryTypeOptions,
      setSummaryTypeOptions,
      isDistributingRef,
      isResyncingRef,
      arePricesValidated,
      setArePricesValidated,
      hasPricesPopulated,
      markAllValidated,
      markRowDirty,
      setRevisedRowPending,
      isArchivedExpanded,
      setIsArchivedExpanded,
      canArchiveOnDelete,
      resyncMaterialsFromAPI,
      jobStatus: currentStatus,
      discountBase,
      automaticRows,
    }),
    [
      materials,
      apiMaterialsLoaded,
      apiMaterialsEmpty,
      hasExistingDiagnostic,
      setMaterials,
      onAddSparePart,
      addMaterialsToForm,
      onDeleteSparePart,
      onRestoreSparePart,
      addSpecialMaterialsAllowed,
      positionDropdownOptions,
      allowedPositions,
      getExistingPartNumbers,
      getExistingMaterialsAsPositionItems,
      summaryTypeOptions,
      setSummaryTypeOptions,
      arePricesValidated,
      hasPricesPopulated,
      markAllValidated,
      markRowDirty,
      setRevisedRowPending,
      isArchivedExpanded,
      setIsArchivedExpanded,
      canArchiveOnDelete,
      resyncMaterialsFromAPI,
      currentStatus,
      discountBase,
      automaticRows,
    ],
  );

  const buildFaultCodeDropdowns = (values: Record<string, unknown>) => {
    const faultCode = values.faultCode as string;
    if (faultCode) {
      values.faultCodeDropdown = faultCode;
    }
  };

  useEffect(() => {
    const mergedJobDataChanged = mergedJobData !== prevMergedJobDataRef.current;

    if (skipFormResetRef.current) {
      return;
    }
    if (mergedJobDataChanged && mergedJobData && allFields && allFields.length > 0) {
      prevMergedJobDataRef.current = mergedJobData;
      const dataMapped = convertAPIDataToFormValues(mergedJobData, allFields);
      dataMapped.discountBase = discountBase;
      buildFaultCodeDropdowns(dataMapped);
      // Guard useSparePartPriceCalculation from calling markRowDirty during this
      // Formik reinitialization. The double-RAF in the [initialFormValues] effect
      // will clear isResyncingRef once the reinitialization settles.
      isResyncingRef.current = true;
      setInitialFormValues((prev) => ({
        ...prev,
        ...dataMapped,
      }));
    }
  }, [mergedJobData, allFields, setInitialFormValues, discountBase]);

  if (loading) {
    return (
      <div className="loading-container">
        <ActivityIndicatorWithDelay delay={1000} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {t("error")}: {error?.message}
      </div>
    );
  }

  if (!jobData) {
    return <div>{t("noJobFound")}</div>;
  }

  const sectionHasEditableActions = (section: Section): boolean => {
    return (section.actions?.length ?? 0) > 0;
  };

  const handleEdit = (sectionName?: string) => {
    if (jobId && sectionName) {
      enableSectionEditing(sectionName);
    }
  };
  const renderTabContent = (isFormReadOnly: boolean) => {
    return (
      <section>
        {visibleTabs
          .filter((tab) => tab.name === selectedTab)
          .map((tab) => {
            const isEditing = editingSections.has(tab.name);
            let tabWithDisabledState: Section;
            if (isEditing) {
              tabWithDisabledState = setSectionDisabledState(tab, false);
            } else if (isFormReadOnly && sectionHasEditableActions(tab)) {
              tabWithDisabledState = setSectionDisabledState(tab, true);
            } else if (jobData?.job?.isOnHold) {
              tabWithDisabledState = setSectionDisabledState(tab, true);
            } else {
              tabWithDisabledState = setSectionDisabledState(tab);
            }
            const currentMode: "view" | "edit" = isEditing ? "edit" : "view";
            const canEdit =
              currentStatus === "READY_FOR_DIAGNOSTIC" &&
              !(jobData?.job?.isOnHold ?? false) &&
              sectionHasEditableActions(tab);
            const onEditHandler = canEdit ? () => handleEdit(tab.name) : undefined;
            if (tab.name === "diagnosticData" && shouldFetchDiagnostic && diagnosticLoading) {
              return (
                <div key={`${tab.name}_loading`} className="loading-container">
                  <ActivityIndicatorWithDelay delay={1000} />
                </div>
              );
            }
            return (
              <GenericSection
                key={`${tab.name}`}
                section={tabWithDisabledState}
                onEdit={onEditHandler}
                currentMode={currentMode}
                currentStatus={currentStatus}
              />
            );
          })}
      </section>
    );
  };

  return (
    <div>
      {jobData.job.isOnHold && (
        <Notification type="warning" className="on-hold-banner">
          {t("jobOnHoldBanner")}
        </Notification>
      )}
      <JobOverviewHeader />
      <DiagnosticsContext.Provider value={diagnosticsContextValue}>
        <GenericFormContext.Provider value={genericFormContextValue}>
          <CreateJobContext.Provider value={createJobContextValue}>
            <TabNavigation
              className="sticky-tab-navigation"
              selectedValue={selectedTab || visibleTabs[0]?.name}
              onTabSelect={(_, data) => setSelectedTab(data.value as string)}
            >
              {visibleTabs.map((tab) => (
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
              {({ values, setFieldValue, setErrors, setTouched }) => {
                formValuesRef.current = values;
                setFieldValueRef.current = (field: string, value: unknown) => {
                  void setFieldValue(field, value);
                };
                const currentMode: "view" | "edit" = editingSections.size > 0 ? "edit" : "view";
                const ctx: ActionDependencyContext = {
                  currentMode,
                  currentStatus,
                  formValues: values,
                  user: userData,
                  actionCallbacks: genericFormContextValue.actionCallbacks,
                };
                const isFormReadOnly =
                  areAllActionsDisabled(jobOverviewForm?.actions ?? [], ctx) ||
                  (jobData?.job?.isOnHold ?? false);

                return (
                  <Form>
                    <FormikDiagnosticsSync
                      setCurrentActionType={setCurrentActionType}
                      setCurrentJobType={setCurrentJobType}
                    />
                    {renderTabContent(isFormReadOnly)}
                    <GenericAction
                      actions={jobOverviewForm?.actions || []}
                      onActionClick={(actionName) => {
                        if (!actionName) return;
                        handleGenericAction(actionName, values, {
                          setErrors: (errors: Record<string, unknown>) =>
                            setErrors(errors as Record<string, string>),
                          setTouched: (touched: Record<string, boolean>) => {
                            return setTouched(touched);
                          },
                          setFieldValue: (field: string, value: unknown) => {
                            void setFieldValue(field, value);
                          },
                        });
                      }}
                      currentMode={currentMode}
                      currentStatus={currentStatus}
                      isGloballyDisabled={isDeletingFile}
                      isOnHold={jobData?.job?.isOnHold ?? false}
                    />
                  </Form>
                );
              }}
            </Formik>
          </CreateJobContext.Provider>
        </GenericFormContext.Provider>
      </DiagnosticsContext.Provider>
      <AnswerModal
        isOpen={isAnswerModalOpen}
        onClose={onAnswerModalClose}
        onSave={onAnswerModalSave}
        title={t("customerAnswer")}
        options={CUSTOMER_ANSWER_OPTIONS}
      />
      <ApprovalDecisionModal
        isOpen={!!preApprovalDecision}
        onClose={() => setPreApprovalDecision(null)}
        onConfirm={handlePreApprovalConfirm}
        title={getPreApprovalModalTitle()}
        decisionType={preApprovalDecision}
        jobId={jobId}
      />
      {isExplosionDrawingModalOpen && (
        <ExplosionDrawingModal
          isOpen={isExplosionDrawingModalOpen}
          setIsOpen={setIsExplosionDrawingModalOpen}
          onSubmitParts={handleExplosionDrawingSubmit}
          existingMaterials={materials}
          formValues={formValuesRef.current}
        />
      )}
      <AddSpecialMaterialModal
        jobId={jobId}
        isOpen={showAddSpecialMaterialModal}
        setIsOpen={setShowAddSpecialMaterialModal}
        onAddMaterials={handleAddSpecialMaterials}
        existingPartNumbers={existingPartNumbersForModal}
      />
    </div>
  );
}
