import { describe, it, expect, vi, beforeEach } from "vitest";
import axiosClient from "api/axios-client/axiosClient";
import { fetchClientManagementCustomers } from "./action";
import type { ClientManagementCustomersRequest } from "./clientManagement.types";

vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockPost = vi.mocked(axiosClient.post);

const request: ClientManagementCustomersRequest = {
  ascId: "asc-1",
};

const responseData = {
  content: [],
  page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
};

describe("fetchClientManagementCustomers", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: responseData } as any);
  });

  it("posts to the base URL with no query params when page and size are omitted", async () => {
    await fetchClientManagementCustomers(request);

    expect(mockPost).toHaveBeenCalledWith("/v1/data/client-management/customers", request);
  });

  it("appends only the page param when page is provided", async () => {
    await fetchClientManagementCustomers(request, 2);

    expect(mockPost).toHaveBeenCalledWith("/v1/data/client-management/customers?page=2", request);
  });

  it("appends only the size param when size is provided", async () => {
    await fetchClientManagementCustomers(request, undefined, 50);

    expect(mockPost).toHaveBeenCalledWith("/v1/data/client-management/customers?size=50", request);
  });

  it("appends both page and size params when both are provided", async () => {
    await fetchClientManagementCustomers(request, 2, 50);

    expect(mockPost).toHaveBeenCalledWith(
      "/v1/data/client-management/customers?page=2&size=50",
      request,
    );
  });

  it("treats page 0 as a provided value, not as omitted", async () => {
    await fetchClientManagementCustomers(request, 0);

    expect(mockPost).toHaveBeenCalledWith("/v1/data/client-management/customers?page=0", request);
  });

  it("returns response.data on success", async () => {
    const result = await fetchClientManagementCustomers(request);

    expect(result).toEqual(responseData);
  });

  it("logs and rethrows when the request fails", async () => {
    const error = new Error("Network error");
    mockPost.mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(fetchClientManagementCustomers(request)).rejects.toThrow("Network error");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching client management customers:",
      error,
    );

    consoleErrorSpy.mockRestore();
  });
});
