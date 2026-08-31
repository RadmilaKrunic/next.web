import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@bosch/react-frok", () => ({
  Popover: ({
    children,
    trigger,
    open,
    "data-testid": dataTestId,
  }: {
    children: React.ReactNode;
    trigger: React.ReactNode;
    open?: boolean;
    "data-testid"?: string;
    [key: string]: unknown;
  }) => (
    <div data-testid={dataTestId}>
      {trigger}
      {open && <div data-testid="popover-content">{children}</div>}
    </div>
  ),
}));

vi.mock("hooks/usePopoverScroll", () => ({
  usePopoverScroll: () => ({
    isPopoverOpen: false,
    popoverPosition: "left-bottom",
    popoverTriggerRef: { current: null },
    handleTriggerClick: vi.fn(),
  }),
}));

import { ScrollablePopover } from "./ScrollablePopover";

describe("ScrollablePopover", () => {
  it("renders trigger element", () => {
    render(
      <ScrollablePopover trigger={<button>Open</button>}>
        <span>Content</span>
      </ScrollablePopover>,
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("does not show content when closed", () => {
    render(
      <ScrollablePopover trigger={<button>Open</button>}>
        <span>Hidden Content</span>
      </ScrollablePopover>,
    );
    expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument();
  });

  it("renders with data-testid", () => {
    render(
      <ScrollablePopover data-testid="my-popover" trigger={<button>Open</button>}>
        Content
      </ScrollablePopover>,
    );
    expect(screen.getByTestId("my-popover")).toBeInTheDocument();
  });
});
