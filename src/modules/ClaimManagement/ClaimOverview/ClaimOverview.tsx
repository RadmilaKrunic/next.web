import { useEffect, useState, useMemo, useCallback, useRef, useContext } from "react";
import { useParams } from "react-router-dom";
import { TabNavigation, Tab } from "@bosch/react-frok";
import "../../JobManagement/JobOverview/JobOverview.scss";
import GenericSection from "components/generics/Section/GenericSection";
import GenericAction from "components/generics/Action/GenericAction";
import { convertAPIDataToFormValues, setSectionDisabledState } from "components/generics/utils";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import Section from "components/generics/Section/GenericSection.types";
import Field from "components/generics/Field/GenericField.types";
import { Formik, Form, useFormikContext } from "formik";
import { useFormValidation } from "components/generics/Form/useFormValidation";
import { scrollToTop } from "utils/scrollToError";
import { useTranslation } from "react-i18next";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useBreadcrumbs } from "hooks/useBreadcrumbs";
import { postMessage } from "api/services/jobs/action";
import ClaimOverviewHeader from "./ClaimOverviewHeader/ClaimOverviewHeader";
import ClaimNoteModal from "./ClaimNoteModal/ClaimNoteModal";
import { useFormInitialization } from "hooks/useFormInitialization";
import { useActionWithValidation } from "hooks/useActionWithValidation";
import { useSectionEditing } from "hooks/useSectionEditing";
import {
  useClaimById,
  useUpdateClaimPrices,
  useClaimRequestApproval,
} from "api/services/claims/hooks";
import GenericForm from "components/generics/Form/GenericForm.types";
import { User } from "types/user.type";
import { useClaimDecisionPermissions } from "hooks/useClaimDecisionPermissions";
import { ImportedMaterial, useDiagnosticsManager } from "hooks/useDiagnosticsManager";
import { useClaimMaterialsManager } from "hooks/useClaimMaterialsManager";
import { DiagnosticsContext } from "modules/JobManagement/JobOverview/DiagnosticsContext";
import { ClaimContext } from "./ClaimContext";
import {
  areAllActionsDisabled,
  ActionDependencyContext,
} from "components/generics/Action/actionDependency";
import ActivityIndicatorWithDelay from "../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";
import AddSpecialMaterialModal from "modules/JobManagement/JobOverview/AddSpecialMaterialModal/AddSpecialMaterialModal";
import ExplosionDrawingModal from "modules/JobManagement/JobOverview/ExplosionDiagram/ExplosionDrawingModal";
import { PositionItem } from "modules/JobManagement/JobOverview/ExplosionDiagram/ExplosionDrawing.types";
import { MessagesContext } from "contexts/messagescontext";

function FormikClaimSync({
  setCurrentActionType,
  setCurrentJobType,
}: {
  setCurrentActionType: (value: string | ((prev: string) => string)) => void;
  setCurrentJobType: (value: string | ((prev: string) => string)) => void;
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
function makeFieldGetter(
  fields: Field[],
  formValues: Record<string, unknown>,
): (subtype: string) => unknown {
  return (subtype) => {
    const field = fields.find((af) => af.subtype === subtype);
    return field ? formValues[field.name] : undefined;
  };
}

export default function ClaimOverview() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const userData = queryClient.getQueryData<User>(["user"]);
  const uiConfigurationForms = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    userData?.countryCode,
  ]);
  const claimOverviewForm =
    uiConfigurationForms?.forms.find((form) => form.name === "ClaimOverview") ?? null;
  const { claimId } = useParams<{ claimId: string }>();
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [isClaimNoteModalOpen, setIsClaimNoteModalOpen] = useState(false);
  const [claimNoteModalAction, setClaimNoteModalAction] = useState<string>("");
  const [isClaimEditMode, setIsClaimEditMode] = useState(false);
  const [showAddSpecialMaterialModal, setShowAddSpecialMaterialModal] = useState(false);
  const [isExplosionDrawingModalOpen, setIsExplosionDrawingModalOpen] = useState(false);
  const [existingPartNumbersForModal, setExistingPartNumbersForModal] = useState<Set<string>>(
    new Set(),
  );

  const { setMessages } = useContext(MessagesContext);

  const validateClaimPricesMutation = useUpdateClaimPrices();
  const requestApprovalMutation = useClaimRequestApproval();
  const postMessageMutation = useMutation({
    mutationFn: postMessage,
    onSuccess: () => {
      const claimData = queryClient.getQueryData<{ jobId?: string }>(["claim", claimId]);
      const jobId = claimData?.jobId;
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: ["messages", jobId] });
      }
    },
    onError: (error) => {
      console.error("Failed to post message:", error);
    },
  });

  useBreadcrumbs([
    { label: t("claimList"), href: "/claim-list" },
    { label: claimId || "", href: "" },
  ]);

  const {
    initialFormValues,
    setInitialFormValues,
    allFields,
    setAllFields,
    mandatoryFields,
    tabs,
    setTabs,
  } = useFormInitialization(claimOverviewForm);

  const { data: claimData, isLoading: loading, error } = useClaimById(claimId || "");

  const currentStatus = claimData?.claimStatus || "";

  const [selectedTab, setSelectedTab] = useState<string>("");
  const [currentActionType, setCurrentActionType] = useState(
    (initialFormValues?.actionType as string) || "",
  );
  const [currentJobType, setCurrentJobType] = useState(
    (initialFormValues?.jobType as string) || "",
  );
  const [arePricesValidated, setArePricesValidated] = useState(false);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  // Ref mirror of arePricesValidated — not affected by markRowDirty resets from
  // child effects. Used by enableRequestApproval callback to avoid stale closures.
  const arePricesValidatedRef = useRef(false);
  // Tracks whether user has made changes since last successful validate.
  // Only a ref is needed — the value is read in callbacks (not in JSX render).
  const hasClaimChangesRef = useRef(false);
  // summaryTypeOptions is owned here so genericFormContextValue can expose it to radioSourceCallbacks
  const [summaryTypeOptions, setSummaryTypeOptions] = useState<{ label: string; value: string }[]>([
    { value: "totalSummary", label: "totalSummary" },
  ]);

  const skipFormResetRef = useRef(false);
  const formValuesRef = useRef<Record<string, unknown>>({});
  const setFieldValueRef = useRef<((field: string, value: unknown) => void) | null>(null);
  const claimIsDistributingRef = useRef(false);
  const claimIsResyncingRef = useRef(false);
  const prevClaimDataRef = useRef<typeof claimData>(undefined);
  // Prevents markRowDirty from dirtying hasClaimChanges right after a successful
  // validation — React effects in ClaimSparePartsRow fire synchronously on the
  // same render cycle when arePricesValidated flips to true (row collapse effect).
  const suppressDirtyRef = useRef(false);

  const tabsReady = tabs.length > 0;

  const {
    materials,
    setMaterials,
    archivedMaterials,
    positionDropdownOptions,
    allowedPositions,
    automaticRows,
    addSpecialMaterialsAllowed,
    markAllValidated,
    markRowDirty: markRowDirtyInternal,
    discountBase,
    onAddRow: onAddSparePart,
    onDeleteRow,
    onDeleteArchivedRow,
    onRestoreRow,
    onAddMaterials: addMaterialsToForm,
    getExistingPartNumbers,
    forceRebuildRef: claimForceRebuildRef,
    hasSyncedRef: claimHasSyncedRef,
  } = useClaimMaterialsManager({
    claimId,
    claimMaterials: tabsReady ? claimData?.materials : undefined,
    claimArchivedMaterials: tabsReady ? claimData?.archivedMaterials : undefined,
    currentActionType,
    currentJobType,
    tabs: tabs || [],
    setTabs,
    allFields,
    setAllFields,
    setInitialFormValues,
    skipFormResetRef,
    formValuesRef,
    arePricesValidated,
    setArePricesValidated,
    readOnly: !isClaimEditMode,
    isResyncingRef: claimIsResyncingRef,
  });

  // Wrap markRowDirty to also flag that user has unsaved changes
  const markRowDirty = useCallback(
    (areaIndex: number) => {
      // Suppress all dirty signalling while we're in the post-validation flush
      // (React effects in ClaimSparePartsRow fire on the same cycle when
      // arePricesValidated flips to true for row collapse).
      if (suppressDirtyRef.current) return;
      markRowDirtyInternal(areaIndex);
      hasClaimChangesRef.current = true;
    },
    [markRowDirtyInternal],
  );

  // Populate the diagnosticData tab (read-only) from the job's diagnostic
  const [diagArePricesValidated, setDiagArePricesValidated] = useState(false);
  useDiagnosticsManager({
    diagnosticData: tabsReady ? claimData?.jobDiagnostic : undefined,
    currentActionType,
    currentJobType,
    tabs: tabs || [],
    setTabs,
    allFields,
    setAllFields,
    setInitialFormValues,
    skipFormResetRef,
    formValuesRef,
    arePricesValidated: diagArePricesValidated,
    setArePricesValidated: setDiagArePricesValidated,
    readOnly: true,
  });

  const { validate, validateByAction, startValidation, stopValidation, setCurrentAction } =
    useFormValidation({
      allFields,
      mandatoryFieldsMap: mandatoryFields,
    });

  const visibleTabs = useMemo(() => {
    return tabs.filter((tab) => {
      return !tab.hiddenForStatuses?.includes(currentStatus);
    });
  }, [tabs, currentStatus]);

  useEffect(() => {
    if (visibleTabs.length > 0 && !selectedTab) {
      const tabFromHash = globalThis.location.hash.substring(1);
      const initialTab =
        tabFromHash && visibleTabs.some((tab) => tab.name === tabFromHash)
          ? tabFromHash
          : visibleTabs[0].name;

      setSelectedTab(initialTab);
    }
  }, [visibleTabs, selectedTab]);

  useEffect(() => {
    setCurrentActionType((initialFormValues?.actionType as string) || "");
    setCurrentJobType((initialFormValues?.jobType as string) || "");
  }, [initialFormValues]);

  const { editingSections, setEditingSections } = useSectionEditing({
    tabs,
    allFields,
    setAllFields,
    assetsAccessories: [],
    setAssetsAccessories: () => {},
    mergedJobData: claimData,
    setInitialFormValues,
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

  const handleActionWithValidation = useActionWithValidation({
    allFields,
    validateByAction,
    startValidation,
    stopValidation,
    setCurrentAction,
  });

  const onSaveNewNote = useCallback(
    async (
      formValues?: Record<string, unknown>,
      helpers?: {
        setFieldValue: (field: string, value: unknown) => void;
        setErrors: (errors: Record<string, unknown>) => void;
        setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, string>>;
      },
    ) => {
      if (!claimData?.jobId || !formValues || !helpers) return;

      await handleActionWithValidation("onSaveNewNote", formValues, helpers, () => {
        const noteValue = (formValues.note as string)?.trim() || "";
        if (!noteValue) return;

        const messageData = {
          jobId: claimData?.jobId || "",
          claimId: claimId || null,
          messageId: null,
          messageType: "GENERAL_CLAIM" as const,
          decision: null,
          message: noteValue,
        };

        postMessageMutation.mutate(messageData);
        onCancelNewNote(formValues, helpers);
      });
    },
    [claimData?.jobId, claimId, handleActionWithValidation, postMessageMutation, onCancelNewNote],
  );

  const onValidateClaim = useCallback(
    async (
      formValues: Record<string, unknown>,
      helpers: {
        setErrors: (errors: Record<string, unknown>) => void;
        setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, string>>;
        setFieldValue: (field: string, value: unknown) => void;
      },
    ) => {
      if (!claimId || !allFields || !claimData) return;
      await handleActionWithValidation("onValidate", formValues, helpers, async () => {
        // Build updated materials array from current form values
        const claimsTab = tabs.find((t) => t.name === "claims");
        const sparePartsAreas = (claimsTab?.areas ?? []).filter(
          (a) =>
            a.isMultiple &&
            a.name.includes("claimSpareParts") &&
            !a.name.includes("claimArchivedSpareParts"),
        );

        const updatedMaterials = sparePartsAreas.map((area, idx) => {
          const get = makeFieldGetter(area.fields, formValues);

          const original = claimData.materials?.[idx];

          return {
            ...original,
            position: (get("diagnosticPosition") as string) ?? original?.position ?? "",
            partNumber: (get("diagnosticPartNumber") as string) ?? original?.partNumber ?? "",
            description: (get("diagnosticDescription") as string) ?? original?.description ?? "",
            jobType: (get("diagnosticType") as string) ?? original?.jobType ?? "",
            quantity: Number(get("diagnosticQuantity") ?? original?.quantity ?? 1),
            order: Number(get("diagnosticOrder") ?? original?.order ?? idx + 1),
            isPriceSetManually: false,
            price: {
              unitPrice: Number(get("diagnosticUnitPrice") ?? 0),
              suggestedNetPrice: Number(get("diagnosticSuggestedNetPrice") ?? 0),
              netAmount: Number(get("diagnosticNetAmount") ?? 0),
              tax: Number(get("diagnosticTax") ?? original?.price?.tax ?? 0),
              taxAmount: Number(get("diagnosticTaxAmount") ?? 0),
              grossAmount: Number(get("diagnosticGrossAmount") ?? 0),
              discount: original?.price?.discount ?? 0,
              totalAmount: Number(get("diagnosticTotalAmount") ?? 0),
            },
          };
        });

        const sortedMaterials = updatedMaterials.toSorted(
          (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0),
        );

        // Send required top-level identifiers + updated materials
        const payload = {
          id: claimData.id,
          jobId: claimData.jobId,
          ascId: claimData.ascId,
          claimStatus: claimData.claimStatus,
          materials: sortedMaterials,
          archivedMaterials: archivedMaterials.filter((m) => Boolean(m.partNumber)),
        };

        try {
          // Force all rows to rebuild from server response — not just new ones.
          // Also set skipFormReset=true so the data-mapping effect uses the skip branch
          // (header fields only) and lets Effect 2 handle the row values from the server
          // response. Setting it to false caused a full convertAPIDataToFormValues reset
          // that overwrote rows with potentially wrong values before Effect 2 could correct.
          claimForceRebuildRef.current = true;
          skipFormResetRef.current = true;
          // Allow Effect 1 to re-load materials from the new server response
          // (invalidateQueries returns fresh claimMaterials with updated prices).
          claimHasSyncedRef.current = false;
          await validateClaimPricesMutation.mutateAsync({ claimId, payload });
          suppressDirtyRef.current = true;
          markAllValidated();
          arePricesValidatedRef.current = true;
          setArePricesValidated(true);
          hasClaimChangesRef.current = false;
          scrollToTop();
          setMessages((prev) => [
            ...prev,
            { text: t("claimPricesValidateSuccess"), type: "success", duration: 3000 },
          ]);
          // Release the suppress flag after all queued React effects have fired
          setTimeout(() => {
            suppressDirtyRef.current = false;
          }, 0);
        } catch {
          scrollToTop();
          setMessages((prev) => [
            ...prev,
            { text: t("claimPricesValidateError"), type: "error", duration: 3000 },
          ]);
        }
      });
    },
    [
      claimId,
      allFields,
      claimData,
      tabs,
      handleActionWithValidation,
      validateClaimPricesMutation,
      markAllValidated,
      setArePricesValidated,
      setMessages,
      t,
      claimForceRebuildRef,
      claimHasSyncedRef,
      archivedMaterials,
    ],
  );

  const onRequestApproval = useCallback(
    async (
      formValues: Record<string, unknown>,
      helpers: {
        setErrors: (errors: Record<string, unknown>) => void;
        setTouched: (touched: Record<string, boolean>) => Promise<void | Record<string, string>>;
        setFieldValue: (field: string, value: unknown) => void;
      },
    ) => {
      if (!claimId) return;
      await handleActionWithValidation("onRequestApproval", formValues, helpers, async () => {
        try {
          await requestApprovalMutation.mutateAsync({ claimId, jobId: claimData?.jobId });
          scrollToTop();
          setMessages((prev) => [
            ...prev,
            { text: t("claimRequestApprovalSuccess"), type: "success", duration: 3000 },
          ]);
        } catch {
          scrollToTop();
          setMessages((prev) => [
            ...prev,
            { text: t("claimRequestApprovalError"), type: "error", duration: 3000 },
          ]);
        }
      });
    },
    [
      claimId,
      claimData?.jobId,
      handleActionWithValidation,
      requestApprovalMutation,
      setMessages,
      t,
    ],
  );

  const onAddSpecialMaterials = useCallback(
    (formValues: Record<string, unknown>) => {
      if (!addSpecialMaterialsAllowed) return;
      setExistingPartNumbersForModal(getExistingPartNumbers(formValues));
      setShowAddSpecialMaterialModal(true);
    },
    [addSpecialMaterialsAllowed, getExistingPartNumbers],
  );

  const handleAddSpecialMaterials = useCallback(
    (items: ImportedMaterial[]) => {
      addMaterialsToForm(items, setFieldValueRef.current ?? undefined);
      hasClaimChangesRef.current = true;
      arePricesValidatedRef.current = false;
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
      hasClaimChangesRef.current = true;
      arePricesValidatedRef.current = false;
    },
    [addMaterialsToForm],
  );

  const onProductDetails = useCallback(() => {
    setIsExplosionDrawingModalOpen(true);
  }, []);

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

  const enableProductDetails = useCallback(() => {
    const spPosition = allowedPositions.find((p) => p.position === "SP");
    if (!spPosition) return false;
    const positionFields = (allFields ?? []).filter((f) => f.subtype === "diagnosticPosition");
    const spCount = positionFields.filter(
      (f) => (formValuesRef.current[f.name] as string) === "SP",
    ).length;
    return spCount < spPosition.maxCount;
  }, [allowedPositions, allFields]);

  // Validate is enabled only when user has made changes since last validate
  // Use ref so the callback always reads the latest value without needing deps
  const enableValidate = useCallback(() => true, []);

  // arePricesValidated for requestApproval: validated AND no pending changes
  // Use refs so the callback reads the latest values even if state hasn't re-rendered yet
  const claimPricesValidated = useCallback(
    () => arePricesValidatedRef.current && !hasClaimChangesRef.current,
    [],
  );

  const handleGenericAction = useCallback(
    (
      actionName: string,
      formValues: unknown,
      helpers: {
        setErrors: (errors: unknown) => void;
        setTouched: (touched: unknown) => void;
        setFieldValue: (field: string, value: unknown) => void;
      },
    ) => {
      const values = formValues as Record<string, unknown>;

      const actionHelpers = {
        setFieldValue: helpers.setFieldValue,
        setErrors: helpers.setErrors,
        setTouched: helpers.setTouched as (
          touched: Record<string, boolean>,
        ) => Promise<void | Record<string, string>>,
      };

      const actionMap: Record<string, () => void> = {
        onSaveNewNote: () => {
          void onSaveNewNote(values, actionHelpers);
        },
        onCancelNewNote: () => onCancelNewNote(values, actionHelpers),
        onRevise: () => {
          setClaimNoteModalAction("Revise");
          setIsClaimNoteModalOpen(true);
        },
        onReject: () => {
          setClaimNoteModalAction("Reject");
          setIsClaimNoteModalOpen(true);
        },
        onApprove: () => {
          setClaimNoteModalAction("Approve");
          setIsClaimNoteModalOpen(true);
        },
        onEditClaim: () => setIsClaimEditMode(true),
        onAddRow: () => {
          onAddSparePart(values);
          hasClaimChangesRef.current = true;
          arePricesValidatedRef.current = false;
        },
        onAddSpecialMaterials: () => {
          onAddSpecialMaterials(values);
          // hasClaimChangesRef is set in handleAddSpecialMaterials after modal confirm
        },
        onProductDetails: () => onProductDetails(),
        onValidate: () => {
          void onValidateClaim(values, actionHelpers);
        },
        onRequestApproval: () => {
          void onRequestApproval(values, actionHelpers);
        },
      };

      const action = actionMap[actionName];
      if (action) {
        action();
      }
    },
    [
      onSaveNewNote,
      onCancelNewNote,
      onAddSparePart,
      onAddSpecialMaterials,
      onProductDetails,
      onValidateClaim,
      onRequestApproval,
    ],
  );

  const { canChangeClaimDecision } = useClaimDecisionPermissions(currentStatus);

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
        canChangeClaimDecision,
        onSummaryDiscountChange: () => {},
        onSummaryTotalAmountChange: () => {},
        onEditClaim: () => setIsClaimEditMode(true),
        onAddRow: (formValues: unknown) => onAddSparePart(formValues as Record<string, unknown>),
        onAddSpecialMaterials: (formValues: unknown) =>
          onAddSpecialMaterials(formValues as Record<string, unknown>),
        onProductDetails: () => onProductDetails(),
        onValidate: (formValues: unknown, helpers: unknown) => {
          void onValidateClaim(
            formValues as Record<string, unknown>,
            helpers as Parameters<typeof onValidateClaim>[1],
          );
        },
        onRequestApproval: (formValues: unknown, helpers: unknown) => {
          void onRequestApproval(
            formValues as Record<string, unknown>,
            helpers as Parameters<typeof onRequestApproval>[1],
          );
        },
        arePricesValidated: claimPricesValidated,
        enableRequestApproval: claimPricesValidated,
        enableValidate,
        enableAddingSparePart,
        enableAddingSpecialMaterials,
        enableProductDetails,
      } as Record<string, (...args: unknown[]) => void | boolean | Promise<void>>,
      radioSourceCallbacks: {
        getRadioButtonsForSummaryType: () => summaryTypeOptions,
      },
      onDeleteStart: () => setIsDeletingFile(true),
      onDeleteEnd: () => setIsDeletingFile(false),
    }),
    [
      allFields,
      setAllFields,
      mandatoryFields,
      onSaveNewNote,
      onCancelNewNote,
      canChangeClaimDecision,
      onAddSparePart,
      onAddSpecialMaterials,
      onProductDetails,
      onValidateClaim,
      onRequestApproval,
      claimPricesValidated,
      enableValidate,
      enableAddingSparePart,
      enableAddingSpecialMaterials,
      enableProductDetails,
      summaryTypeOptions,
    ],
  );

  // ── DiagnosticsContext for the read-only diagnosticData tab ────────────────
  // SparePartsArea / SparePartsRow rendered inside diagnosticData tab consume
  // DiagnosticsContext.  All values are read-only stubs; the tab is never editable.
  const diagContextValue = useMemo(
    () => ({
      materials: [],
      setMaterials: () => {},
      onAddRow: () => {},
      onAddMaterials: () => {},
      onDeleteRow: () => {},
      onRestoreRow: () => {},
      addSpecialMaterialsAllowed: false,
      positionDropdownOptions: [],
      allowedPositions: [],
      getExistingPartNumbers: () => new Set<string>(),
      isDistributingRef: { current: false },
      isResyncingRef: { current: false },
      arePricesValidated: false,
      setArePricesValidated: () => {},
      hasPricesPopulated: false,
      markAllValidated: () => {},
      markRowDirty: () => {},
      summaryTypeOptions: [{ value: "totalSummary", label: "totalSummary" }],
      setSummaryTypeOptions: () => {},
      setRevisedRowPending: () => {},
      isArchivedExpanded: false,
      setIsArchivedExpanded: () => {},
      canArchiveOnDelete: false,
      resyncMaterialsFromAPI: () => {},
      discountBase,
      automaticRows: [],
      apiMaterialsLoaded: false,
      apiMaterialsEmpty: false,
      hasExistingDiagnostic: false,
    }),
    [discountBase],
  );

  // ── ClaimContext for the editable claims tab ────────────────────────────────
  const noop = useCallback(() => {}, []);

  const claimOnDeleteRow = useCallback(
    (areaName: string) => {
      onDeleteRow(areaName);
      hasClaimChangesRef.current = true;
      arePricesValidatedRef.current = false;
    },
    [onDeleteRow],
  );

  const claimOnRestoreRow = useCallback(
    (areaName: string) => {
      onRestoreRow(areaName);
      hasClaimChangesRef.current = true;
      arePricesValidatedRef.current = false;
    },
    [onRestoreRow],
  );

  const claimContextValue = useMemo(
    () => ({
      materials,
      setMaterials,
      onAddRow: isClaimEditMode ? onAddSparePart : noop,
      onAddMaterials: isClaimEditMode ? addMaterialsToForm : noop,
      onDeleteRow: isClaimEditMode ? claimOnDeleteRow : noop,
      onDeleteArchivedRow: isClaimEditMode ? onDeleteArchivedRow : noop,
      onRestoreRow: isClaimEditMode ? claimOnRestoreRow : noop,
      addSpecialMaterialsAllowed,
      positionDropdownOptions,
      allowedPositions,
      automaticRows,
      getExistingPartNumbers,
      isDistributingRef: claimIsDistributingRef,
      isResyncingRef: claimIsResyncingRef,
      arePricesValidated,
      setArePricesValidated,
      hasPricesPopulated: materials.some(
        (m) => m.unitPrice !== 0 || m.netAmount !== 0 || m.grossAmount !== 0 || m.totalAmount !== 0,
      ),
      markAllValidated,
      markRowDirty,
      summaryTypeOptions,
      setSummaryTypeOptions,
      discountBase,
      canDeleteRows: isClaimEditMode && currentStatus === "REVISED",
      archivedMaterials,
      isArchivedExpanded,
      setIsArchivedExpanded,
    }),
    [
      materials,
      setMaterials,
      isClaimEditMode,
      currentStatus,
      noop,
      claimOnDeleteRow,
      claimOnRestoreRow,
      onDeleteArchivedRow,
      onAddSparePart,
      addMaterialsToForm,
      addSpecialMaterialsAllowed,
      positionDropdownOptions,
      allowedPositions,
      automaticRows,
      getExistingPartNumbers,
      arePricesValidated,
      markAllValidated,
      markRowDirty,
      summaryTypeOptions,
      discountBase,
      archivedMaterials,
      isArchivedExpanded,
      setIsArchivedExpanded,
    ],
  );

  // Auto-expand archived section when items are added
  useEffect(() => {
    if (archivedMaterials?.length > 0) {
      setIsArchivedExpanded(true);
    }
  }, [archivedMaterials?.length]);

  useEffect(() => {
    setFieldValueRef.current?.("discountBase", discountBase);
  }, [discountBase]);

  const buildFaultCodeDropdowns = (values: Record<string, unknown>) => {
    const faultCode = values.faultCode as string;
    if (faultCode) {
      values.faultCodeDropdown = faultCode;
    }
    const claimFaultCode = values.claimFaultCode as string;
    if (claimFaultCode) {
      values.claimFaultCodeDropdown = claimFaultCode;
    }
  };

  useEffect(() => {
    const claimDataChanged = claimData !== prevClaimDataRef.current;

    if (allFields && allFields.length > 0) {
      prevClaimDataRef.current = claimData;
    }

    if (skipFormResetRef.current) {
      skipFormResetRef.current = false;
      if (claimDataChanged && claimData && allFields && allFields.length > 0) {
        prevClaimDataRef.current = claimData;
        const dataMapped = convertAPIDataToFormValues(claimData, allFields);
        const headerValues = Object.fromEntries(
          Object.entries(dataMapped).filter(
            ([k]) =>
              !k.startsWith("claims_claimSpareParts") &&
              !k.startsWith("diagnosticData_diagnosticsSpareParts"),
          ),
        );
        buildFaultCodeDropdowns(headerValues);
        setInitialFormValues((prev) => ({ ...prev, ...headerValues, discountBase }));
      }
      return;
    }

    if (claimDataChanged && claimData && allFields && allFields.length > 0) {
      prevClaimDataRef.current = claimData;
      const dataMapped = convertAPIDataToFormValues(claimData, allFields);
      dataMapped.discountBase = discountBase;
      buildFaultCodeDropdowns(dataMapped);
      setInitialFormValues(dataMapped);
    }
  }, [claimData, allFields, setInitialFormValues, discountBase]);

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

  if (!claimData) {
    return <div>{t("noClaimFound")}</div>;
  }

  const sectionHasEditableActions = (section: Section): boolean => {
    if (section.actions && section.actions.length > 0) {
      return true;
    }
    return section.areas.some((area) => area.actions && area.actions.length > 0);
  };

  const handleEdit = (sectionName?: string) => {
    if (!sectionName) return;

    if (sectionName !== "notes") return;

    setEditingSections((prev) => {
      const newSet = new Set(prev);
      newSet.add(sectionName);
      return newSet;
    });
  };

  /** For TR/ZA: disable all fields in a given area (used for claimData + summary). */
  const disableAllFieldsInArea = (area: (typeof tabs)[0]["areas"][0]) => ({
    ...area,
    isDisabled: true,
    fields: area.fields.map((f) => ({ ...f, isDisabled: true })),
  });

  const renderTabContent = (isFormReadOnly: boolean) => {
    return (
      <section>
        {visibleTabs
          .filter((tab) => tab.name === selectedTab)
          .map((tab) => {
            const isEditing = editingSections.has(tab.name);
            const isNotesTab = tab.name === "notes";
            const isClaimsTab = tab.name === "claims";

            let tabWithDisabledState;
            if (isClaimsTab) {
              // Always keep section.isDisabled = false so GenericAction (editClaim button) renders.
              // Only disable fields when not in edit mode.
              const fieldsDisabled = !isClaimEditMode;
              const sectionWithFields = setSectionDisabledState(tab, fieldsDisabled);

              // For TR/ZA in edit mode: claimData (dropdowns) and summary area must stay
              // fully disabled — only the sparse-parts price field is editable (handled in
              // ClaimSparePartsRow.applyFieldPermissions via countryCode).
              const isCountryWithRestrictedEdit =
                isClaimEditMode &&
                (userData?.countryCode === "TR" || userData?.countryCode === "ZA");

              const finalAreas = isCountryWithRestrictedEdit
                ? sectionWithFields.areas.map((area) => {
                    const shouldDisableArea =
                      area.name === "claimData" || area.name === "claimDiagnosticsSummary";
                    return shouldDisableArea ? disableAllFieldsInArea(area) : area;
                  })
                : sectionWithFields.areas;

              tabWithDisabledState = {
                ...sectionWithFields,
                isDisabled: false,
                areas: finalAreas,
              };
            } else if (isFormReadOnly && !isNotesTab) {
              tabWithDisabledState = setSectionDisabledState(tab, true);
            } else if (isEditing) {
              tabWithDisabledState = setSectionDisabledState(tab, false);
            } else {
              tabWithDisabledState = setSectionDisabledState(tab);
            }

            const currentMode: "view" | "edit" =
              (isClaimsTab && isClaimEditMode) || isEditing ? "edit" : "view";

            const canEdit = tab.name === "notes";
            const onEditHandler =
              canEdit && sectionHasEditableActions(tab) ? () => handleEdit(tab.name) : undefined;

            return (
              <GenericSection
                key={tab.name}
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
      <ClaimOverviewHeader />
      <ClaimNoteModal
        action={claimNoteModalAction}
        claimId={claimId}
        jobId={claimData.jobId}
        isOpen={isClaimNoteModalOpen}
        setIsOpen={setIsClaimNoteModalOpen}
      />
      <AddSpecialMaterialModal
        jobId={claimData.jobId}
        isOpen={showAddSpecialMaterialModal}
        setIsOpen={setShowAddSpecialMaterialModal}
        onAddMaterials={handleAddSpecialMaterials}
        existingPartNumbers={existingPartNumbersForModal}
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
      <GenericFormContext.Provider value={genericFormContextValue}>
        {/* DiagnosticsContext: used by SparePartsRow inside the read-only diagnosticData tab */}
        <DiagnosticsContext.Provider value={diagContextValue}>
          {/* ClaimContext: used by ClaimSparePartsRow / ClaimSummaryArea inside the claims tab */}
          <ClaimContext.Provider value={claimContextValue}>
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
                  {tab.label === "claimDetails" ? t("claims") : t(tab.label)}
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
                const currentMode: "view" | "edit" =
                  editingSections.size > 0 || isClaimEditMode ? "edit" : "view";
                const userData = queryClient.getQueryData<User>(["user"]);
                const ctx: ActionDependencyContext = {
                  currentMode,
                  currentStatus,
                  formValues: values,
                  user: userData,
                  actionCallbacks: genericFormContextValue.actionCallbacks,
                };
                const isFormReadOnly = areAllActionsDisabled(claimOverviewForm?.actions ?? [], ctx);

                return (
                  <Form>
                    <FormikClaimSync
                      setCurrentActionType={setCurrentActionType}
                      setCurrentJobType={setCurrentJobType}
                    />

                    {renderTabContent(isFormReadOnly)}

                    <GenericAction
                      actions={claimOverviewForm?.actions || []}
                      onActionClick={(actionName) => {
                        if (!actionName) return;
                        handleGenericAction(actionName, values, {
                          setErrors: (errors: unknown) => {
                            setErrors(errors as Record<string, string>);
                          },
                          setTouched: (touched: unknown) => {
                            void setTouched(touched as Record<string, boolean>);
                          },
                          setFieldValue: (field: string, value: unknown) => {
                            void setFieldValue(field, value);
                          },
                        });
                      }}
                      currentMode={currentMode}
                      currentStatus={currentStatus}
                      isGloballyDisabled={isDeletingFile}
                    />
                  </Form>
                );
              }}
            </Formik>
          </ClaimContext.Provider>
        </DiagnosticsContext.Provider>
      </GenericFormContext.Provider>
    </div>
  );
}
