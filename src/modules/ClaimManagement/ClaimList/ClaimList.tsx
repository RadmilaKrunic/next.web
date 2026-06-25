import { useContext, useMemo, useState } from "react";
import { useListFilterHandlers } from "hooks/useListFilterHandlers";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ActivityIndicator } from "@bosch/react-frok";
import { useQueryClient } from "@tanstack/react-query";
import Filters from "components/ui/List/Filters/Filters";
import Table from "components/ui/List/Table/Table";
import Pagination from "components/ui/Pagination/Pagination";
import { QuickFilter, Filter } from "components/ui/List/List.types";
import GenericForm from "components/generics/Form/GenericForm.types";
import { HeaderUserData } from "api/services/header/action";
import { useBulkApproveClaims, useClaimById, useClaims } from "api/services/claims/hooks";
import { MessagesContext } from "contexts/messagescontext";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";
import DocumentsModal from "components/ui/DocumentsModal/DocumentsModal";
import MessagesModal from "components/ui/MessagesModal/MessagesModal";
import ClaimActionsFlyout from "./ClaimListTable/ClaimActionsFlyout/ClaimActionsFlyout";
import { Claim } from "./ClaimList.types";
import { filterClaims, getClaimNavigationPath } from "./ClaimList.utils";
import { getClaimListColumns } from "./ClaimList.columns.utils";
import "./ClaimList.scss";

function ClaimList() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const navigate = useNavigate();

  const QUICK_FILTERS: QuickFilter[] = [
    { key: "recentRequests", label: "recentRequests", selected: false },
    { key: "PENDING", label: "pendingApprovals", selected: false },
  ];
  const storedQuickFilters = JSON.parse(sessionStorage.getItem("claim-quickFilters") || "null");

  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const uiConfiguration = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const claimFiltersSection =
    uiConfiguration?.forms.find((f) => f.name === "claimFilters")?.sections[0] ?? null;
  const { setMessages } = useContext(MessagesContext);
  const { data: claims = [], isLoading: isClaimsLoading } = useClaims();
  const [quickFilters, setQuickFilters] = useState(storedQuickFilters ?? QUICK_FILTERS);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const appliedFiltersFromSessionStorage = JSON.parse(
    sessionStorage.getItem(`${claimFiltersSection?.name}-claim-advancedFilters`) || "[]",
  );
  const [advancedFilters, setAdvancedFilters] = useState<Filter[]>(
    appliedFiltersFromSessionStorage,
  );
  const [pagination, setPagination] = useState({
    page: Number(sessionStorage.getItem("claimList-currentPage")) || 1,
    pageSize: Number(sessionStorage.getItem("claimList-pageSize")) || 10,
  });

  const canPerformClaimDecision = useHasPermission([
    PERMISSIONS.APPROVAL.CAN_PERFORM_CLAIM_DECISION,
  ]);

  const selectedClaim = claims.find((c) => c.claimId === selectedClaimId);

  const documentClaimId = showDocumentModal ? (selectedClaimId ?? "") : "";
  const { data: claimDetail } = useClaimById(documentClaimId);
  const selectedClaimAttachments = claimDetail?.job?.asset?.attachments ?? [];

  const CLAIM_COLUMNS = useMemo(() => getClaimListColumns(t), [t]);

  const visibleColumns = useMemo(() => CLAIM_COLUMNS.map((col) => col.key), [CLAIM_COLUMNS]);

  const { handleToggleFilter, applyAdvancedFilters, resetAdvancedFilters } = useListFilterHandlers(
    setQuickFilters,
    setAdvancedFilters,
    setPagination,
    "claim",
  );

  const filteredClaims = useMemo(
    () => filterClaims(claims, quickFilters, searchValue, advancedFilters),
    [claims, quickFilters, searchValue, advancedFilters],
  );

  const paginatedClaims = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    return filteredClaims.slice(startIndex, startIndex + pagination.pageSize);
  }, [filteredClaims, pagination.page, pagination.pageSize]);

  const handlePageChange = (page: number) => {
    sessionStorage.setItem("claimList-currentPage", page.toString());
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (option: string) => {
    sessionStorage.setItem("claimList-pageSize", option);
    setPagination({ page: 1, pageSize: Number(option) });
  };

  const handleRowClick = (row: Claim) => {
    const navigateResult = navigate(getClaimNavigationPath(row));
    if (navigateResult instanceof Promise) {
      navigateResult.catch(() => undefined);
    }
  };

  const bulkApproveClaimsMutation = useBulkApproveClaims({
    onSuccess: () => {
      setSelectedRows([]);
      queryClient.invalidateQueries({ queryKey: ["claims"] }).catch(() => undefined);
      queryClient.removeQueries({ queryKey: ["claim"] });
      setMessages((prev) => [
        ...prev,
        { type: "success", text: t("successfulClaimsBulkApprove"), duration: 3000 },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { type: "error", text: t("errorClaimsBulkApprove"), duration: 3000 },
      ]);
    },
  });

  const handleBulkApprove = () => {
    bulkApproveClaimsMutation.mutate({ claimIds: selectedRows });
  };

  const approveActionButton = canPerformClaimDecision
    ? {
        icon: "check",
        label: t("approve"),
        disabled: selectedRows.length === 0,
        onClick: handleBulkApprove,
      }
    : undefined;

  if (isClaimsLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

  return (
    <div className="claims-list-container">
      <Filters
        quickFilters={quickFilters}
        filters={claimFiltersSection ?? undefined}
        applyAdvancedFilters={applyAdvancedFilters}
        resetAdvancedFilters={resetAdvancedFilters}
        onToggleFilter={handleToggleFilter}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchReset={() => setSearchValue("")}
        actionButton={approveActionButton}
        type={"claim"}
      />
      <Table<Claim>
        data={paginatedClaims}
        columns={CLAIM_COLUMNS}
        visibleColumns={visibleColumns}
        getRowKey={(row) => row.claimId}
        onRowClick={handleRowClick}
        renderRowActions={(claim) => (
          <ClaimActionsFlyout
            claim={claim}
            setSelectedClaimId={setSelectedClaimId}
            setShowDocumentModal={setShowDocumentModal}
            setShowMessagesModal={setShowMessagesModal}
          />
        )}
        selectable={canPerformClaimDecision}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        isRowSelectable={(claim) => claim.status === "PENDING"}
      />
      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        onPageChange={handlePageChange}
        onDropdownOptionChange={handlePageSizeChange}
        totalResults={filteredClaims.length}
      />
      {showMessagesModal && (
        <MessagesModal
          type="claim"
          jobId={selectedClaim?.jobId ?? ""}
          claimId={selectedClaimId ?? ""}
          isOpen={showMessagesModal}
          onClose={() => setShowMessagesModal(false)}
        />
      )}
      {showDocumentModal && (
        <DocumentsModal
          isOpen={showDocumentModal}
          attachments={selectedClaimAttachments}
          jobId={selectedClaim?.jobId ?? ""}
          onClose={() => setShowDocumentModal(false)}
          hideDelete={true}
        />
      )}
    </div>
  );
}

export default ClaimList;
