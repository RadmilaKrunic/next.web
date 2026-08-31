import { Notification } from "@bosch/react-frok";
import { Message, MessagesContext } from "../../../contexts/messagescontext";
import { useContext, useEffect, useCallback } from "react";
import "./MessagesList.scss";

function MessagesList() {
  const { setMessages, messages } = useContext(MessagesContext);

  const handleCloseMessage = useCallback(
    (messageToRemove: Message) => {
      setMessages(messages.filter((msg) => msg !== messageToRemove));
    },
    [setMessages, messages],
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    messages.forEach((message) => {
      if (message.duration) {
        const timer = setTimeout(() => {
          handleCloseMessage(message);
        }, message.duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [messages, handleCloseMessage]);

  if (messages.length === 0) return null;

  return (
    <div className="messages-list">
      {messages.map((message, index) => (
        <Notification
          key={`${message.text}-${index}`}
          onCloseClick={() => handleCloseMessage(message)}
          variant="banner"
          open
          type={message.type}
          icon={message.icon}
        >
          {message.text}
        </Notification>
      ))}
    </div>
  );
}

export default MessagesList;
