import { Link } from "react-router-dom";
import "./Footer.scss";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CountryConfig } from "../../../api/services/countryConfiguration/countryConfiguration";

function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const userData = queryClient.getQueryData<{ countryCode?: string }>(["user"]);
  const countryConfiguration = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    userData?.countryCode,
  ]);
  const footerLinks = countryConfiguration?.links?.footer || [];

  let copyrightPartOne = "";
  let copyrightPartTwo = "";
  let imprintLink = "#";
  let privacyLink = "#";
  let termsLink = "#";
  let ossBundleLink = "#";
  let paiaLink = "#";

  footerLinks.forEach((item) => {
    switch (item.name) {
      case "copyrightPartOne":
        copyrightPartOne = item.value;
        break;
      case "copyrightPartTwo":
        copyrightPartTwo = item.value;
        break;
      case "imprintLink":
        imprintLink = item.value;
        break;
      case "privacyLink":
        privacyLink = item.value;
        break;
      case "termsLink":
        termsLink = item.value;
        break;
      case "ossBundleLink":
        ossBundleLink = item.value;
        break;
      case "paiaLink":
        paiaLink = item.value;
        break;
    }
  });

  return (
    <footer>
      <div>{`${copyrightPartOne} ${currentYear}, ${t(copyrightPartTwo)}`}</div>
      <span className="footer-links">
        <Link to={imprintLink} rel="noopener noreferrer" target="_blank">
          {t("imprint")}
        </Link>
        <Link to={privacyLink} rel="noopener noreferrer" target="_blank">
          {t("dataPrivacy")}
        </Link>
        <Link to={termsLink} rel="noopener noreferrer" target="_blank">
          {t("termsLink")}
        </Link>
        <Link to={ossBundleLink} rel="noopener noreferrer" target="_blank">
          {t("ossBundleLink")}
        </Link>
        {paiaLink !== "#" && (
          <Link to={paiaLink} rel="noopener noreferrer" target="_blank">
            {t("paiaLink")}
          </Link>
        )}
      </span>
    </footer>
  );
}

export default Footer;
