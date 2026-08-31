import { useTranslation } from "react-i18next";
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";

function Clients() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  useBreadcrumbs([{ label: t("clients"), href: "/clients" }]);

  return (
    <h1 style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      {t("clients")}
    </h1>
  );
}

export default Clients;
