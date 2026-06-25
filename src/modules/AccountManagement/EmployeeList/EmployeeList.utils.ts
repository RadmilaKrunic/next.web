import { Employee } from "./EmployeeList.columns.config";

export function filterEmployees(employees: Employee[], searchValue: string): Employee[] {
  return employees.filter((employee) => {
    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      const values = Object.values(employee).map((v) => (v ? v.toString().toLowerCase() : ""));
      const matches = values.some((v) => v.includes(query));
      if (!matches) return false;
    }

    return true;
  });
}
