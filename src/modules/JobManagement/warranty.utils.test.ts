import { describe, expect, it } from "vitest";

import {
  buildWarrantyInfoContent,
  formatWarrantyDate,
  getWarrantyRecommendationText,
  getWarrantyUnavailableMessage,
} from "./warranty.utils";

const t = (key: string, options?: Record<string, unknown>) => {
  if (key === "warrantyProServiceAvailable") {
    return `PRO Service is available: ${typeof options?.type === "string" ? options.type : ""}`;
  }

  if (key === "INDIVIDUAL_PRO") {
    return "Individual pro";
  }

  if (key === "individualPro") {
    return "Individual pro";
  }

  return key;
};

describe("getWarrantyRecommendationText", () => {
  it("builds recommendation for known pro service types", () => {
    expect(getWarrantyRecommendationText("INDIVIDUAL_PRO", t)).toBe(
      "PRO Service is available: Individual pro",
    );
  });

  it("trims known values before mapping", () => {
    expect(getWarrantyRecommendationText(" individualPro ", t)).toBe(
      "PRO Service is available: Individual pro",
    );
  });

  it("hides recommendation for unknown backend values", () => {
    expect(getWarrantyRecommendationText("SOME_NEW_API_VALUE", t)).toBeUndefined();
  });
});

describe("getWarrantyUnavailableMessage", () => {
  it("maps known reason keys to translated messages", () => {
    expect(getWarrantyUnavailableMessage("UNKNOWN_SERIAL_NUMBER", t)).toBe(
      "warrantyBlockedUnknownSerialNumber",
    );
  });

  it("maps WARRANTY_EXPIRED to its translated message", () => {
    expect(getWarrantyUnavailableMessage("WARRANTY_EXPIRED", t)).toBe("warrantyBlockedExpired");
  });

  it("maps ALLOWED_REPAIR_COUNT_EXCEEDED to its translated message", () => {
    expect(getWarrantyUnavailableMessage("ALLOWED_REPAIR_COUNT_EXCEEDED", t)).toBe(
      "warrantyBlockedRepairCountExceeded",
    );
  });

  it("falls back to generic message for unknown backend values", () => {
    expect(getWarrantyUnavailableMessage("<img src=x onerror=alert(1)>", t)).toBe(
      "warrantyBlockedGeneric",
    );
  });

  it("falls back to generic message for null", () => {
    expect(getWarrantyUnavailableMessage(null, t)).toBe("warrantyBlockedGeneric");
  });

  it("falls back to generic message for undefined", () => {
    expect(getWarrantyUnavailableMessage(undefined, t)).toBe("warrantyBlockedGeneric");
  });

  it("falls back to generic message for empty values", () => {
    expect(getWarrantyUnavailableMessage("   ", t)).toBe("warrantyBlockedGeneric");
  });
});

describe("formatWarrantyDate", () => {
  it("returns undefined for empty values", () => {
    expect(formatWarrantyDate(null)).toBeUndefined();
    expect(formatWarrantyDate("")).toBeUndefined();
  });

  it("returns undefined for invalid date values", () => {
    expect(formatWarrantyDate("not-a-date")).toBeUndefined();
  });

  it("formats valid date strings", () => {
    expect(formatWarrantyDate("2024-05-10")).toBe("10 May 2024");
  });
});

describe("buildWarrantyInfoContent", () => {
  it("returns null when evaluationStatus is not INELIGIBLE", () => {
    const response = {
      evaluationStatus: "ELIGIBLE",
      reasonKey: null,
      usedWarrantyRepairCount: 0,
      allowedWarrantyRepairCount: 0,
    };
    expect(buildWarrantyInfoContent(response as never, t, formatWarrantyDate)).toBeNull();
  });

  it("returns null when evaluationStatus is SKIPPED", () => {
    const response = {
      evaluationStatus: "SKIPPED",
      reasonKey: null,
      usedWarrantyRepairCount: 0,
      allowedWarrantyRepairCount: 0,
    };
    expect(buildWarrantyInfoContent(response as never, t, formatWarrantyDate)).toBeNull();
  });

  it("does not throw when validityExpirationDate is invalid", () => {
    const response = {
      evaluationStatus: "INELIGIBLE",
      reasonKey: "WARRANTY_EXPIRED",
      validityExpirationDate: "not-a-date",
      usedWarrantyRepairCount: 0,
      allowedWarrantyRepairCount: 0,
    };

    const result = buildWarrantyInfoContent(response as never, t, formatWarrantyDate);

    expect(result).toEqual(
      expect.objectContaining({
        fallbackMessage: "warrantyBlockedExpired",
        validityExpirationDate: "",
      }),
    );
  });

  it("builds WARRANTY_EXPIRED content with valid expiration date", () => {
    const response = {
      evaluationStatus: "INELIGIBLE",
      reasonKey: "WARRANTY_EXPIRED",
      validityExpirationDate: "2023-06-15",
      usedWarrantyRepairCount: 0,
      allowedWarrantyRepairCount: 0,
    };

    const result = buildWarrantyInfoContent(response as never, t, formatWarrantyDate);

    expect(result).toEqual(
      expect.objectContaining({
        reasonKey: "WARRANTY_EXPIRED",
        fallbackMessage: "warrantyBlockedExpired",
        validityExpirationDate: "15 Jun 2023",
        usedWarrantyRepairCount: 0,
        allowedWarrantyRepairCount: 0,
      }),
    );
  });

  it("builds ALLOWED_REPAIR_COUNT_EXCEEDED content with repair counts", () => {
    const response = {
      evaluationStatus: "INELIGIBLE",
      reasonKey: "ALLOWED_REPAIR_COUNT_EXCEEDED",
      usedWarrantyRepairCount: 3,
      allowedWarrantyRepairCount: 2,
    };

    const result = buildWarrantyInfoContent(response as never, t, formatWarrantyDate);

    expect(result).toEqual(
      expect.objectContaining({
        reasonKey: "ALLOWED_REPAIR_COUNT_EXCEEDED",
        fallbackMessage: "warrantyBlockedRepairCountExceeded",
        validityExpirationDate: "",
        usedWarrantyRepairCount: 3,
        allowedWarrantyRepairCount: 2,
      }),
    );
  });

  it("builds fallback content for an unknown reason key", () => {
    const response = {
      evaluationStatus: "INELIGIBLE",
      reasonKey: "SOME_UNKNOWN_KEY",
      usedWarrantyRepairCount: 1,
      allowedWarrantyRepairCount: 5,
    };

    const result = buildWarrantyInfoContent(response as never, t, formatWarrantyDate);

    expect(result).toEqual(
      expect.objectContaining({
        reasonKey: "SOME_UNKNOWN_KEY",
        fallbackMessage: "warrantyBlockedGeneric",
        validityExpirationDate: "",
        usedWarrantyRepairCount: 1,
        allowedWarrantyRepairCount: 5,
      }),
    );
  });

  it("builds fallback content when reasonKey is null", () => {
    const response = {
      evaluationStatus: "INELIGIBLE",
      reasonKey: null,
      usedWarrantyRepairCount: 0,
      allowedWarrantyRepairCount: 0,
    };

    const result = buildWarrantyInfoContent(response as never, t, formatWarrantyDate);

    expect(result).toEqual(
      expect.objectContaining({
        reasonKey: undefined,
        fallbackMessage: "warrantyBlockedGeneric",
      }),
    );
  });

  it("includes proServiceType recommendation when present", () => {
    const response = {
      evaluationStatus: "INELIGIBLE",
      reasonKey: "WARRANTY_EXPIRED",
      validityExpirationDate: "2023-01-01",
      usedWarrantyRepairCount: 0,
      allowedWarrantyRepairCount: 0,
      proServiceType: "INDIVIDUAL_PRO",
    };

    const result = buildWarrantyInfoContent(response as never, t, formatWarrantyDate);

    expect(result?.recommendation).toBe("PRO Service is available: Individual pro");
  });
});
