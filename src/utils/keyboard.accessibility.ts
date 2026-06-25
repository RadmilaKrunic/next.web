type KeyboardNavigationOptions = {
  onClick?: () => void;
};
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
