import { CustomerType } from "../modules/JobManagement/JobList/JobListTable/JobListColumns.config";

export const CUSTOMER_TYPE_ICON_NAME: Record<CustomerType, string> = {
  INDIVIDUAL_PRIVATE: "user",
  INDIVIDUAL_PRO: "user-worker",
  COMPANY: "building",
  DEALERSHIP: "store",
};
