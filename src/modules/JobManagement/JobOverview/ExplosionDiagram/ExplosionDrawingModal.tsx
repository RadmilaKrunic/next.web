import { Dialog } from "@bosch/react-frok";
import { useRef, useEffect } from "react";
import ExplosionDrawing from "./ExplosionDrawing";
import "./ExplosionDrawingModal.scss";
import { PositionItem } from "./ExplosionDrawing.types";
import { MaterialItem } from "../../../../hooks/useDiagnosticsManager";

interface ExplosionDrawingModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void; // Optional setter for isOpen
  onSubmitParts: (positions: PositionItem[]) => void;
  existingMaterials?: MaterialItem[];
  illustrationType?: string;
  formValues: Record<string, unknown>;
}

export default function ExplosionDrawingModal({
  isOpen,
  setIsOpen,
  onSubmitParts,
  existingMaterials = [],
  formValues,
}: Readonly<ExplosionDrawingModalProps>) {
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      // Force a recalculation after dialog is fully visible
      setTimeout(() => {
        // Trigger a window resize event to force recalculation
        globalThis.dispatchEvent(new Event("resize"));
      }, 400);
    }
  }, [isOpen]);

  return (
    <Dialog
      ref={modalRef}
      modal
      onClose={(event) => {
        if (event) {
          event.stopPropagation();
          event.preventDefault();
        }
        setIsOpen(false);
      }}
      open={isOpen}
      className="explosion-drawing-modal"
      data-testid="explosion-drawing-modal"
    >
      <div className="explosion-drawing-modal-content">
        <ExplosionDrawing
          isOpen={isOpen}
          formValues={formValues}
          existingMaterials={existingMaterials}
          onSubmitParts={onSubmitParts}
          setIsOpen={setIsOpen}
        />
      </div>
    </Dialog>
  );
}
