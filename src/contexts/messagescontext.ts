import { createContext } from "react";
import type { NotificationProps } from "@bosch/react-frok";

export interface Message extends NotificationProps {
  text: string;
  duration?: number; //number of milliseconds the message should be displayed, if not provided the message will stay until manually closed
}

export interface MessagesContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const MessagesContext = createContext<MessagesContextType>({
  messages: [],
  setMessages: () => {},
});
