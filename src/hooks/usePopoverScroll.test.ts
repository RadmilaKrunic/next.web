import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePopoverScroll } from "./usePopoverScroll";

describe("usePopoverScroll", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns initial closed state", () => {
    const { result } = renderHook(() => usePopoverScroll());
    expect(result.current.isPopoverOpen).toBe(false);
  });

  it("returns initial position as left-top", () => {
    const { result } = renderHook(() => usePopoverScroll());
    expect(result.current.popoverPosition).toBe("left-top");
  });

  it("handleTriggerClick toggles open state", () => {
    const { result } = renderHook(() => usePopoverScroll());

    act(() => {
      result.current.handleTriggerClick();
    });

    expect(result.current.isPopoverOpen).toBe(true);

    act(() => {
      result.current.handleTriggerClick();
    });

    expect(result.current.isPopoverOpen).toBe(false);
  });

  it("sets position to left-bottom when near bottom of viewport", () => {
    // Mock getBoundingClientRect to place trigger near bottom
    const mockRect = { bottom: 900, top: 850 };
    vi.stubGlobal("innerHeight", 1000);

    const { result } = renderHook(() => usePopoverScroll());

    // Manually set a popoverTriggerRef with mocked getBoundingClientRect
    Object.defineProperty(result.current.popoverTriggerRef, "current", {
      value: {
        getBoundingClientRect: () => mockRect,
      },
      writable: true,
    });

    act(() => {
      result.current.handleTriggerClick();
    });

    // 1000 - 900 = 100 < 350, so should be left-bottom
    expect(result.current.popoverPosition).toBe("left-bottom");
  });

  it("exposes wrapperRef and popoverTriggerRef", () => {
    const { result } = renderHook(() => usePopoverScroll());
    expect(result.current.wrapperRef).toBeDefined();
    expect(result.current.popoverTriggerRef).toBeDefined();
  });
});
