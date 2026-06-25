import "./MessagesPreview.scss";
import { Badge, Icon } from "@bosch/react-frok";
import { Message } from "modules/JobManagement/JobList/JobList.types";
import { formatDateToDisplay, formatTime } from "utils/dateFormatter";
import { getMessageCategory } from "./messagesPreview.utils";

function MessagesPreview({
  message,
  className = "",
  showDot = false,
}: Readonly<{
  message: Message;
  className?: string;
  showDot?: boolean;
}>) {
  const isClaimCategory = getMessageCategory(message.messageType) === "claim";

  return (
    <div className={`message-row ${className}`.trim()} data-testid={`message-${message.messageId}`}>
      <div className="message-left" aria-hidden="true">
        {showDot ? (
          <Badge
            label=""
            type={isClaimCategory ? "success" : undefined}
            className="claim-message-badge"
          />
        ) : (
          <Icon iconName="my-brand-frame" className="message-icon" />
        )}
      </div>
      <div className="message-center">
        <span className="message-name">{message.message}</span>
        <span className="message-createdBy">
          {message.authorId} {message.authorName} {formatDateToDisplay(message.createdAt)}{" "}
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

export default MessagesPreview;
