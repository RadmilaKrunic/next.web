import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useMessages } from "../../../api/services/jobs/hooks";
import MessagesPreview from "../MessagesModal/MessagesPreview/MessagesPreview";
import NotesLegend from "./NotesLegend";
import "./NotesList.scss";
import { Button } from "@bosch/react-frok";
import { useQueryClient } from "@tanstack/react-query";
import { ClaimItem } from "modules/ClaimManagement/ClaimOverview/Claims.types";

type NotesListProps = {
  entityType?: "job" | "claim";
};

function NotesList({ entityType = "job" }: Readonly<NotesListProps>) {
  const { jobId, claimId } = useParams<{ jobId: string; claimId: string }>();
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const resolvedJobId =
    entityType === "claim"
      ? (queryClient.getQueryData<ClaimItem>(["claim", claimId])?.jobId ?? "")
      : (jobId ?? "");

  const { data: allMessages = [] } = useMessages(resolvedJobId, undefined, entityType);

  const displayedMessages = showAll ? allMessages : allMessages.slice(0, 3);
  const hasMoreMessages = allMessages.length > 3;

  const handleShowMoreClick = () => {
    setShowAll(!showAll);
  };

  return (
    <div className="recent-notes-list">
      <div className="recent-notes-header-row">
        <p className="recent-notes-header">{t("recentNotes")}</p>
        {hasMoreMessages && (
          <Button
            mode="tertiary"
            type="button"
            className="show-more-button"
            onClick={handleShowMoreClick}
          >
            {showAll ? t("showLess") : t("showMore")}
          </Button>
        )}
      </div>
      {displayedMessages.length > 0 ? (
        displayedMessages.map((message) => (
          <MessagesPreview
            key={message.messageId}
            message={message}
            className="notes-section-block claim-message"
            showDot={true}
          />
        ))
      ) : (
        <p className="no-notes">{t("notesWereNotAdded")}</p>
      )}
      {displayedMessages.length > 0 && <NotesLegend />}
    </div>
  );
}

export default NotesList;
