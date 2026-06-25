import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Flyout from "./Flyout";

describe("Flyout", () => {
  it("renders nothing when closed", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Flyout isOpen={false} onClose={onClose}>
        <span>Content</span>
      </Flyout>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders children when open", () => {
    render(
      <Flyout isOpen onClose={vi.fn()}>
        <span>My Content</span>
      </Flyout>,
    );
    expect(screen.getByText("My Content")).toBeInTheDocument();
  });

  it("applies position class", () => {
    render(
      <Flyout isOpen onClose={vi.fn()} position="bottom-right">
        Content
      </Flyout>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("flyout--bottom-right");
  });

  it("applies default position class", () => {
    render(
      <Flyout isOpen onClose={vi.fn()}>
        Content
      </Flyout>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("flyout--bottom-left");
  });

  it("applies custom className", () => {
    render(
      <Flyout isOpen onClose={vi.fn()} className="my-class">
        Content
      </Flyout>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("my-class");
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(
      <Flyout isOpen onClose={onClose}>
        Content
      </Flyout>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking outside", () => {
    const onClose = vi.fn();
    render(
      <Flyout isOpen onClose={onClose}>
        Content
      </Flyout>,
    );
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking inside", () => {
    const onClose = vi.fn();
    render(
      <Flyout isOpen onClose={onClose}>
        <button>Inside</button>
      </Flyout>,
    );
    fireEvent.mouseDown(screen.getByText("Inside"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on Escape when closeOnEscape is false", () => {
    const onClose = vi.fn();
    render(
      <Flyout isOpen onClose={onClose} closeOnEscape={false}>
        Content
      </Flyout>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on outside click when closeOnOutsideClick is false", () => {
    const onClose = vi.fn();
    render(
      <Flyout isOpen onClose={onClose} closeOnOutsideClick={false}>
        Content
      </Flyout>,
    );
    fireEvent.mouseDown(document.body);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders with custom role and ariaLabel", () => {
    render(
      <Flyout isOpen onClose={vi.fn()} role="menu" ariaLabel="Actions menu">
        Content
      </Flyout>,
    );
    const flyout = screen.getByRole("menu");
    expect(flyout).toHaveAttribute("aria-label", "Actions menu");
  });
});
