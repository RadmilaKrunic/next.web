import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type Area from "components/generics/Area/GenericArea.types";
import ClaimSummaryArea from "./ClaimSummaryArea";
import { DiagnosticsContext } from "modules/JobManagement/JobOverview/DiagnosticsContext";

const claimContextMock = {
  isDistributingRef: { current: false },
  hasPricesPopulated: true,
  setSummaryTypeOptions: vi.fn(),
  discountBase: "NET_PRICE" as const,
  materials: [{ partNumber: "P1" }],
  setMaterials: vi.fn(),
};

vi.mock("../ClaimContext", () => ({
  useClaimContext: () => claimContextMock,
}));

vi.mock("modules/JobManagement/JobOverview/SparePartsArea/SummaryArea", () => ({
  default: () => {
    const ctx = React.useContext(DiagnosticsContext);
    return (
      <div>
        <span>ctx-discount:{ctx.discountBase}</span>
        <span>ctx-materials:{ctx.materials.length}</span>
        <span>ctx-prices:{String(ctx.hasPricesPopulated)}</span>
      </div>
    );
  },
}));

const area = {
  name: "claimDiagnosticsSummary",
  label: "summary",
  position: 0,
  fields: [],
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: false,
} as Area;

describe("ClaimSummaryArea", () => {
  it("bridges claim context values into diagnostics context", () => {
    render(<ClaimSummaryArea area={area} />);

    expect(screen.getByText("ctx-discount:NET_PRICE")).toBeInTheDocument();
    expect(screen.getByText("ctx-materials:1")).toBeInTheDocument();
    expect(screen.getByText("ctx-prices:true")).toBeInTheDocument();
  });
});
