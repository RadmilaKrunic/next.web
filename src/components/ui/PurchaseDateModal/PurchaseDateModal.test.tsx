import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

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

vi.mock("components/ui/DatePicker/DatePicker", async () => {
  const { useFormikContext } = await import("formik");

  return {
    default: ({ name, label }: { name: string; label: string }) => {
      const { values, setFieldValue } = useFormikContext<Record<string, string | null>>();

      return (
        <input
          data-testid={`datepicker-${name}`}
          aria-label={label}
          onChange={(event) => {
            void setFieldValue(name, event.target.value);
          }}
          value={values[name] ?? ""}
        />
      );
    },
  };
});

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

  qc.setQueryData(["job", "job-1"], {
    job: {
      asset: {
        manufacturedDate: "05/2024",
      },
    },
  });

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

  it("submits formatted purchase date", async () => {
    renderComponent();

    fireEvent.change(screen.getByTestId("datepicker-purchaseDate"), {
      target: { value: "2024-06-15" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("purchase-date-submit-button")).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId("purchase-date-submit-button"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ jobId: "job-1", purchaseDate: "2024-06-15" });
    });
  });

  it("shows validation error when purchase date is before manufactured date", async () => {
    renderComponent();

    fireEvent.change(screen.getByTestId("datepicker-purchaseDate"), {
      target: { value: "2024-04-30" },
    });

    fireEvent.click(screen.getByTestId("purchase-date-submit-button"));

    expect(
      await screen.findByText("purchaseDateMustBeSameOrAfterManufacturedDate (05/2024)."),
    ).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
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

  it("clears api error when cancel is clicked", () => {
    renderComponent({ onClose: vi.fn() });

    act(() => {
      mutationOptions.onError?.(new Error("boom"));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("translated error message");

    fireEvent.click(screen.getByTestId("purchase-date-cancel-button"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears api error after successful submit callback", () => {
    renderComponent({ onClose: vi.fn() });

    act(() => {
      mutationOptions.onError?.(new Error("boom"));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("translated error message");

    act(() => {
      mutationOptions.onSuccess?.();
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
