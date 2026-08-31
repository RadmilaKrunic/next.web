import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Dropdown: ({
    label,
    value,
    options,
    onChange,
    disabled,
  }: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      "label",
      null,
      label,
      React.createElement(
        "select",
        { "aria-label": label, value, onChange, disabled },
        options.map((option) =>
          React.createElement("option", { key: option.value, value: option.value }, option.label),
        ),
      ),
    ),
}));

vi.mock("api/services/users/action", () => ({
  fetchUsersByAscId: vi.fn(),
}));

vi.mock("api/services/jobs/action", () => ({
  updateJobAssignee: vi.fn(),
}));

import TechnicianSelect from "./TechnicianSelect";
import { fetchUsersByAscId } from "api/services/users/action";
import { updateJobAssignee } from "api/services/jobs/action";
import { MessagesContext } from "contexts/messagescontext";

function renderSelect(setMessages = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    setMessages,
    queryClient,
    ...render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          MessagesContext.Provider,
          { value: { messages: [], setMessages } },
          React.createElement(TechnicianSelect, {
            assigneeName: "un-assigned",
            ascId: "ASC1",
            jobId: "J1",
          }),
        ),
      ),
    ),
  };
}

describe("TechnicianSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchUsersByAscId).mockResolvedValue([
      { userId: "U1", firstName: "Jane", lastName: "Doe" },
      { userId: "U2", firstName: "John", lastName: "Smith" },
    ] as never);
  });

  it("fetches users and renders technician options", async () => {
    renderSelect();

    await waitFor(() => expect(fetchUsersByAscId).toHaveBeenCalledWith("ASC1"));
    expect(screen.getByRole("option", { name: "Jane Doe" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "John Smith" })).toBeInTheDocument();
  });

  it("updates assignee and shows success message", async () => {
    const setMessages = vi.fn();
    vi.mocked(updateJobAssignee).mockResolvedValue(undefined as never);
    renderSelect(setMessages);

    await waitFor(() => expect(fetchUsersByAscId).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText("technician"), { target: { value: "U1" } });

    await waitFor(() => expect(updateJobAssignee).toHaveBeenCalledWith("J1", "U1", "Jane Doe"));
    expect(setMessages).toHaveBeenCalled();
  });

  it("handles update failure and shows error message", async () => {
    const setMessages = vi.fn();
    vi.mocked(updateJobAssignee).mockRejectedValue(new Error("failed"));
    renderSelect(setMessages);

    await waitFor(() => expect(fetchUsersByAscId).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText("technician"), { target: { value: "U2" } });

    await waitFor(() => expect(updateJobAssignee).toHaveBeenCalled());
    expect(setMessages).toHaveBeenCalled();
  });
});
