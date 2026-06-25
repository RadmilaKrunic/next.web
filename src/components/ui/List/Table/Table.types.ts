import { ReactNode } from "react";
import { Column } from "../List.types";

export type TableProps<T> = {
  data: T[];
  columns: Column<T>[];
  visibleColumns: string[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  renderRowActions: (row: T) => ReactNode;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selected: string[]) => void;
  isRowSelectable?: (row: T) => boolean;
};
