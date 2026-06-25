import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AddSpecialMaterialModal from "./AddSpecialMaterialModal";
import type { SpecialMaterial } from "./SpecialMeterialItem/SpecialMaterialItem";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("hooks/useClickOutside", () => ({
  useClickOutside: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    getQueryData: () => ({ countryCode: "ZA" }),
  }),
}));

const materialsMock: SpecialMaterial[] = [
  {
    id: "1",
    positionType: "SP",
    partName: "Mat One",
    partNumber: "PN-1",
    unitPrice: 10,
    hsnCode: "H1",
    chargeableOnly: false,
  },
  {
    id: "2",
    positionType: "SP",
    partName: "Mat Two",
    partNumber: "PN-2",
    unitPrice: 20,
    hsnCode: "H2",
    chargeableOnly: false,
  },
];

vi.mock("api/services/jobs/hooks", () => ({
  useSpecialMaterials: () => ({ data: materialsMock }),
}));

vi.mock("@bosch/react-frok", () => ({
  Dialog: ({
    open,
    children,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    title: string;
  }) =>
    open ? (
      <div>
        <div>{title}</div>
        {children}
      </div>
    ) : null,
  Button: ({
    children,
    onClick,
    "data-testid": dataTestId,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    "data-testid"?: string;
  }) => (
    <button type="button" data-testid={dataTestId} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("./SpecialMeterialItem/SpecialMaterialItem", () => ({
  default: ({
    material,
    isSelected,
    onToggle,
  }: {
    material: SpecialMaterial;
    isSelected: boolean;
    onToggle: (material: SpecialMaterial, checked: boolean) => void;
  }) => (
    <button type="button" onClick={() => onToggle(material, !isSelected)}>
      {material.partNumber}:{String(isSelected)}
    </button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AddSpecialMaterialModal", () => {
  it("preselects materials that already exist", () => {
    render(
      <AddSpecialMaterialModal
        jobId="J-1"
        isOpen={true}
        setIsOpen={vi.fn()}
        existingPartNumbers={new Set(["PN-2"])}
      />,
    );

    expect(screen.getByText("PN-2:true")).toBeInTheDocument();
  });

  it("adds selected materials and closes modal", () => {
    const onAddMaterials = vi.fn();
    const setIsOpen = vi.fn();

    render(
      <AddSpecialMaterialModal
        jobId="J-1"
        isOpen={true}
        setIsOpen={setIsOpen}
        onAddMaterials={onAddMaterials}
      />,
    );

    fireEvent.click(screen.getByText("PN-1:false"));
    fireEvent.click(screen.getByTestId("add-special-material-button"));

    expect(onAddMaterials).toHaveBeenCalledTimes(1);
    expect(onAddMaterials.mock.calls[0][0]).toHaveLength(1);
    expect(onAddMaterials.mock.calls[0][0][0].partNumber).toBe("PN-1");
    expect(setIsOpen).toHaveBeenCalledWith(false);
  });
});
