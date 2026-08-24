type KeyboardNavigationOptions = {
  onClick?: () => void;
};

export const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));

export const handleEnterAndArrows = <T extends HTMLElement = HTMLDivElement>(
  event: React.KeyboardEvent<T>,
  options?: KeyboardNavigationOptions,
): void => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    options?.onClick?.();
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    const nextElement = event.currentTarget.nextElementSibling as HTMLElement;
    nextElement?.focus();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    const prevElement = event.currentTarget.previousElementSibling as HTMLElement;
    prevElement?.focus();
  }
};
