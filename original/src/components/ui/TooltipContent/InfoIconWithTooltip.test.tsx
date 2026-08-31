import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@bosch/react-frok", () => ({
  Icon: ({
    iconName,
    className,
    ...props
  }: {
    iconName: string;
    className?: string;
    [key: string]: unknown;
  }) => <span data-testid={`icon-${iconName}`} className={className} {...props} />,
}));

vi.mock("react-tooltip", () => ({
  Tooltip: ({ id, place }: { id: string; place?: string }) => (
    <div data-testid={`tooltip-${id}`} data-place={place} />
  ),
}));

vi.mock("./TooltipContent", () => ({
  bareToolNumberTooltipContent: vi.fn(() => "<div>baretool tooltip</div>"),
  serialNumberTooltipContent: vi.fn(() => "<div>serial tooltip</div>"),
}));

vi.mock("@/assets/baretoolnumber.png", () => ({ default: "baretool.png" }));
vi.mock("@/assets/serialnumber.png", () => ({ default: "serial.png" }));

import InfoIconWithTooltip from "./InfoIconWithTooltip";

describe("InfoIconWithTooltip", () => {
  it("renders info icon", () => {
    render(<InfoIconWithTooltip name="myField" />);
    expect(screen.getByTestId("icon-info-i-frame")).toBeInTheDocument();
  });

  it("renders tooltip with correct id", () => {
    render(<InfoIconWithTooltip name="myField" />);
    expect(screen.getByTestId("tooltip-myField-info-tooltip")).toBeInTheDocument();
  });

  it("renders with plain text infoText (not image)", () => {
    render(<InfoIconWithTooltip name="myField" infoText="Some tooltip text" />);
    expect(screen.getByTestId("icon-info-i-frame")).toBeInTheDocument();
  });

  it("renders with bareToolNumber field name", () => {
    render(<InfoIconWithTooltip name="bareToolNumber" infoText="baretool.png" />);
    expect(screen.getByTestId("icon-info-i-frame")).toBeInTheDocument();
  });

  it("renders with serialNumber field name", () => {
    render(<InfoIconWithTooltip name="serialNumber" infoText="serial.png" />);
    expect(screen.getByTestId("icon-info-i-frame")).toBeInTheDocument();
  });

  it("renders with no infoText", () => {
    render(<InfoIconWithTooltip name="testField" />);
    expect(screen.getByTestId("icon-info-i-frame")).toBeInTheDocument();
  });
});
