import { useTranslation } from "react-i18next";
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";
import ClaimList from "./ClaimList/ClaimList";

function ClaimManagement() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  useBreadcrumbs([{ label: t("claimList"), href: "/claim-list" }]);

  return <ClaimList />;
}

export default ClaimManagement;
