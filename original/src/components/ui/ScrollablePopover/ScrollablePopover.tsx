import { Popover } from "@bosch/react-frok";
import { usePopoverScroll } from "hooks/usePopoverScroll";
import { cloneElement, ReactElement, type ReactNode } from "react";
import "./ScrollablePopover.scss";

type PopoverTriggerElement = ReactElement<
  React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>
>;

export interface ScrollablePopoverProps {
  "data-testid"?: string;
  className?: string;
  trigger: PopoverTriggerElement;
  children: ReactNode;
}

export function ScrollablePopover({
  "data-testid": dataTestId,
  className,
  trigger,
  children,
}: Readonly<ScrollablePopoverProps>) {
  const { isPopoverOpen, popoverPosition, popoverTriggerRef, handleTriggerClick } =
    usePopoverScroll();

  const triggerWithHandler = cloneElement(trigger, {
    onClick: handleTriggerClick,
  });

  return (
    <div ref={popoverTriggerRef}>
      <Popover
        position={popoverPosition}
        open={isPopoverOpen}
        data-testid={dataTestId}
        className={`${className ?? ""}${popoverPosition === "left-top" ? "--top" : "--bottom"}`}
        trigger={triggerWithHandler}
      >
        {children}
      </Popover>
    </div>
  );
}
