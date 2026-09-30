import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { Formik } from "formik";
import type Area from "components/generics/Area/GenericArea.types";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { useHasPermission } from "hooks/useHasPermission";
import ClaimSummaryArea from "./ClaimSummaryArea";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: vi.fn(() => true),
}));

const renderedFields: Record<string, { isDisabled?: boolean }> = {};

vi.mock("components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: { name: string; isDisabled?: boolean } }) => {
    renderedFields[field.name] = field;
    return React.createElement("div", { "data-testid": `field-${field.name}` }, field.name);
  },
}));

const claimContextMock = {
  hasPricesPopulated: true,
  setSummaryTypeOptions: vi.fn(),
  discountBase: "NET_PRICE" as string,
};

vi.mock("../ClaimContext", () => ({
  useClaimContext: () => claimContextMock,
}));

const typeOptions = [
  { value: "WARRANTY", name: "Warranty" },
  { value: "CHARGEABLE", name: "Chargeable" },
];

const rowFields = [
  {
    name: "claims_claimSpareParts#0_type",
    subtype: "diagnosticType",
    options: typeOptions,
    fieldMapping: { nameStartsWith: "claims_claimSpareParts#0_" },
  },
  {
    name: "claims_claimSpareParts#1_type",
    subtype: "diagnosticType",
    options: typeOptions,
    fieldMapping: { nameStartsWith: "claims_claimSpareParts#1_" },
  },
  {
    name: "diagnostic_type",
    subtype: "diagnosticType",
    options: typeOptions,
    fieldMapping: { nameStartsWith: "diagnosticData_diagnosticsSpareParts#0_" },
  },
];

const area = {
  name: "claimDiagnosticsSummary",
  label: "summary",
  position: 0,
  fields: [
    { name: "summaryType", type: "radiogroup", subtype: "diagnosticSummaryType", position: 1 },
    { name: "netAmount", type: "price", subtype: "diagnosticSummaryNetAmount", position: 3 },
    { name: "grossAmount", type: "price", subtype: "diagnosticSummaryGrossAmount", position: 2 },
    { name: "discountNetMat", type: "price", subtype: "diagnosticSummaryDiscountNetMaterial" },
    { name: "netAmountMat", type: "price", subtype: "diagnosticSummaryNetAmountMaterial" },
    { name: "discountMat", type: "price", subtype: "diagnosticSummaryDiscountMaterial" },
    { name: "totalMat", type: "price", subtype: "diagnosticSummaryTotalAmountMaterial" },
    { name: "otherMat", type: "price", subtype: "diagnosticSummaryTaxAmountMaterial", size: "2" },
  ],
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: false,
} as unknown as Area;

function renderArea(values: Record<string, unknown> = {}, areaOverride: Area = area) {
  return render(
    <Formik initialValues={values} onSubmit={vi.fn()}>
      <GenericFormContext.Provider value={{ allFields: rowFields } as never}>
        <ClaimSummaryArea area={areaOverride} />
      </GenericFormContext.Provider>
    </Formik>,
  );
}

describe("ClaimSummaryArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(renderedFields).forEach((k) => delete renderedFields[k]);
    vi.mocked(useHasPermission).mockReturnValue(true);
    claimContextMock.hasPricesPopulated = true;
    claimContextMock.discountBase = "NET_PRICE";
  });

  it("renders nothing when the user can view prices but none are populated", () => {
    claimContextMock.hasPricesPopulated = false;

    const { container } = renderArea();

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the radio, value fields sorted by position and the material block for chargeable", () => {
    renderArea({ summaryType: "chargeable" });

    expect(screen.getByTestId("field-summaryType")).toBeInTheDocument();
    const valueRow = document.querySelector(".summary-fields-row:not(.summary-material-row)");
    expect(Array.from(valueRow?.children ?? []).map((c) => c.textContent)).toEqual([
      "grossAmount",
      "netAmount",
    ]);
    expect(screen.getByText("SummaryOfMaterialItems")).toBeInTheDocument();
    expect(screen.getByTestId("field-otherMat")).toBeInTheDocument();
  });

  it("defaults to the chargeable summary when the radio has no value yet", () => {
    renderArea({});

    expect(screen.getByText("SummaryOfMaterialItems")).toBeInTheDocument();
  });

  it("hides the material block for a non-chargeable summary type", () => {
    renderArea({ summaryType: "totalSummary" });

    expect(screen.queryByText("SummaryOfMaterialItems")).not.toBeInTheDocument();
    expect(screen.queryByTestId("field-otherMat")).not.toBeInTheDocument();
  });

  it("does not require a radio field in the area", () => {
    const withoutRadio = {
      ...area,
      fields: area.fields.filter((f) => f.type !== "radiogroup"),
    } as Area;

    renderArea({}, withoutRadio);

    expect(screen.queryByTestId("field-summaryType")).not.toBeInTheDocument();
    expect(screen.getByText("SummaryOfMaterialItems")).toBeInTheDocument();
  });

  it("keeps the radio field enabled", () => {
    renderArea({ summaryType: "chargeable" });

    expect(renderedFields.summaryType.isDisabled).toBe(false);
  });

  describe("material field permissions", () => {
    it("enables discount and net amount for NET_PRICE when the user may edit the discount", () => {
      renderArea({ summaryType: "chargeable" });

      expect(renderedFields.discountNetMat.isDisabled).toBe(false);
      expect(renderedFields.netAmountMat.isDisabled).toBe(false);
    });

    it("disables net amount when the country discount base is not NET_PRICE", () => {
      claimContextMock.discountBase = "GROSS_PRICE";

      renderArea({ summaryType: "chargeable" });

      expect(renderedFields.netAmountMat.isDisabled).toBe(true);
    });

    it("disables the discount field without the edit-discount permission", () => {
      vi.mocked(useHasPermission).mockImplementation((perms: string[]) =>
        perms.some((p) => p.includes("V")),
      );

      renderArea({ summaryType: "chargeable" });

      expect(renderedFields.discountNetMat.isDisabled).toBe(true);
    });

    it("always disables the approval-only discount and total amount fields", () => {
      renderArea({ summaryType: "chargeable" });

      expect(renderedFields.discountMat.isDisabled).toBe(true);
      expect(renderedFields.totalMat.isDisabled).toBe(true);
    });
  });

  describe("summary type options", () => {
    it("publishes totalSummary plus the job types used by claim rows only", async () => {
      renderArea({
        "claims_claimSpareParts#0_type": "WARRANTY",
        "claims_claimSpareParts#1_type": "CHARGEABLE",
        diagnostic_type: "WARRANTY",
      });

      await waitFor(() =>
        expect(claimContextMock.setSummaryTypeOptions).toHaveBeenLastCalledWith([
          { value: "totalSummary", label: "totalSummary" },
          { value: "warranty", label: "Warranty" },
          { value: "chargeable", label: "Chargeable" },
        ]),
      );
    });

    it("ignores rows with an empty or unknown type and de-duplicates repeated types", async () => {
      renderArea({
        "claims_claimSpareParts#0_type": "UNKNOWN",
        "claims_claimSpareParts#1_type": "",
      });

      await waitFor(() =>
        expect(claimContextMock.setSummaryTypeOptions).toHaveBeenLastCalledWith([
          { value: "totalSummary", label: "totalSummary" },
        ]),
      );
    });

    it("resets the radio to totalSummary when its value is no longer an option", async () => {
      renderArea({ summaryType: "chargeable" });

      await waitFor(() => expect(claimContextMock.setSummaryTypeOptions).toHaveBeenCalled());
      // "chargeable" is not an option (no chargeable rows), so the radio falls back
      // to totalSummary and the material block disappears.
      await waitFor(() =>
        expect(screen.queryByText("SummaryOfMaterialItems")).not.toBeInTheDocument(),
      );
    });

    it("keeps the radio when its value is still an option", async () => {
      renderArea({
        summaryType: "chargeable",
        "claims_claimSpareParts#0_type": "CHARGEABLE",
      });

      await waitFor(() => expect(claimContextMock.setSummaryTypeOptions).toHaveBeenCalled());
      expect(screen.getByText("SummaryOfMaterialItems")).toBeInTheDocument();
    });
  });

  it("works without form context fields", () => {
    render(
      <Formik initialValues={{}} onSubmit={vi.fn()}>
        <GenericFormContext.Provider value={{} as never}>
          <ClaimSummaryArea area={area} />
        </GenericFormContext.Provider>
      </Formik>,
    );

    expect(screen.getByTestId("field-summaryType")).toBeInTheDocument();
  });
});
