import { describe, it, expect, vi } from "vitest";
import { getApiErrorMessage } from "./getApiErrorMessage";

const t = vi.fn((key: string) => {
  if (key === "errorDetail") return "Translated detail";
  if (key === "genericError") return "Generic Error";
  if (key === "errorProServiceItemsNotEligible") {
    return "PRO Service is not eligible for: ";
  }
  return key; // returns key unchanged for unknown keys
});

describe("getApiErrorMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("returns dedicated PRO Service message when violated part numbers are provided as an array", () => {
    const error = {
      response: {
        data: {
          detail: "errorDiagnosticProServiceItemsNotEligibleForValidation",
          params: { violatedPartNumbers: ["06010000", "06010001"] },
        },
      },
    };

    const result = getApiErrorMessage(error, t as never, "genericError");

    expect(result).toBe("PRO Service is not eligible for: 06010000, 06010001");
    expect(t).toHaveBeenCalledWith("errorProServiceItemsNotEligible");
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

  it("parses JSON array string params", () => {
    const error = {
      response: {
        data: { detail: "errorDetail", params: { violatedPartNumbers: '["06010000","06010001"]' } },
      },
    };
    getApiErrorMessage(error, t as never, "genericError");
    expect(t).toHaveBeenCalledWith("errorDetail", { violatedPartNumbers: "06010000, 06010001" });
  });

  it("parses simple JSON array string with single element", () => {
    const error = {
      response: { data: { detail: "errorDetail", params: { violatedPartNumbers: "[06010000]" } } },
    };
    getApiErrorMessage(error, t as never, "genericError");
    expect(t).toHaveBeenCalledWith("errorDetail", { violatedPartNumbers: "06010000" });
  });

  it("keeps valid non-array JSON params unchanged", () => {
    const error = {
      response: { data: { detail: "errorDetail", params: { metadata: '{"code":"06010000"}' } } },
    };

    getApiErrorMessage(error, t as never, "genericError");

    expect(t).toHaveBeenCalledWith("errorDetail", { metadata: '{"code":"06010000"}' });
  });
});
