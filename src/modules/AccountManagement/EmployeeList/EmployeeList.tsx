import React, { useMemo, useState } from "react";
import { useBreadcrumbs } from "../../../hooks/useBreadcrumbs";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME_MS } from "../../../utils/queryConstants";
import { searchUsers } from "../../../api/services/users/action";
import Table from "../../../components/ui/List/Table/Table";
import { Employee, getEmployeeColumns } from "./EmployeeList.columns.config";
import Filters from "../../../components/ui/List/Filters/Filters";
import { useNavigate } from "react-router";
import { Button } from "@bosch/react-frok";
import "./EmployeeList.scss";
import Pagination from "../../../components/ui/Pagination/Pagination";
import { filterEmployees } from "./EmployeeList.utils";
import { HeaderUserData } from "../../../api/services/header/action";

function EmployeeList() {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const [searchValue, setSearchValue] = useState("");
  const [pagination, setPagination] = useState({
    page: Number(sessionStorage.getItem("employeeList-currentPage")) || 1,
    pageSize: Number(sessionStorage.getItem("employeeList-pageSize")) || 10,
  });
  const navigate = useNavigate();

  const { t } = useTranslation("translation", { keyPrefix: "app" });
  useBreadcrumbs([{ label: t("employees"), href: "/employee-list" }]);

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => searchUsers(user?.ascId || ""),
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: false,
  });
  const EMPLOYEE_COLUMNS = useMemo(() => getEmployeeColumns(t), [t]);
  const visibleColumns = useMemo(() => EMPLOYEE_COLUMNS.map((col) => col.key), [EMPLOYEE_COLUMNS]);

  const filteredEmployees = useMemo(
    () => filterEmployees(employees || [], searchValue),
    [employees, searchValue],
  );

  const handlePageChange = (page: number) => {
    sessionStorage.setItem("approvalList-currentPage", page.toString());
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (option: string) => {
    sessionStorage.setItem("approvalList-pageSize", option);
    setPagination({ page: 1, pageSize: Number(option) });
  };

  const isPaginationVisible = filteredEmployees.length > pagination.pageSize;

  return (
    <div className="employee-list-container">
      <Filters
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchReset={() => setSearchValue("")}
        actionButton={{
          icon: "add",
          label: t("addEmployee"),
          onClick: () => {
            navigate(`/add-employee`);
          },
        }}
        type="employee"
      />
      <Table<Employee>
        data={filteredEmployees}
        columns={EMPLOYEE_COLUMNS}
        visibleColumns={visibleColumns}
        getRowKey={(row) => row.userId}
        onRowClick={(employee) => {
          navigate(`/employee-overview/${employee.userId}`);
        }}
        renderRowActions={(employee) => (
          <Button
            icon={"options"}
            className="employee-actions-popover-trigger"
            tabIndex={0}
            aria-label="More employee options"
            data-testid={`employee-actions-popover-trigger-${employee.userId}`}
          />
        )}
      />
      {isPaginationVisible && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={handlePageChange}
          onDropdownOptionChange={handlePageSizeChange}
          totalResults={filteredEmployees.length}
        />
      )}
    </div>
  );
}

export default EmployeeList;
