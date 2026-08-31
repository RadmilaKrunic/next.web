import { ReactNode } from "react";

export type Filter = {
  name: string;
  value: string | boolean | string[];
};

export type QuickFilter = {
  key: string;
  label: string;
  selected?: boolean;
};

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
};
