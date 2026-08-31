import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { MessagesContext } from "contexts/messagescontext";

const mockNavigate = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("api/axios-client/axiosClient", () => ({
  default: { delete: vi.fn() },
}));

import axiosClient from "api/axios-client/axiosClient";
import DeleteEmployeeDialog from "./DeleteEmployeeDialog";

const mockDelete = vi.mocked(axiosClient.delete);

function renderComponent(props: Partial<React.ComponentProps<typeof DeleteEmployeeDialog>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
  const setShowDeleteDialog = vi.fn();
  const setPagination = vi.fn();
  const setMessages = vi.fn();

  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MessagesContext.Provider value={{ messages: [], setMessages }}>
          <DeleteEmployeeDialog
            employeeId="emp-1"
            showDeleteDialog
            setShowDeleteDialog={setShowDeleteDialog}
            setPagination={setPagination}
            {...props}
          />
        </MessagesContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { setShowDeleteDialog, setPagination, setMessages, invalidateSpy };
}

describe("DeleteEmployeeDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("renders the dialog when open", () => {
    renderComponent();
    expect(screen.getByText("confirmDelete")).toBeInTheDocument();
  });

  it("calls setShowDeleteDialog(false) on cancel", () => {
    const { setShowDeleteDialog } = renderComponent();
    fireEvent.click(screen.getByText("cancel"));
    expect(setShowDeleteDialog).toHaveBeenCalledWith(false);
  });

  it("deletes employee, invalidates queries, resets pagination and navigates on success", async () => {
    mockDelete.mockResolvedValueOnce({});
    sessionStorage.setItem("employeeList-currentPage", "3");
    sessionStorage.setItem("employeeList-pageSize", "25");
    const { setShowDeleteDialog, setPagination, invalidateSpy } = renderComponent();

    fireEvent.click(screen.getByText("confirm"));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("/v1/users/emp-1"));
    await waitFor(() => expect(setShowDeleteDialog).toHaveBeenCalledWith(false));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["employees"] });
    expect(sessionStorage.getItem("employeeList-currentPage")).toBeNull();
    expect(sessionStorage.getItem("employeeList-pageSize")).toBeNull();
    expect(setPagination).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    expect(mockNavigate).toHaveBeenCalledWith("/employee-list");
  });

  it("does not call setPagination when not provided", async () => {
    mockDelete.mockResolvedValueOnce({});
    const { setShowDeleteDialog } = renderComponent({ setPagination: undefined });

    fireEvent.click(screen.getByText("confirm"));

    await waitFor(() => expect(setShowDeleteDialog).toHaveBeenCalledWith(false));
    expect(mockNavigate).toHaveBeenCalledWith("/employee-list");
  });

  it("shows an error message and closes the dialog on failure", async () => {
    mockDelete.mockRejectedValueOnce(new Error("fail"));
    const { setShowDeleteDialog, setMessages } = renderComponent();

    fireEvent.click(screen.getByText("confirm"));

    await waitFor(() => expect(setShowDeleteDialog).toHaveBeenCalledWith(false));
    expect(setMessages).toHaveBeenCalledWith([
      { type: "error", duration: 5000, text: "failedToDeleteEmployee" },
    ]);
  });
});
