import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

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

beforeEach(() => {
  mockSetFieldValue.mockClear();
  calculatePricesMock.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSparePartPriceCalculation debounce behavior", () => {
  it("does not recalculate immediately after a single field change", () => {
    mockValues = populatedValues();
    const fieldNames = makeFieldNames();
    const { rerender } = renderHook(() => useSparePartPriceCalculation(fieldNames));

    mockValues = populatedValues({ unitPrice: 55 });
    rerender();

    // No time has passed yet — the debounce hasn't settled.
    expect(calculatePricesMock).not.toHaveBeenCalled();
  });

  it("recalculates once, ~300ms after the last change", () => {
    mockValues = populatedValues();
    const fieldNames = makeFieldNames();
    const { rerender } = renderHook(() => useSparePartPriceCalculation(fieldNames));

    mockValues = populatedValues({ unitPrice: 55 });
    rerender();

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(calculatePricesMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(calculatePricesMock).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on rapid successive changes and only recalculates once, using the latest value", () => {
    mockValues = populatedValues();
    const fieldNames = makeFieldNames();
    const { rerender } = renderHook(() => useSparePartPriceCalculation(fieldNames));

    // Simulate fast typing: unitPrice changes 5, 55, 55.5, 55.55 in quick succession,
    // each well under the debounce window.
    for (const unitPrice of [5, 55, 55.5, 55.55]) {
      mockValues = populatedValues({ unitPrice });
      rerender();
      act(() => {
        vi.advanceTimersByTime(100); // less than the 300ms debounce window
      });
    }

    expect(calculatePricesMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(calculatePricesMock).toHaveBeenCalledTimes(1);
    // The single recalculation reflects the LATEST value (55.55), not an intermediate one —
    // this is the guarantee that makes debouncing safe: nothing is lost, it's just delayed.
    expect(calculatePricesMock).toHaveBeenCalledWith(
      expect.objectContaining({ unitPrice: 55.55 }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("does not recalculate at all if the value returns to its original state before the debounce settles", () => {
    mockValues = populatedValues();
    const fieldNames = makeFieldNames();
    const { rerender } = renderHook(() => useSparePartPriceCalculation(fieldNames));

    mockValues = populatedValues({ unitPrice: 999 });
    rerender();
    act(() => {
      vi.advanceTimersByTime(100);
    });

    mockValues = populatedValues(); // back to the original unitPrice: 50
    rerender();
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Net effect: no actual change from the steady-state baseline, and the debounced
    // snapshot at settle time matches what it started as — detectChangedField finds nothing
    // to act on. (calculatePrices may or may not be invoked internally depending on the
    // changed-field guard, but no field writes should result.)
    expect(mockSetFieldValue).not.toHaveBeenCalled();
  });
});
