import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("hello"));
    expect(result.current).toBe("hello");
  });

  it("does not update before delay elapses", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v), {
      initialProps: { v: "a" },
    });

    rerender({ v: "b" });
    vi.advanceTimersByTime(100);
    expect(result.current).toBe("a");
  });

  it("updates after default delay of 300ms", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v), {
      initialProps: { v: "a" },
    });

    rerender({ v: "b" });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("b");
  });

  it("respects custom delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 500), {
      initialProps: { v: "x" },
    });

    rerender({ v: "y" });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe("x");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("y");
  });

  it("resets timer on rapid successive changes", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v), {
      initialProps: { v: "a" },
    });

    rerender({ v: "b" });
    act(() => vi.advanceTimersByTime(200));
    rerender({ v: "c" });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe("c");
  });
});
