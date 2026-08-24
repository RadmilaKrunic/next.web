import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("../utils/keyboard.accessibility", () => ({
  getFocusableElements: vi.fn(),
}));

import { getFocusableElements } from "../utils/keyboard.accessibility";
import { useFocusTrap } from "./useFocusTrap";

const mockGetFocusableElements = vi.mocked(getFocusableElements);

describe("useFocusTrap", () => {
  let container: HTMLElement;
  let firstElement: HTMLElement;
  let lastElement: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();

    container = document.createElement("div");

    firstElement = document.createElement("button");
    lastElement = document.createElement("button");

    container.appendChild(firstElement);
    container.appendChild(lastElement);

    mockGetFocusableElements.mockReturnValue([firstElement, lastElement]);
  });

  it("focuses first element when enabled", () => {
    const ref = { current: container };

    const focusSpy = vi.spyOn(firstElement, "focus");

    renderHook(() => useFocusTrap(ref, true));

    expect(focusSpy).toHaveBeenCalled();
  });

  it("does not do anything when disabled", () => {
    const ref = { current: container };

    renderHook(() => useFocusTrap(ref, false));

    expect(mockGetFocusableElements).not.toHaveBeenCalled();
  });

  it("moves focus to first element when Tab is pressed on last element", () => {
    const ref = { current: container };

    const firstFocusSpy = vi.spyOn(firstElement, "focus");

    renderHook(() => useFocusTrap(ref, true));

    firstFocusSpy.mockClear();

    Object.defineProperty(document, "activeElement", {
      value: lastElement,
      configurable: true,
    });

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
    });

    document.dispatchEvent(event);

    expect(firstFocusSpy).toHaveBeenCalled();
  });

  it("moves focus to last element when Shift + Tab is pressed on first element", () => {
    const ref = { current: container };

    const lastFocusSpy = vi.spyOn(lastElement, "focus");

    renderHook(() => useFocusTrap(ref, true));

    lastFocusSpy.mockClear();

    Object.defineProperty(document, "activeElement", {
      value: firstElement,
      configurable: true,
    });

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
    });

    document.dispatchEvent(event);

    expect(lastFocusSpy).toHaveBeenCalled();
  });

  it("does not handle non Tab keys", () => {
    const ref = { current: container };

    const firstFocusSpy = vi.spyOn(firstElement, "focus");

    renderHook(() => useFocusTrap(ref, true));

    firstFocusSpy.mockClear();

    Object.defineProperty(document, "activeElement", {
      value: lastElement,
      configurable: true,
    });

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
      }),
    );

    expect(firstFocusSpy).not.toHaveBeenCalled();
  });

  it("removes event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const ref = { current: container };

    const { unmount } = renderHook(() => useFocusTrap(ref, true));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
});
