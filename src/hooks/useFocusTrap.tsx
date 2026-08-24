import { useEffect, RefObject } from "react";
import { getFocusableElements } from "../utils/keyboard.accessibility";

export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;

    const container = ref.current;
    if (!container) return;

    const focusable = getFocusableElements(container);
    if (focusable.length > 0) focusable[0].focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = getFocusableElements(container);
      if (els.length === 0) return;
      const first = els[0];
      const last = els.at(-1);
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [ref, enabled]);
}
