import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncDockLocale, toDockLocale } from "./dockLocale";

describe("toDockLocale", () => {
  it("lowercases a supported app locale", () => {
    expect(toDockLocale("tr-TR")).toBe("tr-tr");
  });

  it("maps locales DOCK does not ship", () => {
    expect(toDockLocale("en-TR")).toBe("en-gb");
    expect(toDockLocale("fr-TN")).toBe("fr-fr");
    expect(toDockLocale("ar-SA")).toBe("ar-ae");
  });
});

describe("syncDockLocale", () => {
  beforeEach(() => {
    vi.spyOn(customElements, "whenDefined").mockResolvedValue(
      undefined as unknown as CustomElementConstructor,
    );
  });

  it("sets the document language and the dock locale", async () => {
    const dock = document.createElement("dock-privacy-settings");
    document.body.appendChild(dock);

    syncDockLocale("tr-TR");
    await Promise.resolve();

    expect(document.documentElement.lang).toBe("tr-TR");
    expect(dock).toHaveAttribute("locale", "tr-tr");
    dock.remove();
  });
});
