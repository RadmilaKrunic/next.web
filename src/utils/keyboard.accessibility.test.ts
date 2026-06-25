import { describe, it, expect, vi, afterEach } from "vitest";
import { handleEnterAndArrows } from "./keyboard.accessibility";

const makeKeyboardEvent = (
  key: string,
  overrides: Partial<React.KeyboardEvent<HTMLDivElement>> = {},
): React.KeyboardEvent<HTMLDivElement> => {
  const mockCurrentTarget = document.createElement("div") as unknown as EventTarget &
    HTMLDivElement;
  return {
    key,
    preventDefault: vi.fn(),
    currentTarget: mockCurrentTarget,
    ...overrides,
  } as unknown as React.KeyboardEvent<HTMLDivElement>;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleEnterAndArrows", () => {
  describe("Enter key", () => {
    it("calls preventDefault and invokes onClick", () => {
      const onClick = vi.fn();
      const event = makeKeyboardEvent("Enter");
      handleEnterAndArrows(event, { onClick });
      expect(event.preventDefault).toHaveBeenCalled();
      expect(onClick).toHaveBeenCalledOnce();
    });

    it("does not throw when onClick is undefined", () => {
      const event = makeKeyboardEvent("Enter");
      expect(() => handleEnterAndArrows(event)).not.toThrow();
    });
  });

  describe("Space key", () => {
    it("calls preventDefault and invokes onClick", () => {
      const onClick = vi.fn();
      const event = makeKeyboardEvent(" ");
      handleEnterAndArrows(event, { onClick });
      expect(event.preventDefault).toHaveBeenCalled();
      expect(onClick).toHaveBeenCalledOnce();
    });

    it("does not throw when options is undefined", () => {
      const event = makeKeyboardEvent(" ");
      expect(() => handleEnterAndArrows(event)).not.toThrow();
    });
  });

  describe("ArrowDown key", () => {
    it("calls preventDefault and focuses nextElementSibling", () => {
      const currentTarget = document.createElement("div");
      const sibling = document.createElement("div");
      const focusSpy = vi.spyOn(sibling, "focus");
      Object.defineProperty(currentTarget, "nextElementSibling", {
        value: sibling,
        configurable: true,
      });

      const event = {
        key: "ArrowDown",
        preventDefault: vi.fn(),
        currentTarget,
      } as unknown as React.KeyboardEvent<HTMLDivElement>;

      handleEnterAndArrows(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
    });

    it("does not throw when nextElementSibling is null", () => {
      const currentTarget = document.createElement("div");
      Object.defineProperty(currentTarget, "nextElementSibling", {
        value: null,
        configurable: true,
      });

      const event = {
        key: "ArrowDown",
        preventDefault: vi.fn(),
        currentTarget,
      } as unknown as React.KeyboardEvent<HTMLDivElement>;

      expect(() => handleEnterAndArrows(event)).not.toThrow();
    });
  });

  describe("ArrowUp key", () => {
    it("calls preventDefault and focuses previousElementSibling", () => {
      const currentTarget = document.createElement("div");
      const sibling = document.createElement("div");
      const focusSpy = vi.spyOn(sibling, "focus");
      Object.defineProperty(currentTarget, "previousElementSibling", {
        value: sibling,
        configurable: true,
      });

      const event = {
        key: "ArrowUp",
        preventDefault: vi.fn(),
        currentTarget,
      } as unknown as React.KeyboardEvent<HTMLDivElement>;

      handleEnterAndArrows(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
    });

    it("does not throw when previousElementSibling is null", () => {
      const currentTarget = document.createElement("div");
      Object.defineProperty(currentTarget, "previousElementSibling", {
        value: null,
        configurable: true,
      });

      const event = {
        key: "ArrowUp",
        preventDefault: vi.fn(),
        currentTarget,
      } as unknown as React.KeyboardEvent<HTMLDivElement>;

      expect(() => handleEnterAndArrows(event)).not.toThrow();
    });
  });

  describe("other keys", () => {
    it("does not call preventDefault for unhandled keys", () => {
      const event = makeKeyboardEvent("Tab");
      handleEnterAndArrows(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});
