import { ReactNode } from "react";
import { ReimbursementAsc } from "@/api/services/reimbursements/reimbursements.types";

export type ReimbursementAscColumnKey = "name" | "customerCode" | "email" | "address";

export type ReimbursementAscColumnConfig = {
  key: ReimbursementAscColumnKey;
  label: string;
  render: (asc: ReimbursementAsc) => string | ReactNode;
};

export const getReimbursementAscColumns = (
  t: (key: string) => string,
): ReimbursementAscColumnConfig[] => {
  return [
    {
      key: "name",
      label: t("ascName"),
      render: (asc) => `${asc.ascName}`,
    },
    {
      key: "customerCode",
      label: t("customerCode"),
      render: (asc) => asc.customerCode || "-",
    },
    {
      key: "email",
      label: t("email"),
      render: (asc) => asc.email || "-",
    },
    {
      key: "address",
      label: t("address"),
      render: (asc) => {
        const addrProps: Array<keyof ReimbursementAsc["address"]> = [
          "street",
          "houseNumber",
          "additionalDetails",
          "neighborhood",
          "district",
          "stateProvinceRegion",
          "city",
        ];
        const addressValues: string[] = [];
        addrProps.forEach((item) => {
          if (asc.address[item]) {
            addressValues.push(asc.address[item]);
          }
        });
        const address = addressValues.join(",");
        return address || "-";
      },
    },
  ];
};
