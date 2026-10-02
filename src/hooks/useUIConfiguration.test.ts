import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import type { HeaderUserData } from "api/services/header/action";
import {
  getAvailableCountryCodes,
  useAvailableUIConfigurations,
  useResourceUIConfiguration,
} from "./useUIConfiguration";

const getUIConfigurationMock = vi.hoisted(() => vi.fn());

vi.mock("api/services/uiConfiguration/action", () => ({
  getUIConfiguration: getUIConfigurationMock,
}));

const makeUser = (overrides: Partial<HeaderUserData> = {}) =>
  ({ countryCode: "DE", availableCountries: [], ...overrides }) as unknown as HeaderUserData;

const configFor = (countryCode: string) => ({ forms: [{ name: `form-${countryCode}` }] });

function createWrapper(user?: HeaderUserData) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (user) {
    queryClient.setQueryData(["user"], user);
  }
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, queryClient };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUIConfigurationMock.mockImplementation((code: string) => Promise.resolve(configFor(code)));
});

describe("getAvailableCountryCodes", () => {
  it("returns an empty array when user is undefined", () => {
    expect(getAvailableCountryCodes(undefined)).toEqual([]);
  });

  it("returns an empty array when user is null", () => {
    expect(getAvailableCountryCodes(null)).toEqual([]);
  });

  it("falls back to the user's own countryCode when availableCountries is missing", () => {
    const user = makeUser({ countryCode: "DE", availableCountries: undefined });

    expect(getAvailableCountryCodes(user)).toEqual(["DE"]);
  });

  it("returns availableCountries when user has no countryCode", () => {
    const user = makeUser({ countryCode: undefined, availableCountries: ["TR", "ZA"] });

    expect(getAvailableCountryCodes(user)).toEqual(["TR", "ZA"]);
  });

  it("merges countryCode with availableCountries without duplicates", () => {
    const user = makeUser({ countryCode: "DE", availableCountries: ["DE", "TR", "ZA", "TR"] });

    expect(getAvailableCountryCodes(user)).toEqual(["DE", "TR", "ZA"]);
  });

  it("ignores empty country codes", () => {
    const user = makeUser({ countryCode: "", availableCountries: ["", "TR"] });

    expect(getAvailableCountryCodes(user)).toEqual(["TR"]);
  });
});

describe("useAvailableUIConfigurations", () => {
  it("does not fetch anything when there is no user", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useAvailableUIConfigurations(undefined), { wrapper });

    expect(result.current).toEqual([]);
    expect(getUIConfigurationMock).not.toHaveBeenCalled();
  });

  it("fetches the configuration for every available country", async () => {
    const { wrapper } = createWrapper();
    const user = makeUser({ countryCode: "DE", availableCountries: ["TR", "ZA"] });

    const { result } = renderHook(() => useAvailableUIConfigurations(user), { wrapper });

    await waitFor(() => expect(result.current.every((q) => q.isSuccess)).toBe(true));

    expect(result.current).toHaveLength(3);
    expect(getUIConfigurationMock).toHaveBeenCalledTimes(3);
    expect(getUIConfigurationMock).toHaveBeenCalledWith("DE");
    expect(getUIConfigurationMock).toHaveBeenCalledWith("TR");
    expect(getUIConfigurationMock).toHaveBeenCalledWith("ZA");
  });

  it("caches results under ['UIConfiguration', countryCode]", async () => {
    const { wrapper, queryClient } = createWrapper();
    const user = makeUser({ countryCode: "DE", availableCountries: ["TR"] });

    const { result } = renderHook(() => useAvailableUIConfigurations(user), { wrapper });

    await waitFor(() => expect(result.current.every((q) => q.isSuccess)).toBe(true));

    expect(queryClient.getQueryData(["UIConfiguration", "DE"])).toEqual(configFor("DE"));
    expect(queryClient.getQueryData(["UIConfiguration", "TR"])).toEqual(configFor("TR"));
  });

  it("does not refetch a country that is already cached (staleTime: Infinity)", async () => {
    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(["UIConfiguration", "DE"], configFor("DE"));
    const user = makeUser({ countryCode: "DE", availableCountries: [] });

    const { result } = renderHook(() => useAvailableUIConfigurations(user), { wrapper });

    await waitFor(() => expect(result.current[0].isSuccess).toBe(true));

    expect(getUIConfigurationMock).not.toHaveBeenCalled();
  });

  it("does not retry failed requests", async () => {
    getUIConfigurationMock.mockRejectedValue(new Error("fail"));
    const { wrapper } = createWrapper();
    const user = makeUser({ countryCode: "DE", availableCountries: [] });

    const { result } = renderHook(() => useAvailableUIConfigurations(user), { wrapper });

    await waitFor(() => expect(result.current[0].isError).toBe(true));

    expect(getUIConfigurationMock).toHaveBeenCalledTimes(1);
  });
});

describe("useResourceUIConfiguration", () => {
  it("uses the resource's country code when provided", async () => {
    const { wrapper } = createWrapper(makeUser({ countryCode: "DE" }));

    const { result } = renderHook(() => useResourceUIConfiguration("ZA"), { wrapper });

    await waitFor(() => expect(result.current.uiConfiguration).toBeDefined());

    expect(getUIConfigurationMock).toHaveBeenCalledWith("ZA");
    expect(getUIConfigurationMock).not.toHaveBeenCalledWith("DE");
    expect(result.current).toEqual({
      uiConfiguration: configFor("ZA"),
      countryCode: "ZA",
      isLoading: false,
      isError: false,
    });
  });

  it("falls back to the user's default country code when resource code is missing", async () => {
    const { wrapper } = createWrapper(makeUser({ countryCode: "DE" }));

    const { result } = renderHook(() => useResourceUIConfiguration(undefined), { wrapper });

    await waitFor(() => expect(result.current.uiConfiguration).toBeDefined());

    expect(getUIConfigurationMock).toHaveBeenCalledWith("DE");
    expect(result.current.countryCode).toBe("DE");
    expect(result.current.uiConfiguration).toEqual(configFor("DE"));
  });

  it("falls back to the user's default country code when resource code is null", async () => {
    const { wrapper } = createWrapper(makeUser({ countryCode: "TR" }));

    const { result } = renderHook(() => useResourceUIConfiguration(null), { wrapper });

    await waitFor(() => expect(result.current.uiConfiguration).toBeDefined());

    expect(result.current.countryCode).toBe("TR");
  });

  it("reports loading while the configuration is being fetched", async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    getUIConfigurationMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { wrapper } = createWrapper(makeUser());

    const { result } = renderHook(() => useResourceUIConfiguration("ZA"), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.uiConfiguration).toBeUndefined();

    resolveRequest(configFor("ZA"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.uiConfiguration).toEqual(configFor("ZA"));
  });

  it("sets isError and does not fetch when no country code can be resolved", () => {
    const { wrapper } = createWrapper(makeUser({ countryCode: undefined }));

    const { result } = renderHook(() => useResourceUIConfiguration(undefined), { wrapper });

    expect(getUIConfigurationMock).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      uiConfiguration: undefined,
      countryCode: undefined,
      isLoading: false,
      isError: true,
    });
  });

  it("sets isError when there is no user and no resource country code", () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useResourceUIConfiguration(), { wrapper });

    expect(getUIConfigurationMock).not.toHaveBeenCalled();
    expect(result.current.isError).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("sets isError when the configuration request fails and does not fall back to another country", async () => {
    getUIConfigurationMock.mockRejectedValue(new Error("not found"));
    const { wrapper } = createWrapper(makeUser({ countryCode: "DE" }));

    const { result } = renderHook(() => useResourceUIConfiguration("ZA"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.uiConfiguration).toBeUndefined();
    expect(result.current.countryCode).toBe("ZA");
    expect(getUIConfigurationMock).toHaveBeenCalledTimes(1);
    expect(getUIConfigurationMock).toHaveBeenCalledWith("ZA");
  });

  it("reuses the configuration prefetched by useAvailableUIConfigurations", async () => {
    const { wrapper, queryClient } = createWrapper(makeUser({ countryCode: "DE" }));
    queryClient.setQueryData(["UIConfiguration", "ZA"], configFor("ZA"));

    const { result } = renderHook(() => useResourceUIConfiguration("ZA"), { wrapper });

    await waitFor(() => expect(result.current.uiConfiguration).toEqual(configFor("ZA")));

    expect(getUIConfigurationMock).not.toHaveBeenCalled();
  });
});
