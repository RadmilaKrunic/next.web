import { Job } from "../modules/JobManagement/JobList/JobList.types";

export const getCustomerDisplayName = (customer: Job["customer"]): string => {
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
