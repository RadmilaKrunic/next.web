import { useTranslation } from "react-i18next";
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";

function Reimbursement() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  useBreadcrumbs([{ label: t("reimbursement"), href: "/reimbursement" }]);

  return (
    <h1 style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      {t("reimbursement")}
    </h1>
  );
}

export default Reimbursement;
