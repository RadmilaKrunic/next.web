import { ReactNode } from "react";

export type EmployeeColumnKey =
  | "name"
  | "employeeCode"
  | "email"
  | "phoneNumber"
  | "role"
  | "createdOn";
export type EmployeeColumnConfig = {
  key: EmployeeColumnKey;
  label: string;
  render: (employee: Employee) => string | ReactNode;
};

export type Employee = {
  userId: string;
  role: string;
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
      key: "role",
      label: t("employeeRole"),
      render: (employee) => employee.role || "-",
    },
    {
      key: "createdOn",
      label: t("createdOn"),
      render: (employee) => employee.createdOn || "-",
    },
  ];
};
