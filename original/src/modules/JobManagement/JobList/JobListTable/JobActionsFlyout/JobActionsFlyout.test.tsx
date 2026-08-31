import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const navigateMock = vi.fn();
const mutateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@bosch/react-frok", () => ({
  Button: ({ "data-testid": testId }: { "data-testid"?: string }) =>
    React.createElement("button", { "data-testid": testId }, "trigger"),
}));

vi.mock("components/ui/ScrollablePopover/ScrollablePopover", () => ({
  ScrollablePopover: ({
    trigger,
    children,
  }: {
    trigger: React.ReactNode;
    children: React.ReactNode;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "popover" },
      trigger,
      React.createElement("div", null, children),
    ),
}));

vi.mock("../JobAction/JobAction", () => ({
  default: ({ actionName, onClick }: { actionName?: string; onClick?: () => void }) =>
    React.createElement(
      "button",
      { onClick, "data-testid": `action-${actionName ?? "default"}` },
      actionName ?? "default",
    ),
}));

vi.mock("../../../../../api/services/orders/orders", () => ({
  getOrderReceipt: vi.fn(),
}));

vi.mock("../../../../../api/services/jobs/hooks", () => ({
  usePostJobStatusStartDiagnostic: vi.fn(() => ({
    mutate: (
      payload: { jobId: string },
      options?: { onSuccess?: () => void; onError?: (error: Error) => void },
    ) => {
      mutateMock(payload);
      options?.onSuccess?.();
    },
  })),
}));

import JobActionsFlyout from "./JobActionsFlyout";
import { getOrderReceipt } from "../../../../../api/services/orders/orders";

const baseJob = {
  jobId: "J1",
  orderId: "O1",
  jobStatus: "READY_FOR_DIAGNOSTIC",
};

function renderFlyout(job = baseJob) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const setSelectedJobId = vi.fn();
  const setShowDocumentModal = vi.fn();
  const setShowMessagesModal = vi.fn();

  return {
    setSelectedJobId,
    setShowDocumentModal,
    setShowMessagesModal,
    ...render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(JobActionsFlyout, {
          job: job as never,
          setSelectedJobId,
          setShowDocumentModal,
          setShowMessagesModal,
        }),
      ),
    ),
  };
}

describe("JobActionsFlyout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "open",
      vi.fn(() => ({ closed: false })),
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob://mock"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("starts diagnostics and navigates for READY_FOR_DIAGNOSTIC", () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId("action-startDiagnostics"));

    expect(mutateMock).toHaveBeenCalledWith({ jobId: "J1" });
    expect(navigateMock).toHaveBeenCalledWith("/job-overview/J1#diagnosticData");
  });

  it("opens messages and documents callbacks", () => {
    const { setSelectedJobId, setShowMessagesModal, setShowDocumentModal } = renderFlyout({
      ...baseJob,
      jobStatus: "IN_PROGRESS",
    });

    fireEvent.click(screen.getByTestId("action-messages"));
    fireEvent.click(screen.getByTestId("action-documents"));

    expect(setSelectedJobId).toHaveBeenCalledWith("J1");
    expect(setShowMessagesModal).toHaveBeenCalledWith(true);
    expect(setShowDocumentModal).toHaveBeenCalledWith(true);
  });

  it("prints job receipt when blob is returned", async () => {
    vi.mocked(getOrderReceipt).mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));

    renderFlyout({ ...baseJob, jobStatus: "IN_PROGRESS" });

    fireEvent.click(screen.getByTestId("action-printJobReceipt"));

    await waitFor(() => expect(getOrderReceipt).toHaveBeenCalledWith("O1"));
    expect(window.open).toHaveBeenCalled();
  });
});
