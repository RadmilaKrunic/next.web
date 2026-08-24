import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import axiosClient from "./axiosClient";

type Handler = {
  fulfilled: (value: unknown) => unknown;
  rejected: (error: unknown) => unknown;
};

function getRequestHandler(): Handler {
  return (axiosClient.interceptors.request as any).handlers[0];
}

function getResponseHandler(): Handler {
  return (axiosClient.interceptors.response as any).handlers[0];
}

describe("axiosClient request interceptor", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds Authorization header when a token exists", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("abc123");
    const config = { headers: new Map() } as unknown as InternalAxiosRequestConfig;
    (config.headers as unknown as Map<string, string>).set = vi.fn();
    const result = getRequestHandler().fulfilled(config);
    expect(
      (config.headers as unknown as { set: (...args: unknown[]) => void }).set,
    ).toHaveBeenCalledWith("Authorization", "Bearer abc123");
    expect(result).toBe(config);
  });

  it("does not add Authorization header when no token exists", () => {
    const config = { headers: new Map() } as unknown as InternalAxiosRequestConfig;
    (config.headers as unknown as Map<string, string>).set = vi.fn();
    getRequestHandler().fulfilled(config);
    expect(
      (config.headers as unknown as { set: (...args: unknown[]) => void }).set,
    ).not.toHaveBeenCalled();
  });

  it("rejects with an Error instance for non-Error rejection reasons", async () => {
    await expect(getRequestHandler().rejected("plain string error")).rejects.toThrow(
      '"plain string error"',
    );
  });

  it("rejects with the original Error instance when already an Error", async () => {
    const err = new Error("already an error");
    await expect(getRequestHandler().rejected(err)).rejects.toBe(err);
  });
});

describe("axiosClient response interceptor", () => {
  const originalLocation = globalThis.location;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { href: "http://localhost/current-page" },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  it("passes through successful responses unchanged", () => {
    const response = { data: {} } as AxiosResponse;
    expect(getResponseHandler().fulfilled(response)).toBe(response);
  });

  it("redirects to login on 401 response", async () => {
    const error = { response: { status: 401 }, config: { url: "/v1/orders" } };
    await expect(getResponseHandler().rejected(error)).rejects.toThrow();
    expect(globalThis.location.href).toContain("/auth/login?redirect_uri=");
  });

  it("redirects to logout on 403 for /auth/me", async () => {
    const error = { response: { status: 403 }, config: { url: "/v1/auth/me" } };
    await expect(getResponseHandler().rejected(error)).rejects.toThrow();
    expect(globalThis.location.href).toContain("/v1/auth/logout");
  });

  it("logs but does not redirect on 403 for other paths", async () => {
    const error = { response: { status: 403 }, config: { url: "/v1/orders" } };
    await expect(getResponseHandler().rejected(error)).rejects.toThrow();
    expect(globalThis.location.href).toBe("http://localhost/current-page");
  });

  it("rejects with an Error instance for non-Error rejection reasons", async () => {
    await expect(getResponseHandler().rejected("plain error")).rejects.toThrow('"plain error"');
  });

  it("rejects with the original Error instance when already an Error", async () => {
    const err = new Error("boom");
    await expect(getResponseHandler().rejected(err)).rejects.toBe(err);
  });
});
