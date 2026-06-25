/**
 * Scrolls to the top of the page
 */
export const scrollToTop = (): void => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

/**
 * Scrolls to the first error element on the page
 * @param errorFieldNames - Array of field names that have errors
 * @param delay - Optional delay in milliseconds before scrolling (default: 100ms)
 */
export const scrollToFirstError = (errorFieldNames: string[], delay = 100): void => {
  setTimeout(() => {
    const firstErrorMessage = document.querySelector(".text-input-error-message");

    if (firstErrorMessage) {
      firstErrorMessage.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      const errorParent = firstErrorMessage.closest(".generic-field");
      if (errorParent) {
        const inputElement = errorParent.querySelector("input, textarea, select");
        if (inputElement && inputElement instanceof HTMLElement) {
          inputElement.focus();
        }
      }
      return;
    }

    if (errorFieldNames.length > 0) {
      const firstErrorFieldName = errorFieldNames[0];
      const firstErrorField = document.querySelector(`[name="${firstErrorFieldName}"]`);

      if (firstErrorField && firstErrorField instanceof HTMLElement) {
        firstErrorField.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        firstErrorField.focus();
      }
    }
  }, delay);
};
