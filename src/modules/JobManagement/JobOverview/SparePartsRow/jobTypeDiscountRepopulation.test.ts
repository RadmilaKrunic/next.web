import { describe, it, expect } from "vitest";
import { resolveDiscountOnJobTypeChange } from "./jobTypeDiscountRepopulation";

describe("resolveDiscountOnJobTypeChange", () => {
  describe("rule 1: entering CHARGEABLE", () => {
    it.each(["LA", "FR", "PC"])(
      "protected position %s: always 0, never reads siblings — even if siblings have a discount",
      (position) => {
        expect(resolveDiscountOnJobTypeChange("WARRANTY", "CHARGEABLE", position, [25])).toBe(0);
        expect(
          resolveDiscountOnJobTypeChange("COMMERCIAL_GOODWILL", "CHARGEABLE", position, [25]),
        ).toBe(0);
      },
    );

    it.each(["PN", "SP", "AC"])(
      "material position %s: reads discount from a CHARGEABLE sibling if one exists",
      (position) => {
        expect(resolveDiscountOnJobTypeChange("WARRANTY", "CHARGEABLE", position, [25])).toBe(25);
      },
    );

    it.each(["PN", "SP", "AC"])(
      "material position %s: 0 when there is no CHARGEABLE sibling",
      (position) => {
        expect(resolveDiscountOnJobTypeChange("WARRANTY", "CHARGEABLE", position, [])).toBe(0);
      },
    );

    it("takes the first CHARGEABLE sibling when multiple exist", () => {
      expect(resolveDiscountOnJobTypeChange("WARRANTY", "CHARGEABLE", "SP", [25, 10])).toBe(25);
    });

    it("applies regardless of previous jobType, including from COMMERCIAL_GOODWILL", () => {
      expect(resolveDiscountOnJobTypeChange("COMMERCIAL_GOODWILL", "CHARGEABLE", "SP", [30])).toBe(
        30,
      );
    });

    it("is case-insensitive", () => {
      expect(resolveDiscountOnJobTypeChange("warranty", "chargeable", "sp", [25])).toBe(25);
    });
  });

  describe("rule 2: leaving CHARGEABLE", () => {
    it.each(["LA", "FR", "PC", "PN", "SP", "AC"])(
      "resets to 0 on %s regardless of destination jobType",
      (position) => {
        expect(resolveDiscountOnJobTypeChange("CHARGEABLE", "WARRANTY", position, [])).toBe(0);
        expect(
          resolveDiscountOnJobTypeChange("CHARGEABLE", "COMMERCIAL_GOODWILL", position, []),
        ).toBe(0);
        expect(resolveDiscountOnJobTypeChange("CHARGEABLE", "SERVICE_OFFERING", position, [])).toBe(
          0,
        );
        // Previously a gap: SPECIAL_CONTRACT wasn't in the reset-trigger set.
        expect(resolveDiscountOnJobTypeChange("CHARGEABLE", "SPECIAL_CONTRACT", position, [])).toBe(
          0,
        );
      },
    );
  });

  describe("rule 3: leaving COMMERCIAL_GOODWILL for anything except CHARGEABLE", () => {
    it.each(["LA", "FR", "PC", "PN", "SP", "AC"])("resets to 0 on %s", (position) => {
      expect(resolveDiscountOnJobTypeChange("COMMERCIAL_GOODWILL", "WARRANTY", position, [])).toBe(
        0,
      );
      expect(
        resolveDiscountOnJobTypeChange("COMMERCIAL_GOODWILL", "SERVICE_OFFERING", position, []),
      ).toBe(0);
      // Previously a gap: SPECIAL_CONTRACT wasn't in the reset-trigger set.
      expect(
        resolveDiscountOnJobTypeChange("COMMERCIAL_GOODWILL", "SPECIAL_CONTRACT", position, []),
      ).toBe(0);
    });

    it("does NOT apply when destination is CHARGEABLE — rule 1 handles that instead", () => {
      // COMMERCIAL_GOODWILL -> CHARGEABLE on a material position reads from siblings,
      // it does not unconditionally reset to 0.
      expect(resolveDiscountOnJobTypeChange("COMMERCIAL_GOODWILL", "CHARGEABLE", "SP", [40])).toBe(
        40,
      );
    });
  });

  describe("no rule applies: transitions between two non-target jobTypes", () => {
    it.each(["LA", "SP"])(
      "leaves the discount field untouched (null) for WARRANTY -> SERVICE_OFFERING on %s",
      (position) => {
        expect(
          resolveDiscountOnJobTypeChange("WARRANTY", "SERVICE_OFFERING", position, []),
        ).toBeNull();
      },
    );

    it("leaves the discount field untouched for SERVICE_OFFERING -> SPECIAL_CONTRACT", () => {
      expect(
        resolveDiscountOnJobTypeChange("SERVICE_OFFERING", "SPECIAL_CONTRACT", "SP", []),
      ).toBeNull();
    });

    it("leaves the discount field untouched for SPECIAL_CONTRACT -> WARRANTY", () => {
      expect(resolveDiscountOnJobTypeChange("SPECIAL_CONTRACT", "WARRANTY", "LA", [])).toBeNull();
    });
  });
});
