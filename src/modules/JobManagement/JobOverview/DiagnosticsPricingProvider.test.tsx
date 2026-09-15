import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { Formik, useFormikContext } from "formik";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import type Field from "components/generics/Field/GenericField.types";
import type { DiagnosticPricingResponse } from "api/services/diagnosticPricing/diagnosticPricing.types";
import { DiagnosticsPricingProvider } from "./DiagnosticsPricingProvider";
import { useDiagnosticsPricingContext } from "./DiagnosticsPricingContext";

const mutate = vi.fn();
let capturedOnSuccess: ((data: DiagnosticPricingResponse) => void) | undefined;

vi.mock("api/services/diagnosticPricing/hooks", () => ({
  useDiagnosticPricing: (_jobId: string, onSuccess?: (d: DiagnosticPricingResponse) => void) => {
    capturedOnSuccess = onSuccess;
    return { mutate, isPending: false };
  },
}));

const PREFIX = "diagnosticData_diagnosticsSpareParts#0";

const field = (subtype: string): Field =>
  ({
    name: `${PREFIX}_${subtype}`,
    subtype,
    fieldMapping: { nameStartsWith: PREFIX },
  }) as unknown as Field;

const allFields = [
  field("diagnosticPosition"),
  field("diagnosticQuantity"),
  field("diagnosticUnitPrice"),
  field("diagnosticTotalAmount"),
];

const initialValues = {
  [`${PREFIX}_diagnosticPosition`]: "SP",
  [`${PREFIX}_diagnosticQuantity`]: 1,
  [`${PREFIX}_diagnosticUnitPrice`]: 10,
  [`${PREFIX}_diagnosticTotalAmount`]: 10,
};

function Probe() {
  const { enabled } = useDiagnosticsPricingContext();
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const totalAmount = values[`${PREFIX}_diagnosticTotalAmount`];
  return (
    <div>
      <span data-testid="enabled">{String(enabled)}</span>
      <span data-testid="total">{String(totalAmount)}</span>
      <button type="button" onClick={() => void setFieldValue(`${PREFIX}_diagnosticQuantity`, 3)}>
        change qty
      </button>
      <button type="button" onClick={() => void setFieldValue(`${PREFIX}_diagnosticPosition`, "PN")}>
        change position
      </button>
    </div>
  );
}

const renderProvider = (enabled: boolean) =>
  render(
    <GenericFormContext.Provider
      value={{ allFields } as unknown as React.ContextType<typeof GenericFormContext>}
    >
      <Formik initialValues={initialValues} onSubmit={() => {}}>
        <DiagnosticsPricingProvider
          enabled={enabled}
          jobId="J1"
          actionType="REPAIR"
          jobType="CHARGEABLE"
          areaNameContains="diagnosticsSpareParts"
        >
          <Probe />
        </DiagnosticsPricingProvider>
      </Formik>
    </GenericFormContext.Provider>,
  );

describe("DiagnosticsPricingProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mutate.mockClear();
    capturedOnSuccess = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const settle = () => act(() => vi.advanceTimersByTime(600));

  it("does not call the pricing API when disabled", () => {
    renderProvider(false);
    expect(screen.getByTestId("enabled")).toHaveTextContent("false");
    settle();
    fireEvent.click(screen.getByRole("button", { name: "change qty" }));
    settle();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not recalculate for the state loaded from the backend", () => {
    renderProvider(true);
    settle();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("requests a recalculation after a price input settles, with the field-specific trigger", () => {
    renderProvider(true);
    settle();
    fireEvent.click(screen.getByRole("button", { name: "change qty" }));
    settle();

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toMatchObject({
      actionType: "REPAIR",
      jobType: "CHARGEABLE",
      trigger: "quantity",
      triggeredByOrder: 0,
      materials: [{ order: 0, position: "SP", quantity: 3, unitPrice: 10 }],
    });
  });

  it("falls back to the load trigger for a non-price-field change (e.g. position)", () => {
    renderProvider(true);
    settle();
    fireEvent.click(screen.getByRole("button", { name: "change position" }));
    settle();

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toMatchObject({ trigger: "load" });
    expect(mutate.mock.calls[0][0].triggeredByOrder).toBeUndefined();
  });

  it("writes backend prices back into Formik", () => {
    renderProvider(true);
    settle();

    act(() =>
      capturedOnSuccess?.({
        materials: [
          {
            order: 0,
            position: "SP",
            price: {
              discount: 0,
              discountAmount: 0,
              suggestedNetPrice: 30,
              unitPrice: 10,
              netAmount: 30,
              tax: 0,
              taxAmount: 0,
              grossAmount: 30,
              totalAmount: 30,
            },
          },
        ],
        summaries: [],
      }),
    );

    expect(screen.getByTestId("total")).toHaveTextContent("30");
  });
});
