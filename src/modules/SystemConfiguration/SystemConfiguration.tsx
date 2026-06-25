import { useTranslation } from "react-i18next";
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";

function SystemConfiguration() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  useBreadcrumbs([{ label: t("systemConfiguration"), href: "/system-configuration" }]);

  return (
    <h1 style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      System Configuration
    </h1>
  );
}

export default SystemConfiguration;
