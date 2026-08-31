import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchUsersByAscId,
  searchUsers,
  createUser,
  getUserById,
  deleteUser,
  updateUser,
  suspendUser,
} from "./action";

vi.mock("../../axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

vi.spyOn(console, "error").mockImplementation(() => undefined);

import axiosClient from "../../axios-client/axiosClient";
const mockGet = vi.mocked(axiosClient.get);
const mockPost = vi.mocked(axiosClient.post);
const mockPut = vi.mocked(axiosClient.put);
const mockDelete = vi.mocked(axiosClient.delete);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchUsersByAscId", () => {
  it("returns user list on success", async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: "1", name: "Tech A" }] });
    const result = await fetchUsersByAscId("asc123");
    expect(result).toEqual([{ id: "1", name: "Tech A" }]);
    expect(mockGet).toHaveBeenCalledWith("/v1/users/asc/asc123/technicians");
  });

  it("returns empty array when data is null", async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    const result = await fetchUsersByAscId("asc123");
    expect(result).toEqual([]);
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));
    await expect(fetchUsersByAscId("asc123")).rejects.toThrow("Network error");
  });
});

describe("searchUsers", () => {
  it("returns content list on success", async () => {
    mockPost.mockResolvedValueOnce({ data: { content: [{ id: "1" }] } });
    const result = await searchUsers("asc123");
    expect(result).toEqual([{ id: "1" }]);
    expect(mockPost).toHaveBeenCalledWith("/v1/users/search?page=0&size=200", {
      ascId: "asc123",
      firstName: null,
      lastName: null,
      email: null,
      type: "ASC",
      permissions: null,
      filterForTechnician: false,
    });
  });

  it("returns empty array when content is missing", async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    const result = await searchUsers("asc123");
    expect(result).toEqual([]);
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("search failed"));
    await expect(searchUsers("asc123")).rejects.toThrow("search failed");
  });
});

describe("createUser", () => {
  it("creates user and returns data", async () => {
    mockPost.mockResolvedValueOnce({ data: { id: "1" } });
    const result = await createUser({ firstName: "A" });
    expect(result).toEqual({ id: "1" });
    expect(mockPost).toHaveBeenCalledWith("/v1/users", { firstName: "A" });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("create failed"));
    await expect(createUser({})).rejects.toThrow("create failed");
  });
});

describe("getUserById", () => {
  it("returns user data", async () => {
    mockGet.mockResolvedValueOnce({ data: { id: "1" } });
    const result = await getUserById("1");
    expect(result).toEqual({ id: "1" });
    expect(mockGet).toHaveBeenCalledWith("/v1/users/1");
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("not found"));
    await expect(getUserById("1")).rejects.toThrow("not found");
  });
});

describe("deleteUser", () => {
  it("calls delete endpoint", async () => {
    mockDelete.mockResolvedValueOnce(undefined);
    await deleteUser("1");
    expect(mockDelete).toHaveBeenCalledWith("/v1/users/1");
  });

  it("throws on error", async () => {
    mockDelete.mockRejectedValueOnce(new Error("delete failed"));
    await expect(deleteUser("1")).rejects.toThrow("delete failed");
  });
});

describe("updateUser", () => {
  it("updates user and returns data", async () => {
    mockPut.mockResolvedValueOnce({ data: { id: "1", firstName: "B" } });
    const result = await updateUser("1", { firstName: "B" });
    expect(result).toEqual({ id: "1", firstName: "B" });
    expect(mockPut).toHaveBeenCalledWith("/v1/users/1", { firstName: "B" });
  });

  it("throws on error", async () => {
    mockPut.mockRejectedValueOnce(new Error("update failed"));
    await expect(updateUser("1", {})).rejects.toThrow("update failed");
  });
});

describe("suspendUser", () => {
  it("calls suspend endpoint", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await suspendUser("1");
    expect(mockPost).toHaveBeenCalledWith("/v1/users/suspend/1");
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("suspend failed"));
    await expect(suspendUser("1")).rejects.toThrow("suspend failed");
  });
});
