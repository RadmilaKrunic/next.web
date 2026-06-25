import { Icon } from "@bosch/react-frok";
import { Customer } from "../../../../../api/services/customers/customers.types";
import { CUSTOMER_TYPE_ICON_NAME } from "../../../../../utils/customerTypeIcon";

interface CustomerOptionProps {
  option: Customer;
  onSelect: (option: Customer) => void;
  isHighlighted?: boolean;
  type?: string;
}

function CustomerOption({
  option,
  onSelect,
  isHighlighted = false,
  type = "",
}: Readonly<CustomerOptionProps>) {
  return (
    <button
      className={`auto-complete-option ${isHighlighted ? "highlighted" : ""}`}
      onClick={() => onSelect(option)}
    >
      <Icon iconName={CUSTOMER_TYPE_ICON_NAME[option.customerType]} className="option-avatar" />
      <div className="option-content">
        <div className="option-name">
          {option.firstName} {option.lastName}
        </div>
        <div className="option-details">
          {type === "dealershipName" && option.dealershipName && (
            <span>{option.dealershipName}</span>
          )}
          {type === "companyName" && option.companyName && <span>{option.companyName}</span>}
          {option.phoneNumber && (
            <span>{`${type === "dealershipName" || type === "companyName" ? " | " : ""}${option.phoneNumber}`}</span>
          )}
          {option.primaryEmail && <span>{` | ${option.primaryEmail}`}</span>}
        </div>
      </div>
    </button>
  );
}

export default CustomerOption;
