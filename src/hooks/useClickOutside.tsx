import { useEffect, RefObject } from "react";

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  callback: (...args: any[]) => void,
  enabled: boolean = true,
  additionalRefs?: RefObject<HTMLElement>[],
) {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (ref.current?.contains(target)) {
        return;
      }

      if (additionalRefs) {
        const isClickInsideAdditional = additionalRefs.some((additionalRef) =>
          additionalRef.current?.contains(target),
        );
        if (isClickInsideAdditional) {
          return;
        }
      }

      callback();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback, enabled, additionalRefs]);
}
