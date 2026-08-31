import { BareToolOption } from "../../../../../api/services/orders/orders.types";

interface BaretoolOptionProps {
  option: BareToolOption;
  onSelect: (option: BareToolOption) => void;
  isHighlighted?: boolean;
  isTradeName?: boolean;
}

function BaretoolOption({
  option,
  onSelect,
  isHighlighted = false,
  isTradeName = false,
}: Readonly<BaretoolOptionProps>) {
  const { description, tradeName, voltage, country, partNumber } = option;
  const completeDescription = `${description} ${voltage} / ${country}`;
  const toolModelNameText = `${tradeName} ${completeDescription}`;
  return (
    <button
      className={`auto-complete-option ${isHighlighted ? "highlighted" : ""}`}
      onClick={() => onSelect(option)}
    >
      <div className="option-content">
        <div className="option-name">{isTradeName ? toolModelNameText : partNumber}</div>
        <div className="option-details">
          <span>{isTradeName ? partNumber : tradeName}</span>
          {!isTradeName && <span> | {completeDescription}</span>}
        </div>
      </div>
    </button>
  );
}

export default BaretoolOption;
