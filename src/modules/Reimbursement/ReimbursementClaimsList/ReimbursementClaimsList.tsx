import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { useBreadcrumbs } from "hooks/useBreadcrumbs";
import { useReimbursementClaims } from "api/services/reimbursements/hooks";
import Table from "components/ui/List/Table/Table";
import Pagination from "components/ui/Pagination/Pagination";
import { getReimbursementClaimsColumns } from "./ReimbursementClaimsList.columns.config";
import {
  ReimbursementClaim,
  Reimbursement,
} from "api/services/reimbursements/reimbursements.types";
import "../Reimbursement.scss";
import { getClaimNavigationPath } from "@/modules/ClaimManagement/ClaimList/ClaimList.utils";
import { PERMISSIONS } from "@/utils/Permissions";
import { useHasPermission } from "@/hooks/useHasPermission";
import { ActivityIndicator } from "@bosch/react-frok";

function ReimbursementClaimsList() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { reimbursementId } = useParams<{ reimbursementId: string }>();
  const navigate = useNavigate();
  const hasAscListViewPermission = useHasPermission([
    PERMISSIONS.REIMBURSEMENT.CAN_VIEW_ASC_LIST_TABLE,
  ]);
  const { data: reimbursement = {} as Reimbursement, isLoading } = useReimbursementClaims(
    reimbursementId || "",
  );
  const ascNameQuery = reimbursement?.ascName
    ? `?ascName=${encodeURIComponent(reimbursement.ascName)}`
    : "";
  const breadcrumbsList = [];
  if (hasAscListViewPermission) {
    breadcrumbsList.push({
      label: t("ASCs"),
      href: "/reimbursement#asc-list",
    });
  }
  breadcrumbsList.push(
    {
      label: t("reimbursementDetail"),
      href: hasAscListViewPermission
        ? `reimbursement-detail/${reimbursement?.ascId || ""}${ascNameQuery}`
        : "reimbursements",
    },
    {
      label: t("claims"),
      href: "#",
    },
  );

  useBreadcrumbs(breadcrumbsList);

  const [pagination, setPagination] = useState({
    page: Number(sessionStorage.getItem("reimbursementClaims-currentPage")) || 1,
    pageSize: Number(sessionStorage.getItem("reimbursementClaims-pageSize")) || 10,
  });

  const claims = useMemo(() => reimbursement?.claims || [], [reimbursement?.claims]);
  const paginatedClaims = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return claims.slice(startIndex, endIndex);
  }, [claims, pagination.page, pagination.pageSize]);
  const CLAIMS_COLUMNS = useMemo(() => getReimbursementClaimsColumns(t), [t]);
  const visibleColumns = useMemo(() => CLAIMS_COLUMNS.map((col) => col.key), [CLAIMS_COLUMNS]);

  const handlePageChange = (page: number) => {
    sessionStorage.setItem("reimbursementClaims-currentPage", page.toString());
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (option: string) => {
    sessionStorage.setItem("reimbursementClaims-pageSize", option);
    setPagination({ page: 1, pageSize: Number(option) });
  };

  const handleRowClick = (claim: ReimbursementClaim) => {
    const navigateResult = navigate(getClaimNavigationPath(claim.claimId));
    if (navigateResult instanceof Promise) {
      navigateResult.catch(() => undefined);
    }
  };

  const isPaginationVisible = (claims?.length || 0) > pagination.pageSize;
  const { ascName, customerCode } = reimbursement || {};

  if (isLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }
  return (
    <div className="reimbursement-claims-container">
      <div className="reimbursement-header">
        <div>
          <span className="strong">{`${t("reimbursementId")}: ${reimbursementId}`}</span>
          {ascName && (
            <span className="header-with-separator">{`${t("ascName")}: ${ascName || ""}`}</span>
          )}
          {customerCode && (
            <span className="header-with-separator">{`${t("customerCode")}: ${customerCode || ""}`}</span>
          )}
        </div>
      </div>
      <Table<ReimbursementClaim>
        data={paginatedClaims}
        columns={CLAIMS_COLUMNS}
        visibleColumns={visibleColumns}
        getRowKey={(row) => row.claimId}
        onRowClick={handleRowClick}
        renderRowActions={() => null}
      />
      {isPaginationVisible && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={handlePageChange}
          onDropdownOptionChange={handlePageSizeChange}
          totalResults={claims?.length || 0}
        />
      )}
    </div>
  );
}

export default ReimbursementClaimsList;
