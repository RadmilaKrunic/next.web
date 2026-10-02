import { ReactNode } from "react";
import { ClientManagementCustomer } from "api/services/clientManagement/clientManagement.types";
import { getCustomerNameWithIcon } from "utils/customerUtils";

export type ClientColumnKey = "name" | "email" | "phoneNumber" | "assetsCount";

export type ClientColumnConfig = {
  key: ClientColumnKey;
  label: string;
  render: (customer: ClientManagementCustomer) => string | ReactNode;
};

export const getClientColumns = (t: (key: string) => string): ClientColumnConfig[] => {
  return [
    {
      key: "name",
      label: t("clientName"),
      render: (customer) =>
        getCustomerNameWithIcon({ customerType: customer.customerType, firstName: customer.name }),
    },
    {
      key: "email",
      label: t("email"),
      render: (customer) => customer.primaryEmail || "-",
    },
    {
      key: "phoneNumber",
      label: t("phoneNumber"),
      render: (customer) => customer.phoneNumber || "-",
    },
    {
      key: "assetsCount",
      label: t("assetsCount"),
      render: (customer) => customer.assetCount?.toString() ?? "-",
    },
  ];
};
