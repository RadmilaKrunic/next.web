import {
  Table as FrokTable,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Checkbox,
} from "@bosch/react-frok";
import "./Table.scss";
import { useTranslation } from "react-i18next";
import { TableProps } from "./Table.types";

function Table<T>({
  data,
  columns,
  visibleColumns,
  getRowKey,
  onRowClick,
  renderRowActions,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  isRowSelectable,
}: Readonly<TableProps<T>>) {
  const visibleColumnDefs = columns.filter((col) => visibleColumns.includes(col.key));
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const allRowKeys = data.map(getRowKey);
  const selectableRowKeys = isRowSelectable
    ? data.filter(isRowSelectable).map(getRowKey)
    : allRowKeys;
  const allSelected =
    selectable &&
    selectableRowKeys.length > 0 &&
    selectableRowKeys.every((key) => selectedRows.includes(key));

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : selectableRowKeys);
  };

  const handleSelectRow = (rowKey: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedRows.includes(rowKey)
        ? selectedRows.filter((key) => key !== rowKey)
        : [...selectedRows, rowKey],
    );
  };

  return (
    <div className="job-table-wrapper">
      <FrokTable className="job-table">
        <TableHead>
          <TableRow>
            {selectable ? (
              <TableCell key="checkbox-header" header width="auto" className="checkbox-cell">
                <Checkbox
                  id="select-all-checkbox"
                  label=""
                  checked={allSelected}
                  onClick={(e) => e.stopPropagation()}
                  onChange={handleSelectAll}
                />
              </TableCell>
            ) : (
              <></>
            )}
            {visibleColumnDefs.map((column) => (
              <TableCell key={column.key} header data-testid={`header-${column.key}`}>
                {column.label}
              </TableCell>
            ))}
            <TableCell key="actions-header" header width="auto" />
          </TableRow>
        </TableHead>

        {data.length > 0 ? (
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={getRowKey(row)}
                className={`${onRowClick ? "clickable-row" : ""}${selectable && selectedRows.includes(getRowKey(row)) ? " selected-row" : ""}`}
                tabIndex={onRowClick ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRowClick?.(row);
                  }
                }}
              >
                {selectable ? (
                  <TableCell
                    key={`${getRowKey(row)}-checkbox`}
                    width="auto"
                    className="checkbox-cell"
                  >
                    <Checkbox
                      id={`row-checkbox-${getRowKey(row)}`}
                      label=""
                      checked={selectedRows.includes(getRowKey(row))}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleSelectRow(getRowKey(row))}
                      disabled={isRowSelectable ? !isRowSelectable(row) : false}
                    />
                  </TableCell>
                ) : (
                  <></>
                )}
                {visibleColumnDefs.map((column) => (
                  <TableCell
                    key={column.key}
                    data-testid={`body-${column.key}`}
                    onClick={() => {
                      onRowClick?.(row);
                    }}
                  >
                    {column.render(row)}
                  </TableCell>
                ))}

                <TableCell key={`${getRowKey(row)}-actions`} width="auto">
                  {renderRowActions(row)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        ) : (
          <TableBody>
            <TableRow>
              <TableCell colSpan={visibleColumns.length + (selectable ? 2 : 1)}>
                <p className="no-jobs-found-message">{t("noJobsFoundMessage")}</p>
              </TableCell>
            </TableRow>
          </TableBody>
        )}
      </FrokTable>
    </div>
  );
}

export default Table;
