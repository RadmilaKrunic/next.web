import { Button } from "@bosch/react-frok";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollablePopover } from "components/ui/ScrollablePopover/ScrollablePopover";
import ClaimNoteModal from "../../../ClaimOverview/ClaimNoteModal/ClaimNoteModal";
import { MessagesContext } from "contexts/messagescontext";
import ClaimAction from "../ClaimAction/ClaimAction";
import { Claim } from "../../ClaimList.types";
import { useClaimDecisionPermissions } from "hooks/useClaimDecisionPermissions";

type ClaimNoteAction = "Approve" | "Reject" | "Revise";

export default function ClaimActionsFlyout({
  claim,
  setSelectedClaimId,
  setShowDocumentModal,
  setShowMessagesModal,
}: Readonly<{
  claim: Claim;
  setSelectedClaimId: (id: string) => void;
  setShowDocumentModal: (show: boolean) => void;
  setShowMessagesModal: (show: boolean) => void;
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const { setMessages } = useContext(MessagesContext);
  const [claimNoteModalOpen, setClaimNoteModalOpen] = useState(false);
  const [claimNoteAction, setClaimNoteAction] = useState<ClaimNoteAction>("Approve");

  const { canChangeClaimDecision, showDecisionActions } = useClaimDecisionPermissions(claim.status);

  const handleDecisionClick = (action: ClaimNoteAction) => {
    setClaimNoteAction(action);
    setClaimNoteModalOpen(true);
  };

  const handleDecisionSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ["claims"] });
    queryClient.removeQueries({ queryKey: ["claim", claim.claimId] });
    setMessages((prev) => [
      ...prev,
      { type: "success", text: t("successfulClaimDecision"), duration: 3000 },
    ]);
  };

  return (
    <>
      <ScrollablePopover
        data-testid={`claim-actions-popover-${claim.claimId}`}
        className="job-actions-popover"
        trigger={
          <Button
            icon="options"
            className="job-actions-popover-trigger"
            tabIndex={0}
            aria-label="More claim options"
            data-testid={`claim-actions-popover-trigger-${claim.claimId}`}
          />
        }
      >
        {showDecisionActions && (
          <ClaimAction
            actionName="approve"
            iconName="checkmark"
            disabled={!canChangeClaimDecision()}
            onClick={() => handleDecisionClick("Approve")}
            claimId={claim.claimId}
          />
        )}
        {showDecisionActions && (
          <ClaimAction
            actionName="reject"
            iconName="close-small"
            disabled={!canChangeClaimDecision()}
            onClick={() => handleDecisionClick("Reject")}
            claimId={claim.claimId}
          />
        )}
        {showDecisionActions && (
          <ClaimAction
            actionName="revise"
            iconName="edit"
            disabled={!canChangeClaimDecision()}
            onClick={() => handleDecisionClick("Revise")}
            claimId={claim.claimId}
          />
        )}
        <ClaimAction
          actionName="messages"
          iconName="message"
          onClick={() => {
            setSelectedClaimId(claim.claimId);
            setShowMessagesModal(true);
          }}
          claimId={claim.claimId}
        />
        <ClaimAction
          actionName="documents"
          iconName="document-view"
          onClick={() => {
            setSelectedClaimId(claim.claimId);
            setShowDocumentModal(true);
          }}
          claimId={claim.claimId}
        />
      </ScrollablePopover>

      {showDecisionActions && (
        <ClaimNoteModal
          action={claimNoteAction}
          claimId={claim.claimId}
          jobId={claim.jobId}
          isOpen={claimNoteModalOpen}
          setIsOpen={setClaimNoteModalOpen}
          onSuccess={handleDecisionSuccess}
        />
      )}
    </>
  );
}
