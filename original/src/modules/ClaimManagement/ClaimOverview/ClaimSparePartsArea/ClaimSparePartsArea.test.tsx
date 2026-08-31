import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type Area from "components/generics/Area/GenericArea.types";
import ClaimSparePartsArea from "./ClaimSparePartsArea";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const onDeleteRowMock = vi.hoisted(() => vi.fn());
vi.mock("../ClaimContext", () => ({
  useClaimContext: () => ({ onDeleteRow: onDeleteRowMock }),
}));

vi.mock("../ClaimSparePartsRow/ClaimSparePartsRow", () => ({
  default: ({ onDeleteRow }: { onDeleteRow: () => void }) => (
    <button type="button" onClick={onDeleteRow}>
      delete-row
    </button>
  ),
}));

const makeArea = (firstFieldName: string, label = "spareParts"): Area =>
  ({
    name: "claims_claimSpareParts#0",
    label,
    position: 0,
    fields: [{ name: firstFieldName, label: "f", type: "text" } as never],
    dependFieldCondition: "AND",
    dependentFields: [],
    actions: null,
    isSubArea: false,
  }) as Area;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ClaimSparePartsArea", () => {
  it("shows title for first duplicated row", () => {
    render(<ClaimSparePartsArea area={makeArea("claims_claimSpareParts#0_position")} />);

    expect(screen.getByText("spareParts")).toBeInTheDocument();
  });

  it("hides title for non-first row", () => {
    render(<ClaimSparePartsArea area={makeArea("claims_claimSpareParts#1_position")} />);

    expect(screen.queryByText("spareParts")).not.toBeInTheDocument();
  });

  it("deletes row using area name callback", () => {
    render(<ClaimSparePartsArea area={makeArea("claims_claimSpareParts#0_position")} />);

    fireEvent.click(screen.getByRole("button", { name: "delete-row" }));

    expect(onDeleteRowMock).toHaveBeenCalledWith("claims_claimSpareParts#0");
  });
});
