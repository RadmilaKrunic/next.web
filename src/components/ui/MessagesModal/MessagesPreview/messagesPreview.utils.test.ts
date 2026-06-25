import { describe, it, expect } from "vitest";
import { getMessageCategory } from "./messagesPreview.utils";

describe("getMessageCategory", () => {
  it("returns 'claim' for CLAIM_OVERALL_DECISION", () => {
    expect(getMessageCategory("CLAIM_OVERALL_DECISION")).toBe("claim");
  });

  it("returns 'claim' for CLAIM_LINE_ITEM", () => {
    expect(getMessageCategory("CLAIM_LINE_ITEM")).toBe("claim");
  });

  it("returns 'claim' for GENERAL_CLAIM", () => {
    expect(getMessageCategory("GENERAL_CLAIM")).toBe("claim");
  });

  it("returns 'job' for unknown type", () => {
    expect(getMessageCategory("SOME_OTHER_TYPE")).toBe("job");
  });

  it("returns 'job' for empty string", () => {
    expect(getMessageCategory("")).toBe("job");
  });
});
