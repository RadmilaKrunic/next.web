import { ReactNode } from "react";
import { formatDateToDisplay } from "utils/dateFormatter";

export type EmployeeColumnKey =
  | "name"
  | "employeeCode"
  | "email"
  | "phoneNumber"
  | "accountRoles"
  | "createdOn";
export type EmployeeColumnConfig = {
  key: EmployeeColumnKey;
  label: string;
  render: (employee: Employee) => string | ReactNode;
};

export type Employee = {
  userId: string;
  accountRoles: { id: string; name: string }[];
  ascId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
  phoneNumber: string;
  boschId: string;
  createdOn: string;
};

export const getEmployeeColumns = (t: (key: string) => string): EmployeeColumnConfig[] => {
  return [
    {
      key: "name",
      label: t("employeeName"),
      render: (employee) => `${employee.firstName} ${employee.lastName}`,
    },
    {
      key: "employeeCode",
      label: t("employeeCode"),
      render: (employee) => employee.employeeCode || "-",
    },
    {
      key: "email",
      label: t("employeeEmail"),
      render: (employee) => employee.email || "-",
    },
    {
      key: "accountRoles",
      label: t("employeeRole"),
      render: (employee) => employee.accountRoles.map((role) => role.name).join(", ") || "-",
    },
    {
      key: "createdOn",
      label: t("createdOn"),
      render: (employee) => formatDateToDisplay(employee.createdOn) || "-",
    },
  ];
};
