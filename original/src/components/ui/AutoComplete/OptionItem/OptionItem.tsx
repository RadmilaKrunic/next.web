import "./OptionItem.scss";
import CustomerOption from "./CustomerOption/CustomerOption";
import { Customer } from "../../../../api/services/customers/customers.types";
import BaretoolOption from "./BaretoolOption/BaretoolOption";
import { BareToolOption } from "../../../../api/services/orders/orders.types";

export type AutoCompleteOption = string | Customer | BareToolOption;

export type OptionItemProps = {
  type: string;
  option: AutoCompleteOption;
  onSelect: (option: AutoCompleteOption) => void;
  isHighlighted?: boolean;
};

function OptionItem({ type, option, onSelect, isHighlighted = false }: Readonly<OptionItemProps>) {
  if (
    type?.toLowerCase().includes("baretoolnumber") ||
    type?.toLowerCase().includes("sparepartnumber") ||
    type?.toLowerCase().includes("toolmodelname")
  ) {
    return (
      <BaretoolOption
        option={option as BareToolOption}
        onSelect={() => onSelect(option)}
        isHighlighted={isHighlighted}
        isTradeName={type?.toLowerCase().includes("toolmodelname")}
      />
    );
  }

  const customerTypes = [
    "firstNameInPri",
    "lastNameInPri",
    "firstName",
    "lastName",
    "dealershipName",
    "companyName",
  ];

  if (customerTypes.includes(type)) {
    return (
      <CustomerOption
        option={option as Customer}
        onSelect={() => onSelect(option)}
        isHighlighted={isHighlighted}
        {...(["dealershipName", "companyName"].includes(type) && { type })}
      />
    );
  }

  return (
    <button
      type="button"
      className={`auto-complete-option ${isHighlighted ? "highlighted" : ""}`}
      onClick={() => onSelect(option)}
    >
      {typeof option === "string" ? option : "Option"}
    </button>
  );
}

export default OptionItem;
