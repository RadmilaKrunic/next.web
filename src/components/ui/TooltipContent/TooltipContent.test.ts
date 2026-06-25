import { describe, it, expect, vi } from "vitest";
import { bareToolNumberTooltipContent, serialNumberTooltipContent } from "./TooltipContent";

vi.mock("@/assets/baretoolnumber.png", () => ({ default: "baretool.png" }));
vi.mock("@/assets/serialnumber.png", () => ({ default: "serial.png" }));

const t = (key: string) => key;

describe("bareToolNumberTooltipContent", () => {
  it("returns HTML string containing the bare tool number info key", () => {
    const html = bareToolNumberTooltipContent(t);
    expect(html).toContain("bareToolNumberInfo");
    expect(html).toContain("whereDoIFindTheBareToolNumber");
  });

  it("includes an img tag", () => {
    const html = bareToolNumberTooltipContent(t);
    expect(html).toContain("<img");
  });
});

describe("serialNumberTooltipContent", () => {
  it("returns HTML string containing the serial number info key", () => {
    const html = serialNumberTooltipContent(t);
    expect(html).toContain("serialNumberInfo");
    expect(html).toContain("whereDoIFindTheSerialNumber");
  });

  it("includes an img tag", () => {
    const html = serialNumberTooltipContent(t);
    expect(html).toContain("<img");
  });
});
