import { useTranslation } from "react-i18next";
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";

function UserManagement() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  useBreadcrumbs([{ label: t("userManagement"), href: "/user-management" }]);

  return (
    <h1 style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      User Management
    </h1>
  );
}

export default UserManagement;
