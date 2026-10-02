import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CustomerOrder } from "api/services/customers/customers.types";
import { useCustomerOrders } from "api/services/customers/hooks";
import ActivityIndicatorWithDelay from "components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";
import { Column } from "components/ui/List/List.types";
import Filters from "components/ui/List/Filters/Filters";
import Table from "components/ui/List/Table/Table";
import Pagination from "components/ui/Pagination/Pagination";
import { formatDateToDisplay } from "utils/dateFormatter";
import "./ClientOrdersTab.scss";

interface ClientOrdersTabProps {
  clientId: string;
}

function ClientOrdersTab({ clientId }: Readonly<ClientOrdersTabProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [searchValue, setSearchValue] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const {
    data: ordersPage,
    isLoading,
    isError,
  } = useCustomerOrders(clientId, {
    searchTerm: searchValue.trim() || undefined,
    page: pagination.page - 1,
    size: pagination.pageSize,
  });

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setPagination((previous) => ({ ...previous, page: 1 }));
  };

  const columns: Column<CustomerOrder>[] = useMemo(
    () => [
      { key: "orderId", label: t("orderId"), render: (order) => order.orderId },
      { key: "assets", label: t("assets"), render: (order) => order.assets },
      {
        key: "createdOn",
        label: t("createdOn"),
        render: (order) => (order.createdOn ? formatDateToDisplay(order.createdOn) : "-"),
      },
      {
        key: "updatedOn",
        label: t("updatedOn"),
        render: (order) => (order.updatedOn ? formatDateToDisplay(order.updatedOn) : "-"),
      },
    ],
    [t],
  );

  return (
    <div className="client-orders-tab">
      <Filters
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onSearchReset={() => handleSearchChange("")}
      />
      {isLoading && <ActivityIndicatorWithDelay delay={500} />}
      {isError && <p role="alert">{t("errorLoadingOrders")}</p>}
      {!isLoading && !isError && (
        <>
          <Table
            data={ordersPage?.content ?? []}
            columns={columns}
            visibleColumns={columns.map((column) => column.key)}
            getRowKey={(order) => order.orderId}
            renderRowActions={() => null}
            emptyListMessage="noOrdersFoundMessage"
          />
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            onPageChange={(page) => setPagination((previous) => ({ ...previous, page }))}
            onDropdownOptionChange={(option) =>
              setPagination({ page: 1, pageSize: Number(option) })
            }
            totalResults={ordersPage?.page.totalElements ?? 0}
          />
        </>
      )}
    </div>
  );
}

export default ClientOrdersTab;
