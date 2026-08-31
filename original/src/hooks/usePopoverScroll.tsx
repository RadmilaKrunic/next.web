import { useEffect, useRef, useState } from "react";

const THRESHOLD = 350;

export function usePopoverScroll() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<"left-top" | "left-bottom">("left-top");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverTriggerRef = useRef<HTMLDivElement>(null);
  const popoverPositionRef = useRef<"left-top" | "left-bottom">("left-top");

  const setPosition = (position: "left-top" | "left-bottom") => {
    popoverPositionRef.current = position;
    setPopoverPosition(position);
  };

  const handleTriggerClick = () => {
    if (!isPopoverOpen && popoverTriggerRef.current) {
      const rect = popoverTriggerRef.current.getBoundingClientRect();
      const viewportHeight = globalThis.innerHeight;
      setPosition(viewportHeight - rect.bottom < THRESHOLD ? "left-bottom" : "left-top");
    }
    setIsPopoverOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleScroll = () => {
      if (!popoverTriggerRef.current) return;

      const rect = popoverTriggerRef.current.getBoundingClientRect();
      const viewportHeight = globalThis.innerHeight;

      if (rect.top < 0 || rect.bottom > viewportHeight) {
        setIsPopoverOpen(false);
        return;
      }

      if (popoverPositionRef.current === "left-top") {
        if (viewportHeight - rect.bottom < THRESHOLD) {
          setPosition("left-bottom");
        }
      } else if (popoverPositionRef.current === "left-bottom") {
        if (viewportHeight - rect.bottom >= THRESHOLD) {
          setPosition("left-top");
        }
      }
    };

    let scrollableParent = wrapperRef.current?.parentElement;
    while (scrollableParent) {
      const overflow = globalThis.getComputedStyle(scrollableParent).overflow;
      if (overflow.includes("auto") || overflow.includes("scroll")) break;
      scrollableParent = scrollableParent.parentElement;
    }

    const isClickOnScrollbar = (e: MouseEvent): boolean => {
      if (e.clientX >= document.documentElement.clientWidth) return true;
      if (e.clientY >= document.documentElement.clientHeight) return true;

      if (scrollableParent) {
        const rect = scrollableParent.getBoundingClientRect();
        const hasVerticalScrollbar = scrollableParent.scrollWidth > scrollableParent.clientWidth;
        const hasHorizontalScrollbar =
          scrollableParent.scrollHeight > scrollableParent.clientHeight;

        if (hasVerticalScrollbar && e.clientX >= rect.right - 17) return true;
        if (hasHorizontalScrollbar && e.clientY >= rect.bottom - 17) return true;
      }

      return false;
    };

    const handleClickOutside = (e: MouseEvent) => {
      const clickedInsideTrigger = popoverTriggerRef.current?.contains(e.target as Node);
      const clickedOnScrollable =
        scrollableParent?.contains(e.target as Node) &&
        !popoverTriggerRef.current?.contains(e.target as Node);

      if (!clickedInsideTrigger && !clickedOnScrollable && !isClickOnScrollbar(e)) {
        setIsPopoverOpen(false);
      }
    };

    const target = scrollableParent ?? globalThis;
    target.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      target.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPopoverOpen]);

  return {
    isPopoverOpen,
    setIsPopoverOpen,
    popoverPosition,
    wrapperRef,
    popoverTriggerRef,
    handleTriggerClick,
  };
}
