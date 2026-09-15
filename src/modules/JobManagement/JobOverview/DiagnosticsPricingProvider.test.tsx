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
  const { setFieldValue } = useFormikContext<Record<string, unknown>>();
  return (
    <div>
      <span data-testid="enabled">{String(enabled)}</span>
      <button type="button" onClick={() => void setFieldValue(`${PREFIX}_diagnosticQuantity`, 3)}>
        change qty
      </button>
      <button type="button" onClick={() => void setFieldValue(`${PREFIX}_diagnosticPosition`, "PN")}>
        change position
      </button>
    </div>
  );
}

const renderProvider = (enabled: boolean, onApplyResponse?: (r: DiagnosticPricingResponse) => void) =>
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
          country="TR"
          ascId="ASC8"
          areaNameContains="diagnosticsSpareParts"
          onApplyResponse={onApplyResponse}
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

  it("requests a recalculation after a price input settles, with the field-specific change", () => {
    renderProvider(true);
    settle();
    fireEvent.click(screen.getByRole("button", { name: "change qty" }));
    settle();

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toMatchObject({
      pricingContext: { country: "TR", ascId: "ASC8", scale: 2 },
      changes: { type: "SET_QUANTITY", lineId: "row-0", value: 3 },
      lines: [{ position: "SP", quantity: 3, unitPrice: 10 }],
    });
  });

  it("does not recalculate for a position/partNumber/type-only change (archived-and-recreated instead)", () => {
    renderProvider(true);
    settle();
    fireEvent.click(screen.getByRole("button", { name: "change position" }));
    settle();

    expect(mutate).not.toHaveBeenCalled();
  });

  it("hands the full response to onApplyResponse for the caller to refresh materials from", () => {
    const onApplyResponse = vi.fn();
    renderProvider(true, onApplyResponse);
    settle();

    const response: DiagnosticPricingResponse = {
      materials: [
        {
          order: 0,
          position: "SP",
          partNumber: "1611016003",
          jobType: "CHARGEABLE",
          quantity: 3,
          status: "PENDING",
          isPriceSetManually: false,
          notBelongsToTool: false,
        },
      ],
      priceSummary: null,
    };
    act(() => capturedOnSuccess?.(response));

    expect(onApplyResponse).toHaveBeenCalledWith(response);
  });
});
