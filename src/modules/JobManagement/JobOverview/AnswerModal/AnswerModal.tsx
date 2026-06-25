import { Button, Dialog, RadioButton } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { useClickOutside } from "../../../../hooks/useClickOutside";
import "./AnswerModal.scss";

interface AnswerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedAnswer: string) => void;
  title?: string;
  options?: { value: string; label: string }[];
}

function AnswerModal({ isOpen, onClose, onSave, title, options }: Readonly<AnswerModalProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const modalRef = useRef<HTMLDialogElement>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");

  useClickOutside(modalRef as React.RefObject<HTMLElement>, onClose, isOpen);

  const handleSave = () => {
    if (!selectedAnswer) return;

    try {
      onSave(selectedAnswer);
      setSelectedAnswer("");
      onClose();
    } catch (error) {
      console.error("Failed to save customer answer:", error);
    }
  };

  const handleCancel = () => {
    setSelectedAnswer("");
    onClose();
  };

  const handleRadioChange = (value: string) => {
    setSelectedAnswer(value);
  };

  return (
    <Dialog
      ref={modalRef}
      modal
      open={isOpen}
      title={title}
      className="answers-modal"
      data-testid="answers-modal"
      onClose={(event) => {
        if (event) {
          event.stopPropagation();
          event.preventDefault();
        }
        onClose();
      }}
    >
      <div className="modal-subtitle">{t("pleaseSelectOneOfOfferedAnswers")}</div>
      <fieldset className="radio-group --column answers-section" data-testid="answer-radio-group">
        {options?.map((option) => (
          <RadioButton
            key={option.value}
            id={`answer-option-${option.value}`}
            name="answer"
            value={option.value}
            label={t(option.label)}
            checked={selectedAnswer === option.value}
            onChange={() => handleRadioChange(option.value)}
            data-testid={`answer-option-${option.value}`}
          />
        ))}
      </fieldset>
      <div className="modal-actions action-buttons">
        <Button mode="secondary" onClick={handleCancel} data-testid="cancel-button">
          {t("cancel")}
        </Button>
        <Button
          mode="primary"
          onClick={handleSave}
          data-testid="save-button"
          disabled={!selectedAnswer}
        >
          {t("save")}
        </Button>
      </div>
    </Dialog>
  );
}

export type { AnswerModalProps };
export default AnswerModal;
