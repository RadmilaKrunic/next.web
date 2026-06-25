import { Button } from "@bosch/react-frok";
import ApprovalAction from "../ApprovalAction/ApprovalAction";
import { useNavigate } from "react-router-dom";
import { ScrollablePopover } from "components/ui/ScrollablePopover/ScrollablePopover";
import { useContext, useState } from "react";
import { scrollToTop } from "utils/scrollToError";
import ApprovalDecisionModal from "../ApprovalDecisionModal/ApprovalDecisionModal";
import { useUpdateApprovalStatus } from "api/services/approvals/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MessagesContext } from "contexts/messagescontext";
import { JobOverviewItem } from "modules/JobManagement/JobList/JobList.types";

type DecisionType = "approved" | "rejected" | "revised" | null;

export default function ApprovalActionsFlyout({
  jobId,
  materialId,
  showJobDetailsAction = true,
  onBeforeInvalidate,
}: Readonly<{
  jobId: string | undefined;
  materialId?: string;
  showJobDetailsAction?: boolean;
  onBeforeInvalidate?: () => void;
}>) {
  const navigate = useNavigate();
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [currentDecision, setCurrentDecision] = useState<DecisionType>(null);
  const { setMessages } = useContext(MessagesContext);

  const { mutate: updateApprovalStatus } = useUpdateApprovalStatus({
    onSuccess: async () => {
      onBeforeInvalidate?.();
      await queryClient.invalidateQueries({ queryKey: ["approvals"] });
      await queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      await queryClient.invalidateQueries({ queryKey: ["diagnostic", jobId] });
      setDecisionModalOpen(false);
      setCurrentDecision(null);
      setMessages((prev) => [
        ...prev,
        {
          text: `${t("successfulJobPreApprovalDecision")}`,
          type: "success",
          duration: 3000,
        },
      ]);
      scrollToTop();
      const updatedJob = queryClient.getQueryData<JobOverviewItem>(["job", jobId]);
      if (!updatedJob?.job?.pendingApprovals?.includes("BOSCH_INTERNAL")) {
        await navigate("/approval-list");
      }
    },
    onError: () => {
      scrollToTop();
      setMessages((prev) => [
        ...prev,
        {
          text: `${t("errorJobPreApprovalDecision")}`,
          type: "error",
          duration: 3000,
        },
      ]);
    },
  });

  const handleDecisionClick = (decision: DecisionType) => {
    setCurrentDecision(decision);
    setDecisionModalOpen(true);
  };

  const handleConfirmDecision = (comments: string) => {
    if (!currentDecision || !jobId) return;

    let decisionValue = "REVISED";
    if (currentDecision === "approved") {
      decisionValue = "APPROVED";
    } else if (currentDecision === "rejected") {
      decisionValue = "REJECTED";
    }

    updateApprovalStatus({
      jobId,
      materialIds: materialId ? [materialId] : [],
      approvalStatus: decisionValue,
      message: comments || null,
    });
  };

  const getModalTitle = () => {
    switch (currentDecision) {
      case "approved":
        return t("approveGoodwill");
      case "rejected":
        return t("rejectGoodwill");
      case "revised":
        return t("requestClarification");
      default:
        return "";
    }
  };

  return (
    <>
      <ScrollablePopover
        data-testid={`approval-actions-popover-${jobId}`}
        className={materialId ? "spare-part-actions-popover" : "job-actions-popover"}
        trigger={
          <Button
            icon={"options"}
            className="job-actions-popover-trigger"
            tabIndex={0}
            aria-label="More approval options"
            data-testid={`approval-actions-popover-trigger-${jobId}`}
          />
        }
      >
        {showJobDetailsAction && (
          <ApprovalAction
            iconName="watch-on"
            actionName="openJobDetails"
            onClick={() => {
              const navigateResult = navigate(`/job-overview/${jobId}#diagnosticData`, {
                state: { from: "approval-list" },
              });
              if (navigateResult instanceof Promise) {
                navigateResult.catch(() => undefined);
              }
            }}
            jobId={jobId}
          />
        )}

        <ApprovalAction
          iconName="check"
          actionName="approveGoodwill"
          onClick={() => handleDecisionClick("approved")}
          jobId={jobId}
        />

        <ApprovalAction
          iconName="close"
          actionName="rejectGoodwill"
          onClick={() => handleDecisionClick("rejected")}
          jobId={jobId}
        />

        <ApprovalAction
          iconName="message-question"
          actionName="requestClarification"
          onClick={() => handleDecisionClick("revised")}
          jobId={jobId}
        />
      </ScrollablePopover>

      {decisionModalOpen && currentDecision && (
        <ApprovalDecisionModal
          isOpen={decisionModalOpen}
          onClose={() => {
            setDecisionModalOpen(false);
            setCurrentDecision(null);
          }}
          onConfirm={handleConfirmDecision}
          title={getModalTitle()}
          decisionType={currentDecision}
          jobId={jobId}
        />
      )}
    </>
  );
}
