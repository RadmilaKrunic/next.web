import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: ({ size, ...props }: { size?: string; [key: string]: unknown }) => (
    <div data-testid="activity-indicator" data-size={size} {...props} />
  ),
}));

import ActivityIndicatorWithDelay from "./ActivityIndicatorWithDelay";

describe("ActivityIndicatorWithDelay", () => {
  it("does not render immediately", () => {
    vi.useFakeTimers();
    render(<ActivityIndicatorWithDelay delay={500} />);
    expect(screen.queryByTestId("activity-indicator")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders after the delay", async () => {
    vi.useFakeTimers();
    render(<ActivityIndicatorWithDelay delay={300} />);
    expect(screen.queryByTestId("activity-indicator")).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId("activity-indicator")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders with large size by default", async () => {
    vi.useFakeTimers();
    render(<ActivityIndicatorWithDelay delay={100} />);
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByTestId("activity-indicator")).toHaveAttribute("data-size", "large");
    vi.useRealTimers();
  });

  it("renders with custom size", async () => {
    vi.useFakeTimers();
    render(<ActivityIndicatorWithDelay delay={100} size="small" />);
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByTestId("activity-indicator")).toHaveAttribute("data-size", "small");
    vi.useRealTimers();
  });

  it("resets timer when delay changes", async () => {
    vi.useFakeTimers();
    const { rerender } = render(<ActivityIndicatorWithDelay delay={500} />);
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    rerender(<ActivityIndicatorWithDelay delay={500} />);
    expect(screen.queryByTestId("activity-indicator")).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId("activity-indicator")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
