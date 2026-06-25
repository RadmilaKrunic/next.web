import { useEffect, useRef, ReactNode } from "react";
import "./Flyout.scss";

export interface FlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  triggerRef?: React.RefObject<HTMLElement>;
  className?: string;
  position?: "bottom-left" | "bottom-center" | "bottom-right" | "top-left" | "top-right";
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  role?: string;
  ariaLabel?: string;
}

export default function Flyout({
  isOpen,
  onClose,
  children,
  triggerRef,
  className = "",
  position = "bottom-left",
  closeOnOutsideClick = true,
  closeOnEscape = true,
  role = "dialog",
  ariaLabel,
}: Readonly<FlyoutProps>) {
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !closeOnOutsideClick) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInsideTrigger = triggerRef?.current?.contains(target) ?? false;
      const isClickInsideFlyout = flyoutRef.current?.contains(target) ?? false;

      if (!isClickInsideTrigger && !isClickInsideFlyout) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, closeOnOutsideClick, onClose, triggerRef]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={flyoutRef}
      className={`flyout flyout--${position} ${className}`}
      role={role}
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className="flyout__arrow" />
      <div className="flyout__content">{children}</div>
    </div>
  );
}
