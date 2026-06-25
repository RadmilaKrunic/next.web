import "./PopoverContent.scss";
import { Dropdown, Icon } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import i18n from "../../../../../i18n";
import { SINGLE_KEY_ID_PROFILE_API } from "../../../../../api/endpoints";
import { useQueryClient } from "@tanstack/react-query";
import { HeaderUserData } from "../../../../../api/services/header/action";
import { CountryConfig } from "../../../../../api/services/countryConfiguration/countryConfiguration";
import { useState, useEffect } from "react";
import { useUpdateUserLanguagePreference } from "../../../../../api/services/header/hooks";

function PopoverContent() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const { firstName = "", lastName = "", email = "" } = user || {};
  const profileImageSrc = ""; // Placeholder for profile image source
  const countryCode = user?.countryCode;

  const countryConfiguration = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    countryCode,
  ]);
  const primaryLanguage = countryConfiguration?.localizationConfiguration.find(
    (lang) => lang.primary === true,
  );
  const languageOptions =
    countryConfiguration?.localizationConfiguration.map((lang) => ({
      name: "",
      value: lang.language,
      label: t(lang.language),
    })) || [];

  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    const resolved = user?.language ?? primaryLanguage?.language ?? "en";
    localStorage.setItem("selectedLanguage", resolved);
    return resolved;
  });

  const { mutate: updateLanguagePreference } = useUpdateUserLanguagePreference();

  useEffect(() => {
    void i18n?.changeLanguage(currentLanguage);
  }, [currentLanguage]);

  const handleLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    try {
      localStorage.removeItem("selectedLanguage");
      const logoutUrl = `${baseUrl}/v1/auth/logout`;
      setTimeout(() => {
        globalThis.location.replace(logoutUrl);
      }, 100);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="account-popover">
      <div className="account-user">
        {profileImageSrc ? (
          <img src={profileImageSrc} alt="Profile" className="profile-img" />
        ) : (
          <div className="profile-img">{firstName?.charAt(0)}</div>
        )}

        <div className="user-info">
          <p className="user-name">{firstName + " " + lastName}</p>
          <p className="user-email" title={email}>
            {email}
          </p>
        </div>
      </div>
      <div className="account-links">
        <a
          className="link-item"
          href={SINGLE_KEY_ID_PROFILE_API}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon iconName="my-brand-frame" className="icon" />
          {t("profileId")}
        </a>
        <span className="language-dropdown-container">
          <Icon iconName="chat-language" className="icon" />
          <Dropdown
            className="language-dropdown"
            value={currentLanguage}
            onChange={(e) => {
              const newLanguage = e.target.value;
              setCurrentLanguage(newLanguage);
              localStorage.setItem("selectedLanguage", newLanguage);
              void i18n?.changeLanguage(newLanguage);
              updateLanguagePreference(newLanguage.toLocaleUpperCase());
            }}
            options={languageOptions}
          />
        </span>
        <button className="link-item" onClick={handleLogout} type="button">
          <Icon iconName="logout" className="icon" />
          {t("logout")}
        </button>
      </div>
    </div>
  );
}

export default PopoverContent;
