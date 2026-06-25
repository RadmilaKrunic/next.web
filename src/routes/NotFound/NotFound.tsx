import { useTranslation } from "react-i18next";

function NotFound() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  return <div>{t("notFound")}</div>;
}

export default NotFound;
