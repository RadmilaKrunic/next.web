import { describe, it, expect, vi } from "vitest";
import { getApiErrorMessage } from "./getApiErrorMessage";

const t = vi.fn((key: string) => {
  if (key === "errorDetail") return "Translated detail";
  if (key === "genericError") return "Generic Error";
  return key; // returns key unchanged for unknown keys
});

describe("getApiErrorMessage", () => {
  it("returns fallback when no response data", () => {
    const result = getApiErrorMessage(new Error("fail"), t as never, "genericError");
    expect(result).toBe("Generic Error");
  });

  it("returns fallback when no detail in body", () => {
    const error = { response: { data: {} } };
    const result = getApiErrorMessage(error, t as never, "genericError");
    expect(result).toBe("Generic Error");
  });

  it("returns translated detail when translation differs from key", () => {
    const error = { response: { data: { detail: "errorDetail" } } };
    const result = getApiErrorMessage(error, t as never, "genericError");
    expect(result).toBe("Translated detail");
  });

  it("returns fallback when translation equals detail key (untranslated)", () => {
    const error = { response: { data: { detail: "unknownKey" } } };
    const result = getApiErrorMessage(error, t as never, "genericError");
    expect(result).toBe("Generic Error");
  });

  it("passes interpolation params to translation", () => {
    const error = { response: { data: { detail: "errorDetail", params: { name: "Bosch" } } } };
    getApiErrorMessage(error, t as never, "genericError");
    expect(t).toHaveBeenCalledWith("errorDetail", { name: "Bosch" });
  });

  it("joins array params with comma", () => {
    const error = { response: { data: { detail: "errorDetail", params: { items: ["a", "b"] } } } };
    getApiErrorMessage(error, t as never, "genericError");
    expect(t).toHaveBeenCalledWith("errorDetail", { items: "a, b" });
  });
});
