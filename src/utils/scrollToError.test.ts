import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scrollToFirstError } from "./scrollToError";

describe("scrollToFirstError", () => {
  let mockScrollIntoView: ReturnType<typeof vi.fn>;
  let mockFocus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockScrollIntoView = vi.fn();
    mockFocus = vi.fn();

    Element.prototype.scrollIntoView = mockScrollIntoView;
    HTMLElement.prototype.focus = mockFocus;

    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should scroll to first error message element", async () => {
    // Create error message element
    const errorDiv = document.createElement("div");
    errorDiv.className = "text-input-error-message";
    document.body.appendChild(errorDiv);

    scrollToFirstError(["field1"], 0);

    // Wait for setTimeout
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("should focus on associated input field when error is within generic-field", async () => {
    // Create field structure
    const fieldWrapper = document.createElement("div");
    fieldWrapper.className = "generic-field";

    const inputElement = document.createElement("input");
    inputElement.name = "testField";

    const errorDiv = document.createElement("div");
    errorDiv.className = "text-input-error-message";

    fieldWrapper.appendChild(inputElement);
    fieldWrapper.appendChild(errorDiv);
    document.body.appendChild(fieldWrapper);

    scrollToFirstError(["testField"], 0);

    // Wait for setTimeout
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockScrollIntoView).toHaveBeenCalled();
    expect(mockFocus).toHaveBeenCalled();
  });

  it("should fallback to finding field by name if no error message found", async () => {
    const inputElement = document.createElement("input");
    inputElement.name = "field1";
    document.body.appendChild(inputElement);

    scrollToFirstError(["field1"], 0);

    // Wait for setTimeout
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
    expect(mockFocus).toHaveBeenCalled();
  });

  it("should handle empty error field names gracefully", async () => {
    scrollToFirstError([], 0);

    // Wait for setTimeout
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockScrollIntoView).not.toHaveBeenCalled();
    expect(mockFocus).not.toHaveBeenCalled();
  });

  it("should not throw error when no elements are found", async () => {
    expect(() => {
      scrollToFirstError(["nonExistentField"], 0);
    }).not.toThrow();

    // Wait for setTimeout
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockScrollIntoView).not.toHaveBeenCalled();
  });

  it("should respect custom delay parameter", async () => {
    const errorDiv = document.createElement("div");
    errorDiv.className = "text-input-error-message";
    document.body.appendChild(errorDiv);

    const customDelay = 200;
    scrollToFirstError(["field1"], customDelay);

    // Check it hasn't been called immediately
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockScrollIntoView).not.toHaveBeenCalled();

    // Check it has been called after the delay
    await new Promise((resolve) => setTimeout(resolve, customDelay));
    expect(mockScrollIntoView).toHaveBeenCalled();
  });
});
