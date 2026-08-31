import React, { useMemo, useState } from "react";
import { useBreadcrumbs } from "hooks/useBreadcrumbs";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME_MS } from "utils/queryConstants";
import { searchUsers } from "api/services/users/action";
import Table from "components/ui/List/Table/Table";
import { Employee, getEmployeeColumns } from "./EmployeeList.columns.config";
import Filters from "components/ui/List/Filters/Filters";
import { useNavigate } from "react-router";
import { ActivityIndicator, Button, Icon } from "@bosch/react-frok";
import "./EmployeeList.scss";
import Pagination from "components/ui/Pagination/Pagination";
import { HeaderUserData } from "api/services/header/action";
import { ScrollablePopover } from "components/ui/ScrollablePopover/ScrollablePopover";
import DeleteEmployeeDialog from "../DeleteEmployeeDialog/DeleteEmployeeDialog";
import { filterBySearchValue } from "../../AccountManagement.utils";

function EmployeeList() {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [pagination, setPagination] = useState({
    page: Number(sessionStorage.getItem("employeeList-currentPage")) || 1,
    pageSize: Number(sessionStorage.getItem("employeeList-pageSize")) || 10,
  });
  const navigate = useNavigate();

  const { t } = useTranslation("translation", { keyPrefix: "app" });
  useBreadcrumbs([{ label: t("employees"), href: "/employee-list" }]);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => searchUsers(user?.ascId || ""),
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: true,
    select: (data) => {
      if (!data) return [];

      return [...data].sort((a, b) => {
        const dateA = new Date(a.createdOn).getTime();
        const dateB = new Date(b.createdOn).getTime();

        return dateB - dateA;
      });
    },
  });
  const EMPLOYEE_COLUMNS = useMemo(() => getEmployeeColumns(t), [t]);
  const visibleColumns = useMemo(() => EMPLOYEE_COLUMNS.map((col) => col.key), [EMPLOYEE_COLUMNS]);

  const filteredEmployees = useMemo(
    () => filterBySearchValue(employees || [], searchValue),
    [employees, searchValue],
  );

  const handlePageChange = (page: number) => {
    sessionStorage.setItem("employeeList-currentPage", page.toString());
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (option: string) => {
    sessionStorage.setItem("employeeList-pageSize", option);
    sessionStorage.setItem("employeeList-currentPage", "1");
    setPagination({ page: 1, pageSize: Number(option) });
  };

  const isPaginationVisible = filteredEmployees.length > pagination.pageSize;

  const paginatedEmployees = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredEmployees.slice(startIndex, endIndex);
  }, [filteredEmployees, pagination.page, pagination.pageSize]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

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
        data={paginatedEmployees}
        columns={EMPLOYEE_COLUMNS}
        visibleColumns={visibleColumns}
        getRowKey={(row) => row.userId}
        onRowClick={(employee) => {
          navigate(`/employee-overview/${employee.userId}`);
        }}
        renderRowActions={(employee) => (
          <ScrollablePopover
            data-testid={`employee-actions-popover-${employee.userId}`}
            trigger={
              <Button
                icon={"options"}
                className="actions-popover-trigger"
                tabIndex={0}
                aria-label="More employee options"
                data-testid={`employee-actions-popover-trigger-${employee.userId}`}
              />
            }
            className="actions-popover"
          >
            <button
              type="button"
              className="employee-action-button"
              data-testid={`employee-action-delete-${employee.userId}`}
              onClick={() => {
                setSelectedEmployeeId(employee.userId);
                setShowDeleteDialog(true);
              }}
            >
              <Icon iconName="delete" aria-hidden="true" />
              <span>{t("deleteUser")}</span>
            </button>
            <button
              type="button"
              className="employee-action-button"
              data-testid={`employee-action-edit-${employee.userId}`}
              onClick={() => {
                navigate(`/employee-overview/${employee.userId}`);
              }}
            >
              <Icon iconName="edit" aria-hidden="true" />
              <span>{t("editEmployee")}</span>
            </button>
          </ScrollablePopover>
        )}
        emptyListMessage="noEmployeesFound"
      />
      <DeleteEmployeeDialog
        setShowDeleteDialog={setShowDeleteDialog}
        showDeleteDialog={showDeleteDialog}
        employeeId={selectedEmployeeId || ""}
        setPagination={setPagination}
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
