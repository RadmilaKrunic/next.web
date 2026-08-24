import { ServiceCenter } from "../../api/services/serviceCenters/serviceCenters.types";
import { Employee } from "./Employees/EmployeeList/EmployeeList.columns.config";

export function filterBySearchValue<T extends Employee | ServiceCenter>(
  list: T[],
  searchValue: string,
): T[] {
  return list.filter((item) => {
    if (searchValue.trim()) {
      const query = searchValue.toLowerCase();
      const values = Object.values(item).map((v) => (v ? v.toString().toLowerCase() : ""));
      const matches = values.some((v) => v.includes(query));
      if (!matches) return false;
    }

    return true;
  });
}
