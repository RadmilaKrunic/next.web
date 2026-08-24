import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — only Formik is mocked. calculatePrices/roundToTwo run for real
// (the actual utils/priceCalculator implementation, wrapped in a vi.fn so
// call args can still be asserted), so assertions below check exact,
// real business-logic output rather than a sentinel value.
// ---------------------------------------------------------------------------

const mockSetFieldValue = vi.fn<(name: string, value: unknown) => Promise<void>>(() =>
  Promise.resolve(),
);
let mockValues: Record<string, unknown> = {};

vi.mock("formik", () => ({
  useFormikContext: () => ({
    values: mockValues,
    setFieldValue: mockSetFieldValue,
  }),
}));

vi.mock("../../../../hooks/useDebouncedValue", () => ({
  useDebouncedValue: (value: unknown) => value,
}));

vi.mock("../../../../utils/priceCalculator", async () => {
  const actual = await vi.importActual<typeof import("../../../../utils/priceCalculator")>(
    "../../../../utils/priceCalculator",
  );
  return {
    ...actual,
    calculatePrices: vi.fn(actual.calculatePrices),
  };
});

import { calculatePrices } from "../../../../utils/priceCalculator";
import { useSparePartPriceCalculation } from "./useSparePartPriceCalculation";

const calculatePricesMock = vi.mocked(calculatePrices);

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Populated, internally-consistent baseline (steady state, no pending recalculation). */
function populatedValues(overrides: Record<string, unknown> = {}) {
  return {
    quantity: 2,
    unitPrice: 50,
    netAmount: 100,
    tax: 19,
    taxAmount: 19,
    grossAmount: 119,
    discount: 0,
    discountHidden: 0,
    totalAmount: 119,
    suggestedNetPrice: 100,
    ...overrides,
  };
}

function zeroValues(overrides: Record<string, unknown> = {}) {
  return {
    quantity: 0,
    unitPrice: 0,
    netAmount: 0,
    tax: 0,
    taxAmount: 0,
    grossAmount: 0,
    discount: 0,
    discountHidden: 0,
    totalAmount: 0,
    suggestedNetPrice: 0,
    ...overrides,
  };
}

function makeFieldNames(overrides: Record<string, unknown> = {}) {
  return {
    quantity: "quantity",
    unitPrice: "unitPrice",
    netAmount: "netAmount",
    tax: "tax",
    grossAmount: "grossAmount",
    discount: "discount",
    discountHidden: "discountHidden",
    taxAmount: "taxAmount",
    totalAmount: "totalAmount",
    suggestedNetPrice: "suggestedNetPrice",
    onUserEdit: vi.fn(),
    ...overrides,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mockSetFieldValue.mockClear();
  calculatePricesMock.mockClear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSparePartPriceCalculation", () => {
  describe("steady state", () => {
    it("does not recalculate or write fields when nothing has changed", async () => {
      mockValues = populatedValues();
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();
      rerender(fieldNames);
      await flush();

      expect(calculatePricesMock).not.toHaveBeenCalled();
      expect(mockSetFieldValue).not.toHaveBeenCalled();
      expect(fieldNames.onUserEdit).not.toHaveBeenCalled();
    });
  });

  describe("user-driven field changes (GROSS_PRICE mode)", () => {
    it("recalculates all core fields when quantity changes (2 -> 3)", async () => {
      mockValues = populatedValues();
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, quantity: 3 };
      rerender(fieldNames);
      await flush();

      expect(calculatePricesMock).toHaveBeenCalledTimes(1);
      const [, changedField, changedValue, discountBase] = calculatePricesMock.mock.calls[0];
      expect(changedField).toBe("quantity");
      expect(changedValue).toBe(3);
      expect(discountBase).toBe("GROSS_PRICE");

      expect(fieldNames.onUserEdit).toHaveBeenCalledTimes(1);
      // Real calculatePrices output for qty 3 * unitPrice 50, 19% tax, 0% discount
      expect(mockSetFieldValue).toHaveBeenCalledWith("quantity", 3);
      expect(mockSetFieldValue).toHaveBeenCalledWith("unitPrice", 50);
      expect(mockSetFieldValue).toHaveBeenCalledWith("netAmount", 150);
      expect(mockSetFieldValue).toHaveBeenCalledWith("suggestedNetPrice", 150);
      expect(mockSetFieldValue).toHaveBeenCalledWith("tax", 19);
      expect(mockSetFieldValue).toHaveBeenCalledWith("grossAmount", 178.5);
      expect(mockSetFieldValue).toHaveBeenCalledWith("discount", 0);
      expect(mockSetFieldValue).toHaveBeenCalledWith("taxAmount", 28.5);
      expect(mockSetFieldValue).toHaveBeenCalledWith("totalAmount", 178.5);
    });

    it("recalculates all core fields when unitPrice changes (50 -> 80)", async () => {
      mockValues = populatedValues();
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, unitPrice: 80 };
      rerender(fieldNames);
      await flush();

      const [, changedField, changedValue] = calculatePricesMock.mock.calls[0];
      expect(changedField).toBe("unitPrice");
      expect(changedValue).toBe(80);

      expect(mockSetFieldValue).toHaveBeenCalledWith("netAmount", 160);
      expect(mockSetFieldValue).toHaveBeenCalledWith("suggestedNetPrice", 160);
      expect(mockSetFieldValue).toHaveBeenCalledWith("grossAmount", 190.4);
      expect(mockSetFieldValue).toHaveBeenCalledWith("taxAmount", 30.4);
      expect(mockSetFieldValue).toHaveBeenCalledWith("totalAmount", 190.4);
    });

    it("uses the prev-state snapshot as calculation inputs, driven off discount", async () => {
      mockValues = populatedValues();
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      // discount is what the hook actually reads for "discount" (rawDiscount)
      mockValues = { ...mockValues, discount: 5 };
      rerender(fieldNames);
      await flush();

      const [inputs, changedField, changedValue] = calculatePricesMock.mock.calls[0];
      expect(changedField).toBe("discountPercent");
      expect(changedValue).toBe(5);
      expect((inputs as { unitPrice: number }).unitPrice).toBe(50); // taken from prev, not cur

      expect(mockSetFieldValue).toHaveBeenCalledWith("discount", 5);
      expect(mockSetFieldValue).toHaveBeenCalledWith("totalAmount", 113.05); // 119 - 5% of 119
    });

    it("does not call onUserEdit while isValidating is true, but still recalculates", async () => {
      mockValues = populatedValues();
      const fieldNames = makeFieldNames({ isValidating: true });
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, quantity: 4 };
      rerender(fieldNames);
      await flush();

      expect(fieldNames.onUserEdit).not.toHaveBeenCalled();
      expect(calculatePricesMock).toHaveBeenCalledTimes(1);
      expect(mockSetFieldValue).toHaveBeenCalledWith("totalAmount", 238);
    });
  });

  describe("guard: isResyncingRef", () => {
    it("skips calculation entirely while an API resync is in progress", async () => {
      mockValues = populatedValues();
      const fieldNames = makeFieldNames({ isResyncingRef: { current: true } });
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, quantity: 9 };
      rerender(fieldNames);
      await flush();

      expect(calculatePricesMock).not.toHaveBeenCalled();
      expect(mockSetFieldValue).not.toHaveBeenCalled();
      expect(fieldNames.onUserEdit).not.toHaveBeenCalled();
    });
  });

  describe("guard: unitPrice remains zero", () => {
    it("skips calculation when both prev and current unitPrice are zero", async () => {
      mockValues = zeroValues({ quantity: 1 }); // not all-zero, so no initial-recalc path
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, quantity: 2 };
      rerender(fieldNames);
      await flush();

      expect(calculatePricesMock).not.toHaveBeenCalled();
      expect(mockSetFieldValue).not.toHaveBeenCalled();
    });
  });

  describe("guard: empty-string field edits", () => {
    it("skips calculation when the changed field's raw value is an empty string", async () => {
      mockValues = populatedValues();
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, unitPrice: "" };
      rerender(fieldNames);
      await flush();

      expect(calculatePricesMock).not.toHaveBeenCalled();
      expect(mockSetFieldValue).not.toHaveBeenCalled();

      // A subsequent real change should still work afterwards (ref wasn't left corrupted)
      mockValues = { ...mockValues, unitPrice: 60 };
      rerender(fieldNames);
      await flush();
      expect(calculatePricesMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("clamping", () => {
    it("clamps a negative changed value to zero before calling calculatePrices", async () => {
      mockValues = populatedValues();
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, quantity: -5 };
      rerender(fieldNames);
      await flush();

      const [, , changedValue] = calculatePricesMock.mock.calls[0];
      expect(changedValue).toBe(0);
      expect(mockSetFieldValue).toHaveBeenCalledWith("quantity", 0);
      expect(mockSetFieldValue).toHaveBeenCalledWith("totalAmount", 0);
    });

    it("clamps totalAmount to prev grossAmount when discountBase is not NET_PRICE", async () => {
      mockValues = populatedValues(); // prev.grossAmount = 119
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, totalAmount: 500 };
      rerender(fieldNames);
      await flush();

      const [, changedField, changedValue] = calculatePricesMock.mock.calls[0];
      expect(changedField).toBe("totalAmount");
      expect(changedValue).toBe(119); // clamped to prev grossAmount, not 500
      expect(mockSetFieldValue).toHaveBeenCalledWith("totalAmount", 119);
    });

    it("does not clamp totalAmount when discountBase is NET_PRICE (passes raw 500 through)", async () => {
      mockValues = populatedValues();
      const fieldNames = makeFieldNames({ discountBase: "NET_PRICE" });
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, totalAmount: 500 };
      rerender(fieldNames);
      await flush();

      const [, , changedValue] = calculatePricesMock.mock.calls[0];
      // The hook itself does NOT clamp here (clamp only applies outside NET_PRICE).
      // calculatePrices' own internal guard then rejects the out-of-range value.
      expect(changedValue).toBe(500);
    });

    it("clamps netAmount to prev suggestedNetPrice when discountBase is NET_PRICE", async () => {
      mockValues = populatedValues(); // prev.suggestedNetPrice = 100
      const fieldNames = makeFieldNames({ discountBase: "NET_PRICE" });
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, netAmount: 300 };
      rerender(fieldNames);
      await flush();

      const [, changedField, changedValue] = calculatePricesMock.mock.calls[0];
      expect(changedField).toBe("netAmount");
      expect(changedValue).toBe(100); // clamped to prev suggestedNetPrice, not 300
      expect(mockSetFieldValue).toHaveBeenCalledWith("totalAmount", 119);
    });
  });

  describe("initial / stale recalculation from a zero baseline", () => {
    it("triggers an initial recalculation when unit price arrives with zero gross/total", async () => {
      mockValues = zeroValues();
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = {
        ...zeroValues(),
        unitPrice: 40,
        quantity: 2,
        tax: 19,
        grossAmount: 0,
        totalAmount: 0,
      };
      rerender(fieldNames);
      await flush();

      expect(calculatePricesMock).toHaveBeenCalledTimes(1);
      const [inputs, changedField] = calculatePricesMock.mock.calls[0];
      expect(changedField).toBe("unitPrice");
      // initial recalculation uses CURRENT values, not prev
      expect((inputs as { unitPrice: number }).unitPrice).toBe(40);
      expect((inputs as { quantity: number }).quantity).toBe(2);
      // onUserEdit must NOT fire for a system-driven initial recalculation
      expect(fieldNames.onUserEdit).not.toHaveBeenCalled();

      expect(mockSetFieldValue).toHaveBeenCalledWith("netAmount", 80);
      expect(mockSetFieldValue).toHaveBeenCalledWith("grossAmount", 95.2);
      expect(mockSetFieldValue).toHaveBeenCalledWith("totalAmount", 95.2);
    });

    it("triggers a stale recalculation when suggestedNetPrice no longer matches qty * unitPrice", async () => {
      mockValues = zeroValues();
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = {
        ...zeroValues(),
        unitPrice: 40,
        quantity: 2,
        tax: 19,
        grossAmount: 95.2, // already computed
        totalAmount: 95.2,
        suggestedNetPrice: 999, // stale / mismatched
      };
      rerender(fieldNames);
      await flush();

      expect(calculatePricesMock).toHaveBeenCalledTimes(1);
      const [, changedField] = calculatePricesMock.mock.calls[0];
      expect(changedField).toBe("unitPrice");
      expect(fieldNames.onUserEdit).not.toHaveBeenCalled();
    });

    it("skips when coming from zero but required fields are incomplete", async () => {
      mockValues = zeroValues();
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      // unitPrice present but quantity is still zero: neither initial nor stale
      // recalculation criteria are satisfied.
      mockValues = { ...zeroValues(), unitPrice: 40 };
      rerender(fieldNames);
      await flush();

      expect(calculatePricesMock).not.toHaveBeenCalled();
      expect(mockSetFieldValue).not.toHaveBeenCalled();
    });
  });

  describe("optional sibling / hidden fields", () => {
    it("writes discountSibling, discountHidden and discountAmountHidden when configured", async () => {
      // Mock document.activeElement to ensure no field is focused during the test
      const mockActiveElement = { getAttribute: vi.fn(() => null) };
      Object.defineProperty(document, "activeElement", {
        configurable: true,
        get: () => mockActiveElement,
      });

      mockValues = populatedValues();
      const fieldNames = makeFieldNames({
        discountSibling: "discountSibling",
        discountAmountHidden: "discountAmountHidden",
      });
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, discount: 5 };
      rerender(fieldNames);
      await flush();

      expect(mockSetFieldValue).toHaveBeenCalledWith("discountSibling", 5);
      expect(mockSetFieldValue).toHaveBeenCalledWith("discountHidden", 5);
      expect(mockSetFieldValue).toHaveBeenCalledWith("discountAmountHidden", 5.95); // 5% of 119
    });

    it("does not write optional fields when they are not configured", async () => {
      mockValues = populatedValues();
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, quantity: 3 };
      rerender(fieldNames);
      await flush();

      const writtenFieldNames = mockSetFieldValue.mock.calls.map((call) => call[0]);
      expect(writtenFieldNames).not.toContain("discountSibling");
      expect(writtenFieldNames).not.toContain("discountAmountHidden");
      // discountHidden is always written (mirrors `discount`)
      expect(writtenFieldNames).toContain("discountHidden");
    });
  });

  describe("recalculation guard (isCalculatingRef)", () => {
    it("ignores a value change that fires while a previous calculation is still resolving", async () => {
      let resolveSetField: (() => void) | undefined;
      mockSetFieldValue.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSetField = resolve;
          }),
      );

      mockValues = populatedValues();
      const fieldNames = makeFieldNames();
      const { rerender } = renderHook((props) => useSparePartPriceCalculation(props), {
        initialProps: fieldNames,
      });
      await flush();

      mockValues = { ...mockValues, quantity: 3 };
      rerender(fieldNames);
      await flush();
      expect(calculatePricesMock).toHaveBeenCalledTimes(1);

      // A second change arrives before the first calculation's setFieldValue calls resolve.
      mockValues = { ...mockValues, quantity: 4 };
      rerender(fieldNames);
      await flush();
      expect(calculatePricesMock).toHaveBeenCalledTimes(1); // still 1: guarded out

      // Resolve the pending writes and restore default mock behaviour.
      resolveSetField?.();
      mockSetFieldValue.mockImplementation(() => Promise.resolve());
      await flush();
    });
  });
});
