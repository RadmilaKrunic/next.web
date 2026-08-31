import { createContext } from "react";

export interface Breadcrumb {
  label: string;
  href: string;
}

export interface BreadcrumbsContextType {
  breadcrumbs: Breadcrumb[];
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
}

export const BreadcrumbsContext = createContext<BreadcrumbsContextType>({
  breadcrumbs: [],
  setBreadcrumbs: () => {},
});
