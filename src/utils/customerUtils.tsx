import { ReactNode } from "react";
import { Icon } from "@bosch/react-frok";

export type CustomerType = "INDIVIDUAL_PRIVATE" | "INDIVIDUAL_PRO" | "COMPANY" | "DEALERSHIP";

export const CUSTOMER_TYPE_ICON_NAME: Record<CustomerType, string> = {
  INDIVIDUAL_PRIVATE: "user",
  INDIVIDUAL_PRO: "user-worker",
  COMPANY: "building",
  DEALERSHIP: "store",
};

export type CustomerNameFields = {
  customerType?: string;
  companyName?: string | null;
  dealershipName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export const getCustomerDisplayName = (customer: CustomerNameFields): string => {
  if (customer.customerType === "COMPANY" && customer.companyName) {
    return customer.companyName;
  }
  if (customer.customerType === "DEALERSHIP" && customer.dealershipName) {
    return customer.dealershipName;
  }

  const firstName = customer.firstName || "";
  const lastName = customer.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "-";
};

export const getCustomerTypeIcon = (customer: CustomerNameFields): string => {
  return CUSTOMER_TYPE_ICON_NAME[customer.customerType as CustomerType] ?? "user";
};

export const getCustomerNameWithIcon = (customer: CustomerNameFields): ReactNode => {
  const displayName = getCustomerDisplayName(customer);
  if (displayName === "-") return displayName;

  return (
    <>
      <Icon iconName={getCustomerTypeIcon(customer)} className="user-icon" />
      {displayName}
    </>
  );
};
