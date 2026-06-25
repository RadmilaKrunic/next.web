import { describe, it, expect } from "vitest";
import {
  calculatePrices,
  distributeGrossToRows,
  resetRowPrices,
  SUMMARY_TYPE_FILTER,
  calculateSummaryTotalAmountDistribution,
  calculateSummaryNetAmountDistribution,
  calculateSummaryDiscountDistribution,
  aggregateRowPrices,
  roundToTwo,
  PriceInputs,
} from "./priceCalculator";
import type Field from "components/generics/Field/GenericField.types";

describe("priceCalculator", () => {
  const baseInputs: PriceInputs = {
    quantity: 10,
    unitPrice: 100,
    taxPercent: 20,
    discountPercent: 10,
    netAmount: 0,
    suggestedNetPrice: 0,
    totalAmount: 0,
    grossAmount: 0,
    taxAmount: 0,
  };

  describe("quantity changes", () => {
    it("should calculate all fields when quantity changes", () => {
      const result = calculatePrices(baseInputs, "quantity", 5);

      expect(result.quantity).toBe(5);
      expect(result.unitPrice).toBe(100);
      expect(result.netAmount).toBe(500);
      expect(result.taxAmount).toBe(100);
      expect(result.grossAmount).toBe(600);
      expect(result.discountAmount).toBe(60);
      expect(result.totalAmount).toBe(540);
    });

    it("should handle zero quantity", () => {
      const result = calculatePrices(baseInputs, "quantity", 0);

      expect(result.quantity).toBe(0);
      expect(result.netAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it("should handle negative quantity by converting to 0", () => {
      const result = calculatePrices(baseInputs, "quantity", -5);

      expect(result.quantity).toBe(0);
      expect(result.netAmount).toBe(0);
    });
  });

  describe("unitPrice changes", () => {
    it("should calculate all fields when unit price changes", () => {
      const result = calculatePrices(baseInputs, "unitPrice", 150);

      expect(result.unitPrice).toBe(150);
      expect(result.netAmount).toBe(1500);
      expect(result.taxAmount).toBe(300);
      expect(result.grossAmount).toBe(1800);
      expect(result.discountAmount).toBe(180);
      expect(result.totalAmount).toBe(1620);
    });

    it("should handle zero unit price", () => {
      const result = calculatePrices(baseInputs, "unitPrice", 0);

      expect(result.unitPrice).toBe(0);
      expect(result.netAmount).toBe(0);
    });

    it("should handle negative unit price by converting to 0", () => {
      const result = calculatePrices(baseInputs, "unitPrice", -50);

      expect(result.unitPrice).toBe(0);
      expect(result.netAmount).toBe(0);
    });
  });

  describe("netAmount changes", () => {
    it("should calculate dependent fields when total net price changes", () => {
      const result = calculatePrices(baseInputs, "netAmount", 500);

      expect(result.netAmount).toBe(500);
      expect(result.taxAmount).toBe(100);
      expect(result.grossAmount).toBe(600);
      expect(result.discountAmount).toBe(60);
      expect(result.totalAmount).toBe(540);
    });

    it("should handle negative total net price by converting to 0", () => {
      const result = calculatePrices(baseInputs, "netAmount", -100);

      expect(result.netAmount).toBe(0);
    });
  });

  describe("taxPercent changes", () => {
    it("should calculate all fields when tax percent changes", () => {
      const result = calculatePrices(baseInputs, "taxPercent", 25);

      expect(result.taxPercent).toBe(25);
      expect(result.netAmount).toBe(1000);
      expect(result.taxAmount).toBe(250);
      expect(result.grossAmount).toBe(1250);
      expect(result.discountAmount).toBe(125);
      expect(result.totalAmount).toBe(1125);
    });

    it("should cap tax percent at 100", () => {
      const result = calculatePrices(baseInputs, "taxPercent", 150);

      expect(result.taxPercent).toBe(100);
      expect(result.taxAmount).toBe(1000);
    });

    it("should handle negative tax percent by converting to 0", () => {
      const result = calculatePrices(baseInputs, "taxPercent", -10);

      expect(result.taxPercent).toBe(0);
      expect(result.taxAmount).toBe(0);
    });
  });

  describe("grossAmount changes", () => {
    it("should calculate dependent fienetAmountross price changes", () => {
      const inputs = { ...baseInputs, suggestedNetPrice: 1000 };
      const result = calculatePrices(inputs, "grossAmount", 1300);

      expect(result.grossAmount).toBe(1300);
      expect(result.taxAmount).toBe(300);
      expect(result.discountAmount).toBe(130);
      expect(result.totalAmount).toBe(1170);
    });

    it("should handle negative gross price by converting to 0", () => {
      const result = calculatePrices(baseInputs, "grossAmount", -500);

      expect(result.grossAmount).toBe(0);
    });
  });

  describe("discountPercent changes", () => {
    it("should calculate all fields when discount percent changes", () => {
      const result = calculatePrices(baseInputs, "discountPercent", 15);

      expect(result.discountPercent).toBe(15);
      expect(result.netAmount).toBe(1000);
      expect(result.grossAmount).toBe(1200);
      expect(result.discountAmount).toBe(180);
      expect(result.totalAmount).toBe(1020);
    });

    it("should allow discount percent above 100 and calculate accordingly", () => {
      const result = calculatePrices(baseInputs, "discountPercent", 150);

      expect(result.discountPercent).toBe(150);
      expect(result.discountAmount).toBe(1800);
      expect(result.totalAmount).toBe(-600);
    });

    it("should clamp negative discount percent to 0", () => {
      const result = calculatePrices(baseInputs, "discountPercent", -5);

      expect(result.discountPercent).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.totalAmount).toBe(result.grossAmount);
    });
  });

  describe("totalAmount changes", () => {
    it("should set final net price when changed", () => {
      const result = calculatePrices(baseInputs, "totalAmount", 950);

      expect(result.totalAmount).toBe(950);
    });

    it("clamps totalAmount to grossAmount when it would produce negative discount", () => {
      // grossAmount with baseInputs (qty=10, unitPrice=100, tax=20%, discount=10%) = 1200
      // entering 1500 > 1200 would give discountPercent = (1200-1500)/1200*100 = -25% → clamp
      const inputs: PriceInputs = { ...baseInputs, grossAmount: 1200 };
      const result = calculatePrices(inputs, "totalAmount", 1500);
      expect(result.discountPercent).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.totalAmount).toBe(1200);
    });

    it("should handle negative final net price by converting to 0", () => {
      const result = calculatePrices(baseInputs, "totalAmount", -100);

      expect(result.totalAmount).toBe(0);
    });

    it("should calculate taxAmount from existing netAmount and taxPercent when totalAmount changes", () => {
      const inputs: PriceInputs = {
        quantity: 10,
        unitPrice: 100,
        taxPercent: 20,
        discountPercent: 10,
        netAmount: 1000,
        suggestedNetPrice: 1000,
        totalAmount: 1080,
        grossAmount: 1200,
        taxAmount: 200,
      };
      const result = calculatePrices(inputs, "totalAmount", 950);

      expect(result.totalAmount).toBe(950);
      expect(result.taxAmount).toBe(200); // 1000 * 20 / 100
      expect(result.netAmount).toBe(1000); // unchanged
      expect(result.grossAmount).toBe(1200); // unchanged
      expect(result.discountPercent).toBe(20.83); // (1200 - 950) / 1200 * 100
    });
  });

  describe("rounding behavior", () => {
    it("should round to 2 decimal places", () => {
      const inputs: PriceInputs = {
        quantity: 3,
        unitPrice: 10.336,
        taxPercent: 19,
        discountPercent: 5,
        netAmount: 0,
        suggestedNetPrice: 0,
        totalAmount: 0,
        grossAmount: 0,
        taxAmount: 0,
      };

      const result = calculatePrices(inputs, "unitPrice", 10.336);

      expect(result.netAmount).toBe(31.01);
      expect(result.taxAmount).toBe(5.89);
      expect(result.grossAmount).toBe(36.9);
      expect(result.discountAmount).toBe(1.85);
      expect(result.totalAmount).toBe(35.05);
    });

    it("should handle values that need rounding", () => {
      const inputs: PriceInputs = {
        quantity: 7,
        unitPrice: 9.99,
        taxPercent: 13,
        discountPercent: 7,
        netAmount: 0,
        suggestedNetPrice: 0,
        totalAmount: 0,
        grossAmount: 0,
        taxAmount: 0,
      };

      const result = calculatePrices(inputs, "quantity", 7);

      expect(result.netAmount).toBe(69.93);
      expect(result.taxAmount).toBe(9.09);
      expect(result.grossAmount).toBe(79.02);
      expect(result.discountAmount).toBe(5.53);
      expect(result.totalAmount).toBe(73.49);
    });
  });

  describe("edge cases", () => {
    it("should handle all zero inputs", () => {
      const inputs: PriceInputs = {
        quantity: 0,
        unitPrice: 0,
        taxPercent: 0,
        discountPercent: 0,
        netAmount: 0,
        suggestedNetPrice: 0,
        totalAmount: 0,
        grossAmount: 0,
        taxAmount: 0,
      };

      const result = calculatePrices(inputs, "quantity", 0);

      expect(result.netAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it("should handle 100% tax and 100% discount", () => {
      const inputs: PriceInputs = {
        quantity: 10,
        unitPrice: 100,
        taxPercent: 100,
        discountPercent: 100,
        netAmount: 0,
        suggestedNetPrice: 0,
        totalAmount: 0,
        grossAmount: 0,
        taxAmount: 0,
      };

      const result = calculatePrices(inputs, "taxPercent", 100);

      expect(result.taxAmount).toBe(1000);
      expect(result.grossAmount).toBe(2000);
      expect(result.discountAmount).toBe(2000);
      expect(result.totalAmount).toBe(0);
    });

    it("should preserve non-changed quantity and unitPrice", () => {
      const result = calculatePrices(baseInputs, "taxPercent", 25);

      expect(result.quantity).toBe(10);
      expect(result.unitPrice).toBe(100);
    });
  });
});

describe("priceCalculator — NET mode", () => {
  // NET_PRICE chain:
  //   suggestedNetPrice = qty × unitPrice
  //   discountAmount    = suggestedNetPrice × discountPercent / 100
  //   netAmount         = suggestedNetPrice − discountAmount  (post-discount net)
  //   taxAmount         = netAmount × taxPercent / 100
  //   grossAmount       = netAmount + taxAmount
  //   totalAmount       = grossAmount  (always equal to grossAmount in NET mode)
  //
  // Base: qty=10, unitPrice=100, tax=20%, discount=10%
  //   → suggestedNetPrice=1000, discountAmount=100, netAmount=900, taxAmount=180, gross=total=1080
  const netBase: PriceInputs = {
    quantity: 10,
    unitPrice: 100,
    taxPercent: 20,
    discountPercent: 10,
    grossAmount: 0,
    suggestedNetPrice: 0,
    totalAmount: 0,
    netAmount: 0,
    taxAmount: 0,
  };

  describe("quantity changes", () => {
    it("calculates correctly when quantity changes", () => {
      const result = calculatePrices(netBase, "quantity", 5, "NET_PRICE");
      // suggestedNetPrice=500, discountAmount=50, netAmount=450, taxAmount=90, gross=total=540
      expect(result.suggestedNetPrice).toBe(500);
      expect(result.discountAmount).toBe(50);
      expect(result.netAmount).toBe(450);
      expect(result.taxAmount).toBe(90);
      expect(result.grossAmount).toBe(540);
      expect(result.totalAmount).toBe(540);
    });

    it("handles zero quantity", () => {
      const result = calculatePrices(netBase, "quantity", 0, "NET_PRICE");
      expect(result.netAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
    });
  });

  describe("unitPrice changes", () => {
    it("calculates correctly when unit price changes", () => {
      const result = calculatePrices(netBase, "unitPrice", 50, "NET_PRICE");
      // suggestedNetPrice=500, discountAmount=50, netAmount=450, taxAmount=90, gross=total=540
      expect(result.suggestedNetPrice).toBe(500);
      expect(result.discountAmount).toBe(50);
      expect(result.netAmount).toBe(450);
      expect(result.taxAmount).toBe(90);
      expect(result.grossAmount).toBe(540);
      expect(result.totalAmount).toBe(540);
    });
  });

  describe("discountPercent changes", () => {
    it("applies discount on suggestedNetPrice, taxes on post-discount netAmount", () => {
      const result = calculatePrices(netBase, "discountPercent", 20, "NET_PRICE");
      // suggestedNetPrice=1000, discountAmount=200, netAmount=800, taxAmount=160, gross=total=960
      expect(result.discountAmount).toBe(200);
      expect(result.netAmount).toBe(800);
      expect(result.taxAmount).toBe(160);
      expect(result.grossAmount).toBe(960);
      expect(result.totalAmount).toBe(960);
    });

    it("handles zero discount", () => {
      const result = calculatePrices(netBase, "discountPercent", 0, "NET_PRICE");
      // no discount → netAmount = suggestedNetPrice = 1000, taxAmount=200, gross=total=1200
      expect(result.discountAmount).toBe(0);
      expect(result.netAmount).toBe(1000);
      expect(result.taxAmount).toBe(200);
      expect(result.grossAmount).toBe(1200);
      expect(result.totalAmount).toBe(1200);
    });

    it("handles 100% discount — netAmount and grossAmount become 0, suggestedNetPrice stays positive", () => {
      const result = calculatePrices(netBase, "discountPercent", 100, "NET_PRICE");
      // suggestedNetPrice=1000, discountAmount=1000, netAmount=0, taxAmount=0, gross=total=0
      expect(result.suggestedNetPrice).toBe(1000);
      expect(result.discountPercent).toBe(100);
      expect(result.discountAmount).toBe(1000);
      expect(result.netAmount).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });

  describe("taxPercent changes", () => {
    it("applies tax on post-discount netAmount", () => {
      const result = calculatePrices(netBase, "taxPercent", 10, "NET_PRICE");
      // suggestedNetPrice=1000, discountAmount=100, netAmount=900, taxAmount=90, gross=total=990
      expect(result.netAmount).toBe(900);
      expect(result.discountAmount).toBe(100);
      expect(result.taxAmount).toBe(90);
      expect(result.grossAmount).toBe(990);
      expect(result.totalAmount).toBe(990);
    });
  });

  describe("netAmount changes", () => {
    it("back-calculates discountPercent from edited netAmount", () => {
      const result = calculatePrices(netBase, "netAmount", 500, "NET_PRICE");
      // suggestedNetPrice = 10×100 = 1000 (fallback from qty×unitPrice)
      // discountAmount = 500, discountPercent = 50%
      // taxAmount = 500×20% = 100, grossAmount = totalAmount = 600
      expect(result.netAmount).toBe(500);
      expect(result.discountAmount).toBe(500);
      expect(result.discountPercent).toBe(50);
      expect(result.taxAmount).toBe(100);
      expect(result.grossAmount).toBe(600);
      expect(result.totalAmount).toBe(600);
    });

    it("clamps netAmount to suggestedNetPrice when it would produce negative discount", () => {
      const result = calculatePrices(netBase, "netAmount", 1200, "NET_PRICE");
      // suggestedNetPrice = 1000; entering 1200 would give discount = -20% → clamp to 0
      expect(result.discountPercent).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.netAmount).toBe(1000);
      expect(result.taxAmount).toBe(200);
      expect(result.grossAmount).toBe(1200);
      expect(result.totalAmount).toBe(1200);
    });

    it("handles zero netAmount", () => {
      const result = calculatePrices(netBase, "netAmount", 0, "NET_PRICE");
      expect(result.netAmount).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
    });
  });

  describe("totalAmount changes (back-calculation)", () => {
    it("back-calculates netAmount from totalAmount (= grossAmount in NET mode)", () => {
      const inputs: PriceInputs = { ...netBase, suggestedNetPrice: 1000, taxPercent: 20 };
      const result = calculatePrices(inputs, "totalAmount", 800, "NET_PRICE");
      // totalAmount = grossAmount = 800
      // netAmount = 800 / 1.2 = 666.67
      // discountAmount = 1000 − 666.67 = 333.33, discountPercent = 33.33%
      // taxAmount = 666.67 × 20% = 133.33
      expect(result.totalAmount).toBe(800);
      expect(result.grossAmount).toBe(800);
      expect(result.netAmount).toBe(666.67);
      expect(result.discountAmount).toBe(333.33);
      expect(result.discountPercent).toBe(33.33);
      expect(result.taxAmount).toBe(133.33);
    });

    it("clamps totalAmount to max valid when it would produce negative discount", () => {
      const inputs: PriceInputs = { ...netBase, suggestedNetPrice: 1000, taxPercent: 20 };
      // max valid totalAmount with 0% discount = 1000 * 1.2 = 1200; entering 1500 → clamp
      const result = calculatePrices(inputs, "totalAmount", 1500, "NET_PRICE");
      expect(result.discountPercent).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.netAmount).toBe(1000);
      expect(result.taxAmount).toBe(200);
      expect(result.grossAmount).toBe(1200);
      expect(result.totalAmount).toBe(1200);
    });

    it("handles zero suggestedNetPrice guard in totalAmount back-calc", () => {
      const inputs: PriceInputs = { ...netBase, suggestedNetPrice: 0, quantity: 0, unitPrice: 0 };
      const result = calculatePrices(inputs, "totalAmount", 0, "NET_PRICE");
      expect(result.discountPercent).toBe(0);
      expect(result.discountAmount).toBe(0);
    });
  });

  describe("grossAmount changes (back-calculation)", () => {
    it("back-calculates netAmount from grossAmount (= totalAmount in NET mode)", () => {
      const inputs: PriceInputs = { ...netBase, suggestedNetPrice: 1000, taxPercent: 20 };
      const result = calculatePrices(inputs, "grossAmount", 960, "NET_PRICE");
      // grossAmount = totalAmount = 960
      // netAmount = 960 / 1.2 = 800
      // taxAmount = 800 × 20% = 160
      // discountAmount = 1000 − 800 = 200, discountPercent = 20%
      expect(result.grossAmount).toBe(960);
      expect(result.totalAmount).toBe(960);
      expect(result.netAmount).toBe(800);
      expect(result.taxAmount).toBe(160);
      expect(result.discountAmount).toBe(200);
      expect(result.discountPercent).toBe(20);
    });
  });
});

// ── roundToTwo ───────────────────────────────────────────────────────────────

describe("roundToTwo", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundToTwo(1.005)).toBe(1.01);
    expect(roundToTwo(1.004)).toBe(1);
  });
  it("leaves exact 2-decimal values unchanged", () => {
    expect(roundToTwo(3.14)).toBe(3.14);
  });
  it("handles zero", () => {
    expect(roundToTwo(0)).toBe(0);
  });
});

// ── resetRowPrices ───────────────────────────────────────────────────────────

describe("resetRowPrices", () => {
  it("calculates from qty and unitPrice with zero discount (GROSS_PRICE)", () => {
    const result = resetRowPrices(5, 100, 20);
    expect(result.quantity).toBe(5);
    expect(result.unitPrice).toBe(100);
    expect(result.suggestedNetPrice).toBe(500);
    expect(result.netAmount).toBe(500);
    expect(result.discountPercent).toBe(0);
    expect(result.grossAmount).toBe(600);
    expect(result.totalAmount).toBe(600);
  });

  it("defaults taxPercent to 0 and mode to GROSS_PRICE", () => {
    const result = resetRowPrices(2, 50);
    expect(result.grossAmount).toBe(100);
    expect(result.taxAmount).toBe(0);
  });

  it("calculates in NET_PRICE mode with zero discount", () => {
    const result = resetRowPrices(2, 100, 10, "NET_PRICE");
    expect(result.suggestedNetPrice).toBe(200);
    expect(result.netAmount).toBe(200);
    expect(result.discountPercent).toBe(0);
  });
});

// ── SUMMARY_TYPE_FILTER ──────────────────────────────────────────────────────

describe("SUMMARY_TYPE_FILTER", () => {
  it("totalSummary returns true for any type", () => {
    expect(SUMMARY_TYPE_FILTER["totalSummary"]("WARRANTY")).toBe(true);
    expect(SUMMARY_TYPE_FILTER["totalSummary"]("anything")).toBe(true);
  });

  it("warranty filter matches only WARRANTY", () => {
    expect(SUMMARY_TYPE_FILTER["warranty"]("WARRANTY")).toBe(true);
    expect(SUMMARY_TYPE_FILTER["warranty"]("CHARGEABLE")).toBe(false);
  });

  it("chargeable filter matches only CHARGEABLE", () => {
    expect(SUMMARY_TYPE_FILTER["chargeable"]("CHARGEABLE")).toBe(true);
    expect(SUMMARY_TYPE_FILTER["chargeable"]("WARRANTY")).toBe(false);
  });

  it("specialContract filter matches only SPECIAL_CONTRACT", () => {
    expect(SUMMARY_TYPE_FILTER["specialContract"]("SPECIAL_CONTRACT")).toBe(true);
    expect(SUMMARY_TYPE_FILTER["specialContract"]("CHARGEABLE")).toBe(false);
  });

  it("commercialGoodwill filter matches only COMMERCIAL_GOODWILL", () => {
    expect(SUMMARY_TYPE_FILTER["commercialGoodwill"]("COMMERCIAL_GOODWILL")).toBe(true);
    expect(SUMMARY_TYPE_FILTER["commercialGoodwill"]("WARRANTY")).toBe(false);
  });

  it("serviceOffering filter matches only SERVICE_OFFERING", () => {
    expect(SUMMARY_TYPE_FILTER["serviceOffering"]("SERVICE_OFFERING")).toBe(true);
    expect(SUMMARY_TYPE_FILTER["serviceOffering"]("WARRANTY")).toBe(false);
  });
});

// ── calculateSummaryTotalAmountDistribution ──────────────────────────────────

describe("calculateSummaryTotalAmountDistribution", () => {
  it("returns discount percent from gross − total", () => {
    // 600 gross, 540 total → discount = (600-540)/600 * 100 = 10%
    expect(calculateSummaryTotalAmountDistribution(540, 600)).toBe(10);
  });

  it("returns 0 when grossAmountSum is 0", () => {
    expect(calculateSummaryTotalAmountDistribution(0, 0)).toBe(0);
  });

  it("returns 0 when gross is negative", () => {
    expect(calculateSummaryTotalAmountDistribution(0, -100)).toBe(0);
  });
});

// ── calculateSummaryNetAmountDistribution ────────────────────────────────────

describe("calculateSummaryNetAmountDistribution", () => {
  it("returns discount percent from suggestedNetPrice − netAmount", () => {
    // 1000 suggested, 800 net → 20%
    expect(calculateSummaryNetAmountDistribution(800, 1000)).toBe(20);
  });

  it("returns 0 when suggestedNetPriceSum is 0", () => {
    expect(calculateSummaryNetAmountDistribution(0, 0)).toBe(0);
  });
});

// ── calculateSummaryDiscountDistribution ─────────────────────────────────────

describe("calculateSummaryDiscountDistribution", () => {
  it("returns target total amount in GROSS_PRICE mode (grossAmountSum × (1 - disc%))", () => {
    // 10% discount on 600 gross → 600 × 0.9 = 540
    expect(calculateSummaryDiscountDistribution(10, 1000, 600, "GROSS_PRICE")).toBe(540);
  });

  it("returns target net amount in NET_PRICE mode (suggestedNetPriceSum × (1 - disc%))", () => {
    // 20% discount on 1000 suggested → 1000 × 0.8 = 800
    expect(calculateSummaryDiscountDistribution(20, 1000, 600, "NET_PRICE")).toBe(800);
  });

  it("defaults to GROSS_PRICE when mode not specified", () => {
    expect(calculateSummaryDiscountDistribution(10, 1000, 600)).toBe(540);
  });

  it("handles 0% discount", () => {
    expect(calculateSummaryDiscountDistribution(0, 1000, 600, "GROSS_PRICE")).toBe(600);
  });

  it("handles 100% discount", () => {
    expect(calculateSummaryDiscountDistribution(100, 1000, 600, "GROSS_PRICE")).toBe(0);
  });
});

// ── aggregateRowPrices ───────────────────────────────────────────────────────

describe("aggregateRowPrices", () => {
  const makeAggField = (subtype: string, name: string, nameStartsWith: string): Field =>
    ({
      name,
      subtype,
      fieldMapping: { nameStartsWith, originalName: name, map: name, parentMap: [], prefixes: [] },
    }) as unknown as Field;

  it("sums price fields across rows in GROSS_PRICE mode", () => {
    const fields: Field[] = [
      makeAggField("diagnosticType", "row0_type", "row0_"),
      makeAggField("diagnosticSuggestedNetPrice", "row0_snp", "row0_"),
      makeAggField("diagnosticNetAmount", "row0_net", "row0_"),
      makeAggField("diagnosticGrossAmount", "row0_gross", "row0_"),
      makeAggField("diagnosticTotalAmount", "row0_total", "row0_"),
      makeAggField("diagnosticTaxAmount", "row0_tax", "row0_"),
    ];
    const values: Record<string, unknown> = {
      row0_type: "CHARGEABLE",
      row0_snp: 500,
      row0_net: 500,
      row0_gross: 600,
      row0_total: 540,
      row0_tax: 100,
    };
    const result = aggregateRowPrices(values, fields, () => true, "GROSS_PRICE");
    expect(result.grossAmount).toBe(600);
    expect(result.netAmount).toBe(500);
    expect(result.totalAmount).toBe(540);
    expect(result.taxAmount).toBe(100);
    // discount = (600-540)/600*100 = 10%
    expect(result.discount).toBe(10);
    expect(result.discountAmount).toBe(60);
  });

  it("returns zero aggregate when no fields match", () => {
    const result = aggregateRowPrices({}, [], undefined, "GROSS_PRICE");
    expect(result.grossAmount).toBe(0);
    expect(result.totalAmount).toBe(0);
    expect(result.discount).toBe(0);
  });

  it("filters rows by typeFilter", () => {
    const fields: Field[] = [
      makeAggField("diagnosticType", "row0_type", "row0_"),
      makeAggField("diagnosticGrossAmount", "row0_gross", "row0_"),
      makeAggField("diagnosticTotalAmount", "row0_total", "row0_"),
      makeAggField("diagnosticNetAmount", "row0_net", "row0_"),
      makeAggField("diagnosticSuggestedNetPrice", "row0_snp", "row0_"),
      makeAggField("diagnosticTaxAmount", "row0_tax", "row0_"),
      makeAggField("diagnosticType", "row1_type", "row1_"),
      makeAggField("diagnosticGrossAmount", "row1_gross", "row1_"),
      makeAggField("diagnosticTotalAmount", "row1_total", "row1_"),
      makeAggField("diagnosticNetAmount", "row1_net", "row1_"),
      makeAggField("diagnosticSuggestedNetPrice", "row1_snp", "row1_"),
      makeAggField("diagnosticTaxAmount", "row1_tax", "row1_"),
    ];
    const values: Record<string, unknown> = {
      row0_type: "WARRANTY",
      row0_gross: 200,
      row0_total: 200,
      row0_net: 200,
      row0_snp: 200,
      row0_tax: 0,
      row1_type: "CHARGEABLE",
      row1_gross: 300,
      row1_total: 300,
      row1_net: 300,
      row1_snp: 300,
      row1_tax: 0,
    };
    const result = aggregateRowPrices(values, fields, (t) => t === "WARRANTY", "GROSS_PRICE");
    expect(result.grossAmount).toBe(200);
    expect(result.netAmount).toBe(200);
  });

  it("calculates discount in NET_PRICE mode", () => {
    const fields: Field[] = [
      makeAggField("diagnosticType", "row0_type", "row0_"),
      makeAggField("diagnosticSuggestedNetPrice", "row0_snp", "row0_"),
      makeAggField("diagnosticNetAmount", "row0_net", "row0_"),
      makeAggField("diagnosticGrossAmount", "row0_gross", "row0_"),
      makeAggField("diagnosticTotalAmount", "row0_total", "row0_"),
      makeAggField("diagnosticTaxAmount", "row0_tax", "row0_"),
    ];
    const values: Record<string, unknown> = {
      row0_type: "CHARGEABLE",
      row0_snp: 1000,
      row0_net: 800,
      row0_gross: 960,
      row0_total: 960,
      row0_tax: 160,
    };
    const result = aggregateRowPrices(values, fields, () => true, "NET_PRICE");
    expect(result.suggestedNetPrice).toBe(1000);
    expect(result.netAmount).toBe(800);
    expect(result.discount).toBe(20);
    expect(result.discountAmount).toBe(200);
  });
});

describe("distributeGrossToRows — position filter", () => {
  const makeField = (subtype: string, name: string, nameStartsWith: string): Field =>
    ({
      name,
      subtype,
      fieldMapping: { nameStartsWith, originalName: name, map: name, parentMap: "", prefixes: [] },
    }) as unknown as Field;

  const makeDiscountField = (name: string, nameStartsWith: string): Field =>
    ({
      name,
      subtype: "diagnosticDiscount",
      dependentFields: [{ fieldName: "discountBase", fieldValue: "GROSS_PRICE" }],
      fieldMapping: { nameStartsWith, originalName: name, map: name, parentMap: "", prefixes: [] },
    }) as unknown as Field;

  it("distributes only to SP/PN/AC rows, excludes LA/FR", () => {
    const fields: Field[] = [
      makeDiscountField("row0_discount", "row0_"),
      makeField("diagnosticType", "row0_type", "row0_"),
      makeField("diagnosticPosition", "row0_position", "row0_"),
      makeDiscountField("row1_discount", "row1_"),
      makeField("diagnosticType", "row1_type", "row1_"),
      makeField("diagnosticPosition", "row1_position", "row1_"),
      makeDiscountField("row2_discount", "row2_"),
      makeField("diagnosticType", "row2_type", "row2_"),
      makeField("diagnosticPosition", "row2_position", "row2_"),
    ];

    const values: Record<string, unknown> = {
      row0_discount: 0,
      row0_type: "CHARGEABLE",
      row0_position: "LA",
      row1_discount: 0,
      row1_type: "CHARGEABLE",
      row1_position: "SP",
      row2_discount: 0,
      row2_type: "CHARGEABLE",
      row2_position: "PN",
    };

    const updates: Record<string, unknown> = {};
    distributeGrossToRows(
      12.34,
      () => true,
      values,
      (f: string, v: unknown) => {
        updates[f] = v;
      },
      fields,
    );

    expect(updates["row0_discount"]).toBeUndefined();
    expect(updates["row1_discount"]).toBe(12.34);
    expect(updates["row2_discount"]).toBe(12.34);
  });

  it("does not distribute when type filter excludes all eligible rows", () => {
    const fields: Field[] = [
      makeDiscountField("row0_discount", "row0_"),
      makeField("diagnosticType", "row0_type", "row0_"),
      makeField("diagnosticPosition", "row0_position", "row0_"),
    ];
    const values: Record<string, unknown> = {
      row0_discount: 0,
      row0_type: "WARRANTY",
      row0_position: "SP",
    };
    const updates: Record<string, unknown> = {};
    distributeGrossToRows(
      15,
      (t: string) => t === "CHARGEABLE",
      values,
      (f: string, v: unknown) => {
        updates[f] = v;
      },
      fields,
    );
    expect(Object.keys(updates)).toHaveLength(0);
  });
});
