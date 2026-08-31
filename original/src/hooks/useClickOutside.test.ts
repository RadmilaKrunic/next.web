import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { useClickOutside } from "./useClickOutside";

describe("useClickOutside", () => {
  let callback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    callback = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls callback on mousedown outside the ref element", () => {
    renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement("div"));
      useClickOutside(ref, callback);
      return ref;
    });

    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(callback).toHaveBeenCalledTimes(1);
    document.body.removeChild(outside);
  });

  it("does not call callback when click is inside the ref element", () => {
    const inner = document.createElement("span");
    const container = document.createElement("div");
    container.appendChild(inner);

    renderHook(() => {
      const ref = { current: container };
      useClickOutside(ref, callback);
    });

    inner.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call callback when enabled=false", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement("div"));
      useClickOutside(ref, callback, false);
    });

    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(callback).not.toHaveBeenCalled();
    document.body.removeChild(outside);
  });

  it("does not call callback when click is inside an additional ref", () => {
    const additional = document.createElement("span");
    document.body.appendChild(additional);

    renderHook(() => {
      const ref = useRef<HTMLDivElement>(document.createElement("div"));
      const additionalRef = { current: additional };
      useClickOutside(ref, callback, true, [additionalRef]);
    });

    additional.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(callback).not.toHaveBeenCalled();
    document.body.removeChild(additional);
  });
});
