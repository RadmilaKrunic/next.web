import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SpecialMaterialItem, { type SpecialMaterial } from "./SpecialMaterialItem";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const useHasPermissionMock = vi.hoisted(() => vi.fn(() => true));
vi.mock("hooks/useHasPermission", () => ({
  useHasPermission: () => useHasPermissionMock(),
}));

vi.mock("@bosch/react-frok", () => ({
  Checkbox: ({
    checked,
    onChange,
    id,
  }: {
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    id: string;
  }) => <input id={id} type="checkbox" checked={checked} onChange={onChange} />,
}));

const material: SpecialMaterial = {
  id: "1",
  positionType: "SP",
  partName: "Special Part",
  partNumber: "PN-1",
  unitPrice: 99,
  hsnCode: "H1",
  chargeableOnly: false,
};

describe("SpecialMaterialItem", () => {
  it("renders price when user has price permission", () => {
    useHasPermissionMock.mockReturnValue(true);

    render(<SpecialMaterialItem material={material} isSelected={false} onToggle={vi.fn()} />);

    expect(screen.getByText("unitPrice")).toBeInTheDocument();
    expect(screen.getByText("99")).toBeInTheDocument();
  });

  it("hides price when user lacks price permission", () => {
    useHasPermissionMock.mockReturnValue(false);

    render(<SpecialMaterialItem material={material} isSelected={false} onToggle={vi.fn()} />);

    expect(screen.queryByText("unitPrice")).not.toBeInTheDocument();
  });

  it("calls onToggle on checkbox change", () => {
    useHasPermissionMock.mockReturnValue(true);
    const onToggle = vi.fn();

    render(<SpecialMaterialItem material={material} isSelected={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledWith(material, true);
  });
});
