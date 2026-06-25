import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { BreadcrumbsContext } from "../contexts/breadcrumbscontext";
import { useBreadcrumbs } from "./useBreadcrumbs";
import type { Breadcrumb } from "../contexts/breadcrumbscontext";

describe("useBreadcrumbs", () => {
  it("calls setBreadcrumbs with provided breadcrumbs on mount", () => {
    const setBreadcrumbs = vi.fn();
    const breadcrumbs: Breadcrumb[] = [{ label: "Home", href: "/" }];

    renderHook(() => useBreadcrumbs(breadcrumbs), {
      wrapper: ({ children }) =>
        React.createElement(
          BreadcrumbsContext.Provider,
          { value: { breadcrumbs: [], setBreadcrumbs } },
          children,
        ),
    });

    expect(setBreadcrumbs).toHaveBeenCalledWith(breadcrumbs);
  });

  it("calls setBreadcrumbs with empty array", () => {
    const setBreadcrumbs = vi.fn();

    renderHook(() => useBreadcrumbs([]), {
      wrapper: ({ children }) =>
        React.createElement(
          BreadcrumbsContext.Provider,
          { value: { breadcrumbs: [], setBreadcrumbs } },
          children,
        ),
    });

    expect(setBreadcrumbs).toHaveBeenCalledWith([]);
  });

  it("calls setBreadcrumbs again when breadcrumbs change", () => {
    const setBreadcrumbs = vi.fn();
    const breadcrumbs1: Breadcrumb[] = [{ label: "Home", href: "/" }];
    const breadcrumbs2: Breadcrumb[] = [
      { label: "Home", href: "/" },
      { label: "Jobs", href: "/jobs" },
    ];

    const { rerender } = renderHook(({ bc }) => useBreadcrumbs(bc), {
      initialProps: { bc: breadcrumbs1 },
      wrapper: ({ children }) =>
        React.createElement(
          BreadcrumbsContext.Provider,
          { value: { breadcrumbs: [], setBreadcrumbs } },
          children,
        ),
    });

    rerender({ bc: breadcrumbs2 });
    expect(setBreadcrumbs).toHaveBeenCalledTimes(2);
  });
});
