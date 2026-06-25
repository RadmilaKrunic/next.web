import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { MessagesContext, MessagesContextType, Message } from "../../../contexts/messagescontext";
import MessagesList from "./MessagesList";

vi.mock("@bosch/react-frok", () => ({
  Notification: ({
    children,
    onCloseClick,
  }: {
    children: React.ReactNode;
    onCloseClick: () => void;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "notification", role: "alert" },
      children,
      React.createElement("button", { onClick: onCloseClick }, "close"),
    ),
}));

function renderWithMessages(messages: Message[]) {
  const setMessages = vi.fn();
  const ctx: MessagesContextType = { messages, setMessages };
  return {
    setMessages,
    ...render(
      React.createElement(
        MessagesContext.Provider,
        { value: ctx },
        React.createElement(MessagesList),
      ),
    ),
  };
}

describe("MessagesList", () => {
  it("renders nothing when messages is empty", () => {
    const { container } = renderWithMessages([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a notification for each message", () => {
    renderWithMessages([
      { text: "Hello", type: "success" },
      { text: "World", type: "error" },
    ]);
    expect(screen.getAllByTestId("notification")).toHaveLength(2);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("World")).toBeInTheDocument();
  });

  it("calls setMessages when a notification is closed", async () => {
    const { setMessages } = renderWithMessages([{ text: "Msg", type: "success" }]);
    await userEvent.click(screen.getByRole("button", { name: "close" }));
    expect(setMessages).toHaveBeenCalled();
  });

  it("auto-removes message after duration expires", () => {
    vi.useFakeTimers();
    const setMessages = vi.fn();

    function Wrapper() {
      const [msgs, setMsgs] = useState<Message[]>([
        { text: "Auto", type: "success", duration: 100 },
      ]);
      const ctx: MessagesContextType = {
        messages: msgs,
        setMessages: (v) => {
          const next = typeof v === "function" ? v(msgs) : v;
          setMsgs(next);
          setMessages(next);
        },
      };
      return React.createElement(
        MessagesContext.Provider,
        { value: ctx },
        React.createElement(MessagesList),
      );
    }

    render(React.createElement(Wrapper));
    expect(screen.getByText("Auto")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(setMessages).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
