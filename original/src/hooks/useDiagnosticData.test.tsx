import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("api/services/jobs/hooks", () => ({
  useDiagnosticByJobId: vi.fn(),
}));

import { useDiagnosticData } from "./useDiagnosticData";
import { useDiagnosticByJobId } from "api/services/jobs/hooks";

const diagnosticTab = {
  name: "diagnosticData",
  label: "diagnostic",
  hiddenForStatuses: ["DRAFT"],
  areas: [],
};

describe("useDiagnosticData", () => {
  it("does not fetch when jobData is missing", () => {
    vi.mocked(useDiagnosticByJobId).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as never);

    const { result } = renderHook(() =>
      useDiagnosticData({ jobId: "J1", jobData: null, tabs: [diagnosticTab] as never }),
    );

    expect(result.current.shouldFetchDiagnostic).toBe(false);
    expect(vi.mocked(useDiagnosticByJobId)).toHaveBeenCalledWith("J1", { enabled: false });
  });

  it("does not fetch when tabs are empty", () => {
    vi.mocked(useDiagnosticByJobId).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as never);

    const { result } = renderHook(() =>
      useDiagnosticData({
        jobId: "J1",
        jobData: { job: { jobStatus: "IN_PROGRESS" } },
        tabs: [],
      }),
    );

    expect(result.current.shouldFetchDiagnostic).toBe(false);
  });

  it("does not fetch when status is hidden for diagnostic tab", () => {
    vi.mocked(useDiagnosticByJobId).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as never);

    const { result } = renderHook(() =>
      useDiagnosticData({
        jobId: "J1",
        jobData: { job: { jobStatus: "DRAFT" } },
        tabs: [diagnosticTab] as never,
      }),
    );

    expect(result.current.shouldFetchDiagnostic).toBe(false);
  });

  it("fetches when status is allowed", () => {
    vi.mocked(useDiagnosticByJobId).mockReturnValue({
      data: { jobId: "J1", materials: [] },
      isLoading: false,
      error: null,
    } as never);

    const { result } = renderHook(() =>
      useDiagnosticData({
        jobId: "J1",
        jobData: { job: { jobStatus: "IN_PROGRESS" } },
        tabs: [diagnosticTab] as never,
      }),
    );

    expect(result.current.shouldFetchDiagnostic).toBe(true);
    expect(vi.mocked(useDiagnosticByJobId)).toHaveBeenCalledWith("J1", { enabled: true });
  });

  it("returns empty diagnostic fallback when API returns undefined", () => {
    vi.mocked(useDiagnosticByJobId).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as never);

    const { result } = renderHook(() =>
      useDiagnosticData({
        jobId: "J1",
        jobData: { job: { jobStatus: "IN_PROGRESS" } },
        tabs: [{ ...diagnosticTab, hiddenForStatuses: [] }] as never,
      }),
    );

    const diagnosticData = result.current.diagnosticData as { jobId: string; materials: unknown[] };
    expect(diagnosticData.jobId).toBe("");
    expect(diagnosticData.materials).toEqual([]);
  });

  it("returns API loading and error flags", () => {
    const error = new Error("failed");
    vi.mocked(useDiagnosticByJobId).mockReturnValue({
      data: undefined,
      isLoading: true,
      error,
    } as never);

    const { result } = renderHook(() =>
      useDiagnosticData({
        jobId: "J1",
        jobData: { job: { jobStatus: "IN_PROGRESS" } },
        tabs: [{ ...diagnosticTab, hiddenForStatuses: [] }] as never,
      }),
    );

    expect(result.current.diagnosticLoading).toBe(true);
    expect(result.current.diagnosticError).toBe(error);
  });
});
