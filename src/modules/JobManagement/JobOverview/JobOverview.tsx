import { useEffect, useState, useMemo, useCallback, useRef, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  useAnalytics,
  toJobType,
  toJobStatus,
  toPreApprovalAction,
  NoteContext,
  CompletionType,
  type JobEventPayload,
} from "@/analytics";
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
import Field, {
  WarrantyInfoPayload,
  WarrantyReasonKey,
} from "components/generics/Field/GenericField.types";
import {
  GenericFormContext,
  WarrantyPanelInfo,
} from "components/generics/Form/GenericForm.context";
import GenericForm from "components/generics/Form/GenericForm.types";
import Section from "components/generics/Section/GenericSection.types";
import { Formik, Form, useFormikContext } from "formik";
import { useFormValidation } from "components/generics/Form/useFormValidation";
import { scrollToTop } from "utils/scrollToError";
import { getApiErrorMessage } from "utils/getApiErrorMessage";
import { CreateJobContext } from "../CreateJob/CreateJob.context";
import {
  buildWarrantyCheckPayloadFromFieldNames,
  getAllowedWarrantyTypes,
  updateWarrantyFields,
} from "../CreateJob/CreateJob.warranty.utils";
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
  buildWarrantyInfoContent,
  formatWarrantyDate,
  getWarrantyRecommendationText,
  getWarrantyUnavailableMessage,
} from "../warranty.utils";
import { usePostWarrantyCheck } from "api/services/orders/hooks";
import { WarrantyCheckRequest, WarrantyCheckResponse } from "api/services/orders/orders.types";
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
import {
  CUSTOMER_ANSWER_REPAIR_OPTIONS,
  CUSTOMER_ANSWER_EXCHANGE_OPTIONS,
} from "./AnswerModal/AnswerModal.constants";
import ExplosionDrawingModal from "./ExplosionDiagram/ExplosionDrawingModal";
import { PositionItem } from "./ExplosionDiagram/ExplosionDrawing.types";
import { SpecialMaterial } from "./AddSpecialMaterialModal/SpecialMeterialItem/SpecialMaterialItem";
import {
  getBoschInternalPending,
  getChargeablePendingInfo,
  hasWarrantyOrProServiceItems,
} from "hooks/useDiagnosticsManager";
import { useItemsManager } from "hooks/itemsManager/useItemsManager";
import { buildJobItemsSurfaceConfig, type JobApiMaterial } from "./jobItemsSurfaceConfig";
import { useFormInitialization } from "hooks/useFormInitialization";
import {
  useActionWithValidation,
  type ValidationActionHelpers,
} from "hooks/useActionWithValidation";
import { usePositionDropdownSync } from "hooks/usePositionDropdownSync";
import { useSectionEditing } from "hooks/useSectionEditing";
import { useItemPolicyConfig } from "api/services/itemPolicy/hooks";
import { selectConfigForSurface } from "utils/itemRulesResolver";
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

const WARRANTY_REASON_KEYS = new Set([
  "UNKNOWN_SERIAL_NUMBER",
  "WARRANTY_EXPIRED",
  "ALLOWED_REPAIR_COUNT_EXCEEDED",
]);

interface WarrantyInfoContentData extends WarrantyInfoPayload {
  reasonKey: WarrantyInfoPayload["reasonKey"];
  fallbackMessage: string;
  validityExpirationDate: string;
  usedWarrantyRepairCount: number;
  allowedWarrantyRepairCount: number;
  recommendation?: string;
}

function patchPayloadFromCache(
  payload: Record<string, unknown>,
  cached: JobDiagnostic | undefined,
): void {
  if (!cached) return;
  if (cached.status && (payload.status === null || payload.status === undefined)) {
    payload.status = cached.status;
  }
  if (cached.diagnosticId && !payload.diagnosticId) {
    payload.diagnosticId = cached.diagnosticId;
  }
}

const buildJobOverviewWarrantyCheckPayload = (
  values: Record<string, unknown>,
  countryCode?: string,
): WarrantyCheckRequest | null => {
  return buildWarrantyCheckPayloadFromFieldNames(
    values,
    {
      brandFieldName: "brand",
      bareToolNumberFieldName: "baretoolNumber",
      serialNumberFieldName: "serialNumber",
      purchaseDateFieldName: "purchaseDate",
    },
    countryCode,
  );
};

const updateJobOverviewWarrantyTabs = (
  tabs: Section[],
  response: WarrantyCheckResponse,
  warrantyInfoPayload: WarrantyInfoPayload | null,
): Section[] => {
  return tabs.map((tab) => {
    if (tab.name !== "assetData") return tab;

    return {
      ...tab,
      areas: tab.areas.map((area) => {
        if (area.name === "customerWish") {
          return {
            ...area,
            fields: updateWarrantyFields(area.fields, response, warrantyInfoPayload) ?? area.fields,
          };
        }

        if (area.name !== "warrantyDetails") {
          return area;
        }

        return {
          ...area,
          fields: updateWarrantyFields(area.fields, response, warrantyInfoPayload) ?? area.fields,
        };
      }),
    };
  });
};

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
  // Frontend-policy overlay (see proposals/items-and-prices-refactor.md §4). The backing
  // endpoint doesn't exist in production yet, so this is intentionally resilient to
  // failure: `retry: false` avoids hammering a 404, and consumers (SparePartsRow) fall
  // back to their prior hardcoded defaults whenever `itemPolicy` is undefined.
  const itemPolicyQuery = useItemPolicyConfig(userData?.countryCode ?? "", { retry: false });
  const itemPolicy = useMemo(
    () =>
      itemPolicyQuery.data
        ? selectConfigForSurface(itemPolicyQuery.data, "jobDiagnostics")
        : undefined,
    [itemPolicyQuery.data],
  );
  const { jobId } = useParams<{ jobId: string }>();
  // Invalidate on every open so stale cache does not serve outdated job/diagnostic data.
  useEffect(() => {
    if (!jobId) return;
    void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    void queryClient.invalidateQueries({ queryKey: ["diagnostic", jobId] });
  }, [jobId, queryClient]);
  const analytics = useAnalytics();
  const tabFromHash = globalThis.location.hash.substring(1);

  const postMessageMutation = useMutation({
    mutationFn: postMessage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", jobId] });
      setMessages((prev) => [
        ...prev,
        { text: t("successAddNote"), type: "success", duration: 3000 },
      ]);
      analytics.trackNoteAdded({
        noteContext: NoteContext.JOB,
        jobStatus: toJobStatus(currentStatus),
        jobType: toJobType(currentJobType),
      });
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

  const { data: jobData, isLoading: loading, error } = useJobById(jobId || "");
  const warrantyCheckMutation = usePostWarrantyCheck();
  const lastWarrantyPayloadKeyRef = useRef<string>("");

  useEffect(() => {
    const asset = jobData?.job?.asset;
    const countryCode = jobData?.order?.countryCode;
    if (
      asset?.warrantyInformation != null ||
      !asset?.brand ||
      !asset.bareToolNumber ||
      !asset.serialNumber ||
      !asset.purchaseDate ||
      !countryCode
    )
      return;
    const payload: WarrantyCheckRequest = {
      brand: asset.brand,
      country: countryCode,
      bareToolNumber: asset.bareToolNumber,
      serialNumber: asset.serialNumber,
      purchaseDate: asset.purchaseDate,
    };
    warrantyCheckMutation.mutate(payload);
    // warrantyCheckMutation.mutate is stable — intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobData]);

  useEffect(() => {
    if (!jobData?.job?.asset?.purchaseDate) {
      lastWarrantyPayloadKeyRef.current = "";
      return;
    }

    const payload = buildJobOverviewWarrantyCheckPayload(
      {
        brand: jobData.job.asset.brand,
        baretoolNumber: jobData.job.asset.bareToolNumber,
        serialNumber: jobData.job.asset.serialNumber,
        purchaseDate: jobData.job.asset.purchaseDate,
      },
      jobData.order?.countryCode,
    );

    lastWarrantyPayloadKeyRef.current = payload ? JSON.stringify(payload) : "";
  }, [jobData]);

  const warrantyPanelInfo: WarrantyPanelInfo = useMemo(() => {
    const warrantyInfo = jobData?.job?.asset?.warrantyInformation;
    const checkResult = warrantyInfo == null ? warrantyCheckMutation.data : null;

    if (checkResult != null) {
      const isIneligible =
        checkResult.evaluationStatus === "INELIGIBLE" || !jobData?.job?.asset?.purchaseDate;
      const supportedWarrantyType = checkResult.supportedWarrantyType || "NONE";
      const reasonKey = checkResult.reasonKey || "";
      const unavailableMessage = isIneligible ? getWarrantyUnavailableMessage(reasonKey, t) : "";
      const recommendation = getWarrantyRecommendationText(checkResult.proServiceType, t);
      const typedReasonKey = WARRANTY_REASON_KEYS.has(reasonKey)
        ? (reasonKey as WarrantyReasonKey)
        : undefined;
      return {
        supportedWarrantyType,
        isIneligible,
        validityExpirationDate: formatWarrantyDate(checkResult.validityExpirationDate),
        unavailableMessage,
        hasPurchaseDate: Boolean(jobData?.job?.asset?.purchaseDate),
        infoPayload: {
          reasonKey: typedReasonKey,
          fallbackMessage: unavailableMessage,
          validityExpirationDate: formatWarrantyDate(checkResult.validityExpirationDate) || "",
          usedWarrantyRepairCount: checkResult.usedWarrantyRepairCount ?? 0,
          allowedWarrantyRepairCount: checkResult.allowedWarrantyRepairCount ?? 0,
          recommendation,
        },
      };
    }

    const isIneligible =
      warrantyInfo?.evaluation?.status === "INELIGIBLE" ||
      (warrantyInfo != null &&
        warrantyInfo.warrantyType == null &&
        warrantyInfo.evaluation?.status !== "SKIPPED") ||
      !jobData?.job?.asset?.purchaseDate;
    const supportedWarrantyType = warrantyInfo?.warrantyType || "NONE";
    const reasonKey = warrantyInfo?.evaluation?.ineligibleReason || "";
    let unavailableMessage = "";
    if (isIneligible) {
      unavailableMessage = getWarrantyUnavailableMessage(reasonKey, t);
    }
    const recommendation = getWarrantyRecommendationText(warrantyInfo?.proServiceType, t);

    const typedReasonKey = WARRANTY_REASON_KEYS.has(reasonKey)
      ? (reasonKey as WarrantyReasonKey)
      : undefined;

    return {
      supportedWarrantyType,
      isIneligible,
      validityExpirationDate: formatWarrantyDate(warrantyInfo?.validityExpirationDate),
      unavailableMessage,
      hasPurchaseDate: Boolean(jobData?.job?.asset?.purchaseDate),
      infoPayload: {
        reasonKey: typedReasonKey,
        fallbackMessage: unavailableMessage,
        validityExpirationDate: formatWarrantyDate(warrantyInfo?.validityExpirationDate) || "",
        usedWarrantyRepairCount: warrantyInfo?.usedWarrantyRepairCount ?? 0,
        allowedWarrantyRepairCount: warrantyInfo?.allowedWarrantyRepairCount ?? 0,
        recommendation,
      },
    };
  }, [jobData, warrantyCheckMutation.data, t]);

  const syncWarrantyResultToAssetTab = useCallback(
    (response: WarrantyCheckResponse) => {
      const warrantyInfoPayload = buildWarrantyInfoContent(
        response,
        t,
        formatWarrantyDate,
      ) as WarrantyInfoContentData | null;

      setAllFields((prevFields) => updateWarrantyFields(prevFields, response, warrantyInfoPayload));
      setTabs((prevTabs) => updateJobOverviewWarrantyTabs(prevTabs, response, warrantyInfoPayload));

      const setFieldValue = setFieldValueRef.current;
      if (!setFieldValue) return;

      if (response.evaluationStatus === "INELIGIBLE") {
        setFieldValue("customerWish", "CHARGEABLE");
        setFieldValue("warrantyType", "");
        return;
      }

      if (response.evaluationStatus === "ELIGIBLE") {
        const currentWarrantyType = formValuesRef.current.warrantyType as string;
        const allowedTypes = getAllowedWarrantyTypes(response);
        if (currentWarrantyType && !allowedTypes.has(currentWarrantyType)) {
          setFieldValue("warrantyType", "");
        }
      }
    },
    [setAllFields, setTabs, t],
  );

  const runAssetWarrantyCheck = useCallback(
    async (values: Record<string, unknown>) => {
      const payload = buildJobOverviewWarrantyCheckPayload(values, jobData?.order?.countryCode);
      if (!payload) return;

      const payloadKey = JSON.stringify(payload);
      if (lastWarrantyPayloadKeyRef.current === payloadKey) return;

      lastWarrantyPayloadKeyRef.current = payloadKey;

      try {
        const response = await warrantyCheckMutation.mutateAsync(payload);
        if (!response) return;
        if (lastWarrantyPayloadKeyRef.current !== payloadKey) return;

        syncWarrantyResultToAssetTab(response);
      } catch {
        lastWarrantyPayloadKeyRef.current = "";
      }
    },
    [jobData?.order?.countryCode, syncWarrantyResultToAssetTab, warrantyCheckMutation],
  );
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

  const isRepairAnswerLocked =
    isCustomerApprovalPendingStatus && mergedJobData?.diagnostic?.customerAnswer === "REPAIR";

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
        queryClient.refetchQueries({ queryKey: ["messages", jobId] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successStartRepair"), type: "success", duration: 3000 },
      ]);
      emitJobFlowEvent((payload) => analytics.trackRepairStarted(payload));
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
        queryClient.refetchQueries({ queryKey: ["messages", jobId] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successFinishRepair"), type: "success", duration: 3000 },
      ]);
      emitJobFlowEvent((payload) => analytics.trackRepairFinished(payload));
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
        queryClient.refetchQueries({ queryKey: ["messages", jobId] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successToolDelivered"), type: "success", duration: 3000 },
      ]);
      emitJobFlowEvent((payload) =>
        analytics.trackJobCompleted({ ...payload, completionType: CompletionType.DELIVERED }),
      );
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
        queryClient.refetchQueries({ queryKey: ["messages", jobId] }),
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
        queryClient.refetchQueries({ queryKey: ["messages", jobId] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successSubmitForReview"), type: "success", duration: 3000 },
      ]);
      emitJobFlowEvent((payload) => analytics.trackJobSubmittedForReview(payload));
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
        queryClient.refetchQueries({ queryKey: ["messages", jobId] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successApproveForRepair"), type: "success", duration: 3000 },
      ]);
      emitJobFlowEvent((payload) => analytics.trackJobApprovedForRepair(payload));
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
        queryClient.refetchQueries({ queryKey: ["messages", jobId] }),
      ]);
      setMessages((prev) => [
        ...prev,
        { text: t("successRequestInternalApproval"), type: "success", duration: 3000 },
      ]);
      emitJobFlowEvent((payload) => analytics.trackPreApprovalRequested(payload));
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
      setArePricesValidated(false);
      resyncMaterialsFromAPI();
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["job", jobId] }),
        queryClient.refetchQueries({ queryKey: ["diagnostic", jobId] }),
        queryClient.refetchQueries({ queryKey: ["jobs"] }),
        queryClient.refetchQueries({ queryKey: ["messages", jobId] }),
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
        queryClient.refetchQueries({ queryKey: ["messages", jobId] }),
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
      // Bug 8 fix: defer setArePricesValidated until after double-RAF completes to eliminate flicker
      onResyncCompleteRef.current = () => setArePricesValidated(true);
      // Bug 3 fix: fallback timeout if RAF never fires (empty materials or no form changes)
      if (resyncFallbackTimeoutRef.current !== null) {
        clearTimeout(resyncFallbackTimeoutRef.current);
      }
      resyncFallbackTimeoutRef.current = setTimeout(() => {
        if (onResyncCompleteRef.current) {
          onResyncCompleteRef.current();
          onResyncCompleteRef.current = null;
        }
        resyncFallbackTimeoutRef.current = null;
      }, 500);
      setMessages((prev) => [
        ...prev,
        {
          text: t("successValidateAndSave"),
          type: "success",
          duration: 3000,
        },
      ]);
      emitJobFlowEvent((payload) => analytics.trackDiagnosticValidated(payload));
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          text: getApiErrorMessage(error, t, "errorValidateAndSave"),
          type: "error",
          duration: 8000,
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
  const onResyncCompleteRef = useRef<(() => void) | null>(null);
  const resyncFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preToggleHoldStateRef = useRef(false);
  const prevMergedJobDataRef = useRef<typeof mergedJobData>(undefined);
  const hashTabAppliedRef = useRef(false);
  const autocompleteValidationRef = useRef<Record<string, boolean>>({});
  const sparePartNotBelongsToToolRef = useRef<Record<string, boolean>>({});

  const { validate, validateByAction, startValidation, stopValidation, setCurrentAction } =
    useFormValidation({
      allFields,
      mandatoryFieldsMap: mandatoryFields,
      autocompleteValidationRef,
      sparePartNotBelongsToToolRef,
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

  // Emits a job-workflow analytics event with the job type + the *fresh*
  // post-transition status read from the refetched cache. Fires only when both
  // resolve to valid contract values, so a malformed value is skipped, never sent.
  const emitJobFlowEvent = useCallback(
    (emit: (payload: JobEventPayload) => void): void => {
      const jobType = toJobType(currentJobType);
      const jobStatus = toJobStatus(
        queryClient.getQueryData<JobOverviewItem>(["job", jobId])?.job?.jobStatus,
      );
      if (jobType && jobStatus) emit({ jobType, jobStatus });
    },
    [currentJobType, jobId, queryClient],
  );
  useEffect(() => {
    setCurrentActionType((initialFormValues?.actionType as string) || "");
    setCurrentJobType((initialFormValues?.jobType as string) || "");
  }, [initialFormValues]);

  // Rebuilt fresh every render, deliberately not memoized — useItemsManager's own configRef
  // pattern is designed to tolerate that (see its top-of-file comment).
  const jobItemsSurfaceConfig = buildJobItemsSurfaceConfig(t, {
    resetKey: tabs.length > 0 ? diagnosticData?.jobId : undefined,
    apiMaterials: tabs.length > 0 ? (diagnosticData?.materials as JobApiMaterial[] | undefined) : undefined,
    apiArchivedMaterials:
      tabs.length > 0 ? (diagnosticData?.archivedMaterials as JobApiMaterial[] | undefined) : undefined,
    currentActionType,
    currentJobType,
    jobStatus: currentStatus,
  });

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
    setRevisedRejectedRowPending,
    canArchiveOnDelete,
    discountBase,
    automaticRows,
  } = useItemsManager({
    config: jobItemsSurfaceConfig,
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
    async (formValues?: Record<string, unknown>, helpers?: ActionHelpers) => {
      if (!jobId || !allFields || !formValues) return;

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
            notBelongsToTool: false,
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
    (formValues?: Record<string, unknown>) => {
      if (!formValues || !addSpecialMaterialsAllowed) {
        if (!addSpecialMaterialsAllowed) {
          console.warn("Adding special materials is not allowed for this country configuration.");
        }
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
  useEffect(() => {
    if (!allFields || materials.length === 0) return;

    const sparePartNumberFields = allFields.filter(
      (field) => field.subtype === "diagnosticPartNumber",
    );

    materials.forEach((material, index) => {
      if (material.origin !== "explosionDrawing") return;

      const fieldName = sparePartNumberFields[index]?.name;
      if (!fieldName) return;

      sparePartNotBelongsToToolRef.current[fieldName] = false;
    });
  }, [allFields, materials]);

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
      const uploadErrors = new Set(getUploadFieldErrors(uploadField, FormikFormatValues));
      const hasPurchaseDate = Boolean(formValuesRef.current.purchaseDate);
      const hasWarrantyOrProServiceItem = hasWarrantyOrProServiceItems(
        allFieldsRef.current ?? [],
        formValuesRef.current,
      );
      const hasInvoiceAttachment = existingAttachments.some(
        (file) => file?.type?.toLowerCase() === "invoice",
      );

      if (hasPurchaseDate && hasWarrantyOrProServiceItem && !hasInvoiceAttachment) {
        uploadErrors.add("InvoiceWarrantyValidation");
      }

      if (uploadErrors.size > 0) {
        setMessages((prev) => [
          ...prev,
          ...Array.from(uploadErrors).map(
            (key): Message => ({ text: t(key), type: "error", duration: 3000 }),
          ),
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

      approvePreApprovalMutation.mutate(
        {
          jobId,
          materialIds,
          approvalStatus,
          message: comments || null,
        },
        {
          onSuccess: () => {
            const preApprovalAction = toPreApprovalAction(approvalStatus);
            const jobType = toJobType(currentJobType);
            const jobStatus = toJobStatus(
              queryClient.getQueryData<JobOverviewItem>(["job", jobId])?.job?.jobStatus,
            );
            if (preApprovalAction && jobType && jobStatus) {
              analytics.trackPreApprovalReviewed({ jobType, jobStatus, preApprovalAction });
            }
          },
        },
      );
      setPreApprovalDecision(null);
    },
    [
      jobId,
      preApprovalDecision,
      approvePreApprovalMutation,
      analytics,
      currentJobType,
      queryClient,
    ],
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
            let partNumber = m.partNumber as string | undefined;
            partNumber = partNumber?.replaceAll(/[^a-zA-Z0-9]/g, "");
            return {
              ...m,
              partNumber,
              order: Number.isFinite(order) && order > 0 ? order : index + 1,
            };
          })
          .sort((a, b) => Number(a.order) - Number(b.order));

        payload.materials = normalizedMaterials;

        const sparePartNumberFields = currentAllFields.filter(
          (f) => f.subtype === "diagnosticPartNumber",
        );
        (payload.materials as Record<string, unknown>[]).forEach((m, i) => {
          const fieldName = sparePartNumberFields[i]?.name;
          if (fieldName !== undefined) {
            const val = sparePartNotBelongsToToolRef.current[fieldName];
            if (val !== undefined) {
              m.notBelongsToTool = val;
            }
          }
          const price = m.price as Record<string, unknown> | undefined;
          if (price?.["unitPrice"] === null) {
            m.price = null;
          }
        });
        const withoutIds = (payload.materials as unknown[]).some((m) => {
          const id = (m as Record<string, unknown>)["id"];
          return !id;
        });
        const newDiagnostic =
          payload.status === "DRAFT" || payload.status === null || payload.status === undefined;

        if (preserveCalculatedPrices && newDiagnostic) {
          const cachedDiagnostic = queryClient.getQueryData<JobDiagnostic>(["diagnostic", jobId]);
          patchPayloadFromCache(payload, cachedDiagnostic);
        }
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
    [discountBase, queryClient, jobId],
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
    async (formValues?: Record<string, unknown>, helpers?: ActionHelpers) => {
      const currentAllFields = allFieldsRef.current;
      if (!jobId || !currentAllFields || !formValues) return;

      // Trigger blur on active element to commit field changes before validation
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && typeof activeElement.blur === "function") {
        activeElement.blur();
        // Wait for blur event to propagate and Formik to update
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      const payload = buildDiagnosticPayload(formValues, currentAllFields, {
        preserveCalculatedPrices: hasExistingDiagnostic,
      });
      if (helpers) {
        await handleActionWithValidation("validate", formValues, helpers, () =>
          validateAndSaveMutation.mutate({ jobId, payload }),
        );
      } else {
        validateAndSaveMutation.mutate({ jobId, payload });
      }
    },
    [
      jobId,
      validateAndSaveMutation,
      buildDiagnosticPayload,
      handleActionWithValidation,
      hasExistingDiagnostic,
    ],
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

  const customerAnswerOptions = useMemo(() => {
    if (currentActionType === "REPAIR") {
      return CUSTOMER_ANSWER_REPAIR_OPTIONS;
    }

    return CUSTOMER_ANSWER_EXCHANGE_OPTIONS;
  }, [currentActionType]);

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
          onSaveAsset(values, actionHelpers);
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
    if (!isResyncingRef.current && !skipFormResetRef.current) return;
    if (clearResyncRafRef.current !== null) {
      cancelAnimationFrame(clearResyncRafRef.current);
    }
    // Clear fallback timeout if RAF fires (normal path)
    if (resyncFallbackTimeoutRef.current !== null) {
      clearTimeout(resyncFallbackTimeoutRef.current);
      resyncFallbackTimeoutRef.current = null;
    }
    clearResyncRafRef.current = requestAnimationFrame(() => {
      clearResyncRafRef.current = requestAnimationFrame(() => {
        clearResyncRafRef.current = null;
        isResyncingRef.current = false;
        skipFormResetRef.current = false;
        onResyncCompleteRef.current?.();
        onResyncCompleteRef.current = null;
      });
    });
  }, [initialFormValues, skipFormResetRef]);

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
    if (isRepairAnswerLocked) return false;
    if (!spPosition) return false;
    const positionFields = (allFields ?? []).filter((f) => f.subtype === "diagnosticPosition");
    const spCount = positionFields.filter(
      (f) => (formValuesRef.current[f.name] as string) === "SP",
    ).length;
    return spCount < spPosition.maxCount;
  }, [allowedPositions, allFields, isRepairAnswerLocked]);

  const showProductDetails = useCallback(() => !isRepairAnswerLocked, [isRepairAnswerLocked]);
  const showAddRow = useCallback(() => !isRepairAnswerLocked, [isRepairAnswerLocked]);
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
    if (currentStatus === "CUSTOMER_APPROVAL_PENDING") return true;
    if (currentStatus === "MULTIPLE_APPROVAL_PENDING" && !isFromApprovalList) return true;
    const pendingApprovals: string[] = mergedJobData?.job?.pendingApprovals ?? [];
    const { hasChargeablePending } = getChargeablePendingInfo(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    return hasChargeablePending && pendingApprovals.includes("CUSTOMER");
  }, [currentStatus, isFromApprovalList, mergedJobData?.job?.pendingApprovals]);

  const enableCustomerAnswer = useCallback(() => {
    if (customerAnswerMutation.isPending) return false;
    if (currentStatus === "CUSTOMER_APPROVAL_PENDING") return true;
    if (currentStatus === "MULTIPLE_APPROVAL_PENDING" && !isFromApprovalList) return true;
    const pendingApprovals: string[] = mergedJobData?.job?.pendingApprovals ?? [];
    const { hasChargeablePending } = getChargeablePendingInfo(
      materialsFieldsRef.current,
      formValuesRef.current,
    );
    return hasChargeablePending && pendingApprovals.includes("CUSTOMER");
  }, [
    customerAnswerMutation.isPending,
    currentStatus,
    isFromApprovalList,
    mergedJobData?.job?.pendingApprovals,
  ]);

  const handleAreaValueChange = useCallback(
    (areaName: string, formValues?: Record<string, unknown>) => {
      if (areaName === "asset" && formValues && editingSections.has("assetData")) {
        void runAssetWarrantyCheck(formValues);
      }

      if (!arePricesValidated) return;
      if (!areaName.startsWith("diagnosticData")) return;
      setArePricesValidated(false);
    },
    [arePricesValidated, editingSections, runAssetWarrantyCheck],
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
        onSummaryDiscountChange,
        onSummaryDiscountNetChange,
        onSummaryTotalAmountChange,
        onSummaryNetAmountChange,
        enableAddingSparePart,
        enableAddingSpecialMaterials,
        enableProductDetails,
        showProductDetails,
        showAddRow,
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
      },
      radioSourceCallbacks: {
        getRadioButtonsForSummaryType: () => summaryTypeOptions,
      },
      activeValueChangeFieldRef,
      onAreaValueChange: handleAreaValueChange,
      onDeleteStart: () => setIsDeletingFile(true),
      onDeleteEnd: () => setIsDeletingFile(false),
      autocompleteValidation: autocompleteValidationRef,
      sparePartNotBelongsToTool: sparePartNotBelongsToToolRef,
      warrantyPanelInfo,
      isRepairAnswerLocked,
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
      onSummaryDiscountChange,
      onSummaryDiscountNetChange,
      onSummaryTotalAmountChange,
      onSummaryNetAmountChange,
      enableAddingSparePart,
      enableAddingSpecialMaterials,
      enableProductDetails,
      showProductDetails,
      showAddRow,
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
      handleAreaValueChange,
      onApproveForRepair,
      onRequestInternalApproval,
      onSubmitForReview,
      onStartRepair,
      onFinishRepair,
      onToolDelivered,
      onCreateCostEstimate,
      summaryTypeOptions,
      warrantyPanelInfo,
      isRepairAnswerLocked,
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
      setRevisedRejectedRowPending,
      isArchivedExpanded,
      setIsArchivedExpanded,
      canArchiveOnDelete,
      resyncMaterialsFromAPI,
      jobStatus: currentStatus,
      discountBase,
      automaticRows,
      isValidating: validateAndSaveMutation.isPending,
      itemPolicy,
      // Claim-only fields on the now-merged ItemsContextValue (Phase 5, items-and-prices-
      // refactor.md §15) — job has no equivalent concept, inert defaults matching
      // ItemsContext.tsx's baseDefaultItemsContextValue.
      canDeleteRows: false,
      archivedMaterials: [],
      isClaimPending: false,
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
      setRevisedRejectedRowPending,
      isArchivedExpanded,
      setIsArchivedExpanded,
      canArchiveOnDelete,
      resyncMaterialsFromAPI,
      currentStatus,
      discountBase,
      automaticRows,
      validateAndSaveMutation.isPending,
      itemPolicy,
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
                const dependencyActionCallbacks: Record<string, (...args: unknown[]) => unknown> =
                  {};
                for (const [key, callback] of Object.entries(
                  genericFormContextValue.actionCallbacks,
                )) {
                  dependencyActionCallbacks[key] = () => {
                    if (typeof callback === "function") {
                      return callback(values);
                    }
                    return undefined;
                  };
                }

                const ctx: ActionDependencyContext = {
                  currentMode,
                  currentStatus,
                  formValues: values,
                  user: userData,
                  actionCallbacks: dependencyActionCallbacks,
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
        options={customerAnswerOptions}
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
