import { useTranslation } from "react-i18next";
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";

function Reports() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  useBreadcrumbs([{ label: t("reports"), href: "/reports" }]);

  return (
    <h1 style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      {t("reports")}
    </h1>
  );
}

export default Reports;
