import { useTranslation } from "react-i18next";
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";
import ClientsList from "./ClientsList/ClientsList";

function Clients() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  useBreadcrumbs([{ label: t("clients"), href: "/clients" }]);

  return <ClientsList />;
}

export default Clients;
