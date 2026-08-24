import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockMutate = vi.fn();
let mutationOptions: {
  onSuccess?: (...args: unknown[]) => void;
  onError?: (...args: unknown[]) => void;
} = {};
let mockIsPending = false;

vi.mock("api/services/jobs/hooks", () => ({
  usePostPurchaseDate: (options: typeof mutationOptions) => {
    mutationOptions = options;
    return { mutate: mockMutate, isPending: mockIsPending };
  },
}));

vi.mock("components/ui/DatePicker/DatePicker", () => ({
  default: ({ name, label }: { name: string; label: string }) => (
    <input
      data-testid={`datepicker-${name}`}
      aria-label={label}
      onChange={() => {}}
      value=""
      readOnly
    />
  ),
}));

vi.mock("utils/getApiErrorMessage", () => ({
  getApiErrorMessage: () => "translated error message",
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MessagesContext } from "contexts/messagescontext";
import PurchaseDateModal from "./PurchaseDateModal";

function renderComponent(props: Partial<React.ComponentProps<typeof PurchaseDateModal>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
  const onClose = vi.fn();
  const setMessages = vi.fn();

  render(
    <QueryClientProvider client={qc}>
      <MessagesContext.Provider value={{ messages: [], setMessages }}>
        <PurchaseDateModal jobId="job-1" isOpen onClose={onClose} {...props} />
      </MessagesContext.Provider>
    </QueryClientProvider>,
  );

  return { onClose, setMessages, invalidateSpy };
}

describe("PurchaseDateModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
    mutationOptions = {};
  });

  it("renders modal title and datepicker when open", () => {
    renderComponent();
    expect(screen.getByText("verifyPurchaseDateModalTitle")).toBeInTheDocument();
    expect(screen.getByTestId("datepicker-purchaseDate")).toBeInTheDocument();
  });

  it("disables submit button when no purchase date selected", () => {
    renderComponent();
    expect(screen.getByTestId("purchase-date-submit-button")).toBeDisabled();
  });

  it("calls onClose when cancel is clicked", () => {
    const { onClose } = renderComponent();
    fireEvent.click(screen.getByTestId("purchase-date-cancel-button"));
    expect(onClose).toHaveBeenCalled();
  });

  it("disables buttons while mutation is pending", () => {
    mockIsPending = true;
    renderComponent();
    expect(screen.getByTestId("purchase-date-cancel-button")).toBeDisabled();
    expect(screen.getByTestId("purchase-date-submit-button")).toBeDisabled();
  });

  it("invokes onSuccess handler behavior: invalidates query and shows success message", () => {
    const { onClose, setMessages, invalidateSpy } = renderComponent();
    act(() => {
      mutationOptions.onSuccess?.();
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["job", "job-1"] });
    expect(setMessages).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("invokes onError handler and displays the error message", () => {
    renderComponent();
    act(() => {
      mutationOptions.onError?.(new Error("boom"));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("translated error message");
  });
});
