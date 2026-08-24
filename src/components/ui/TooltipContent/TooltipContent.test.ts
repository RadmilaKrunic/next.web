import { describe, it, expect, vi } from "vitest";
import {
  bareToolNumberTooltipContent,
  serialNumberTooltipContent,
  purchaseDateMissingContent,
  warrantyInfoContent,
} from "./TooltipContent";

vi.mock("@/assets/baretoolnumber.png", () => ({ default: "baretool.png" }));
vi.mock("@/assets/serialnumber.png", () => ({ default: "serial.png" }));

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key;

describe("bareToolNumberTooltipContent", () => {
  it("returns HTML string containing the bare tool number info key", () => {
    const html = bareToolNumberTooltipContent(t);
    expect(html).toContain("bareToolNumberInfo");
    expect(html).toContain("whereDoIFindTheBareToolNumber");
  });

  it("includes an img tag", () => {
    const html = bareToolNumberTooltipContent(t);
    expect(html).toContain("<img");
  });
});

describe("serialNumberTooltipContent", () => {
  it("returns HTML string containing the serial number info key", () => {
    const html = serialNumberTooltipContent(t);
    expect(html).toContain("serialNumberInfo");
    expect(html).toContain("whereDoIFindTheSerialNumber");
  });

  it("includes an img tag", () => {
    const html = serialNumberTooltipContent(t);
    expect(html).toContain("<img");
  });
});

describe("purchaseDateMissingContent", () => {
  it("renders tooltip HTML containing translated keys", () => {
    const html = purchaseDateMissingContent(t);
    expect(html).toContain("warrantyInformationTitle");
    expect(html).toContain("warrantyWhyNotAvailable");
    expect(html).toContain("purchaseDateNotProvidedTitle");
    expect(html).toContain("purchaseDateNotProvidedReason");
    expect(html).toContain("enterPurchaseDate");
    expect(html).toContain("open-purchase-date-modal");
    expect(html).toContain("warrantyContinueAsChargeable");
  });
});

describe("warrantyInfoContent", () => {
  const basePayload = {
    reasonKey: "",
    fallbackMessage: "",
    validityExpirationDate: "",
    usedWarrantyRepairCount: 0,
    allowedWarrantyRepairCount: 0,
    recommendationText: "",
  };

  it("uses fallbackMessage when reasonKey is unrecognized", () => {
    const html = warrantyInfoContent({ ...basePayload, fallbackMessage: "fallback text" }, t);
    expect(html).toContain("fallback text");
  });

  it("falls back to warrantyBlockedGeneric when fallbackMessage is empty", () => {
    const html = warrantyInfoContent(basePayload, t);
    expect(html).toContain("warrantyBlockedGeneric");
  });

  it("uses WARRANTY_EXPIRED title and message", () => {
    const html = warrantyInfoContent(
      { ...basePayload, reasonKey: "WARRANTY_EXPIRED", validityExpirationDate: "2026-01-01" },
      t,
    );
    expect(html).toContain("warrantyExpiredTitle");
    expect(html).toContain("warrantyExpiredMessage");
    expect(html).toContain("2026-01-01");
  });

  it("uses ALLOWED_REPAIR_COUNT_EXCEEDED title and message", () => {
    const html = warrantyInfoContent(
      {
        ...basePayload,
        reasonKey: "ALLOWED_REPAIR_COUNT_EXCEEDED",
        usedWarrantyRepairCount: 3,
        allowedWarrantyRepairCount: 2,
      },
      t,
    );
    expect(html).toContain("warrantyRepairClaimsUsedTitle");
    expect(html).toContain("warrantyRepairClaimsUsedMessage");
  });

  it("appends recommendationText block when provided", () => {
    const html = warrantyInfoContent({ ...basePayload, recommendationText: "Try this" }, t);
    expect(html).toContain("Try this");
    expect(html).toContain("warranty-tooltip-content__extra");
  });

  it("omits recommendation block when recommendationText is empty", () => {
    const html = warrantyInfoContent(basePayload, t);
    expect(html).not.toContain("warranty-tooltip-content__extra");
  });
});
