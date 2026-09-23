export type CustomerType = "INDIVIDUAL_PRIVATE" | "INDIVIDUAL_PRO" | "COMPANY" | "DEALERSHIP";

export const CUSTOMER_TYPE_ICON_NAME: Record<CustomerType, string> = {
  INDIVIDUAL_PRIVATE: "user",
  INDIVIDUAL_PRO: "user-worker",
  COMPANY: "building",
  DEALERSHIP: "store",
};
