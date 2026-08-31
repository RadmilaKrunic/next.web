import { useContext, useEffect } from "react";
import { Breadcrumb, BreadcrumbsContext } from "../contexts/breadcrumbscontext";

export function useBreadcrumbs(breadcrumbs: Breadcrumb[] | []) {
  const { setBreadcrumbs } = useContext(BreadcrumbsContext);
  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(breadcrumbs)]);
}
