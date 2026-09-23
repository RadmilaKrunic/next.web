import { ReactNode } from "react";
import { Customer } from "api/services/customers/customers.types";
import { getCustomerNameWithIcon } from "utils/customerUtils";

export type ClientColumnKey = "name" | "email" | "phoneNumber" | "assetsCount" | "status";

export type ClientColumnConfig = {
  key: ClientColumnKey;
  label: string;
  render: (customer: Customer) => string | ReactNode;
};

export const getClientColumns = (t: (key: string) => string): ClientColumnConfig[] => {
  return [
    {
      key: "name",
      label: t("clientName"),
      render: (customer) => getCustomerNameWithIcon(customer),
    },
    {
      key: "email",
      label: t("email"),
      render: (customer) => customer.primaryEmail || "-",
    },
    {
      key: "phoneNumber",
      label: t("phoneNumber"),
      render: (customer) => customer.phoneNumber || customer.mobileNumber || "-",
    },
    {
      key: "assetsCount",
      label: t("assetsCount"),
      render: (customer) => customer.assetsCount?.toString() ?? "-",
    },
    {
      key: "status",
      label: t("status"),
      render: (customer) => customer.status || "-",
    },
  ];
};
