import { Button, Checkbox, Dialog } from "@bosch/react-frok";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { CountryConfig } from "../../../api/services/countryConfiguration/countryConfiguration";
import { HeaderUserData } from "../../../api/services/header/action";
import { useAcceptConsent } from "../../../api/services/consent/hooks";
import { useFocusTrap } from "../../../hooks/useFocusTrap";
import "./ConsentModal.scss";

interface ConsentModalProps {
  isOpen: boolean;
}

function ConsentModal({ isOpen }: Readonly<ConsentModalProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const modalRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  const queryClient = useQueryClient();
  const userData = queryClient.getQueryData<HeaderUserData>(["user"]);
  const countryConfig = queryClient.getQueryData<CountryConfig>([
    "countryConfiguration",
    userData?.countryCode,
  ]);

  const consent = userData?.consent;
  const showTac = consent?.tac.isNewVersionAvailable ?? false;
  const showPrivacy = consent?.privacy.isNewVersionAvailable ?? false;

  const footerLinks = countryConfig?.links?.footer ?? [];
  const privacyUrl = footerLinks.find((l) => l.name === "privacyLink")?.value ?? "#";
  const termsUrl = footerLinks.find((l) => l.name === "termsLink")?.value ?? "#";

  const allChecked = (!showTac || termsChecked) && (!showPrivacy || privacyChecked);

  const { mutate: acceptConsent, isPending } = useAcceptConsent();

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
    } else if (previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  // Make background content inert so keyboard and pointer cannot reach it
  useEffect(() => {
    const appContainer = document.querySelector<HTMLElement>(".app-container");
    if (!appContainer) return;
    if (isOpen) {
      appContainer.setAttribute("inert", "");
      appContainer.setAttribute("aria-hidden", "true");
    }
    return () => {
      appContainer.removeAttribute("inert");
      appContainer.removeAttribute("aria-hidden");
    };
  }, [isOpen]);

  useFocusTrap(modalRef, isOpen);

  const handleExit = (e: React.MouseEvent<HTMLButtonElement>) => {
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

  const handleAccept = () => {
    if (!allChecked || isPending) return;
    acceptConsent({
      acceptedTacVersion: consent?.tac.newVersionName ?? null,
      acceptedPrivacyVersion: consent?.privacy.newVersionName ?? null,
      locale: userData?.locale ?? "",
    });
  };

  return (
    <Dialog
      ref={modalRef}
      modal
      open={isOpen}
      title={t("consentModalTitle")}
      className="consent-modal"
      data-testid="consent-modal"
      onClose={(event) => {
        if (event) {
          handleExit(event as React.MouseEvent<HTMLButtonElement>);
          event.stopPropagation();
          event.preventDefault();
        }
      }}
    >
      <div className="consent-modal__body">
        <h1 className="consent-modal__heading">{t("consentModalHeading")}</h1>
        <p id="consent-modal-description" className="consent-modal__description">
          {t("consentModalDescription")}
        </p>
        <fieldset className="consent-modal__checkboxes">
          {showPrivacy && (
            <div className="consent-modal__checkbox-row">
              <Checkbox
                id="consent-privacy"
                label=""
                checked={privacyChecked}
                onChange={(e) => setPrivacyChecked(e.target.checked)}
                data-testid="consent-privacy-checkbox"
              />
              <label htmlFor="consent-privacy" className="consent-modal__checkbox-text">
                {t("consentModalPrivacyPrefix")}{" "}
                <a
                  href={privacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="consent-modal__link"
                >
                  {t("consentModalPrivacyLink")}
                </a>
                {t("consentModalPrivacySuffix")}
              </label>
            </div>
          )}
          {showTac && (
            <div className="consent-modal__checkbox-row">
              <Checkbox
                id="consent-terms"
                label=""
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
                data-testid="consent-terms-checkbox"
              />
              <label htmlFor="consent-terms" className="consent-modal__checkbox-text">
                {t("consentModalTermsPrefix")}{" "}
                <a
                  href={termsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="consent-modal__link"
                >
                  {t("consentModalTermsLink")}
                </a>
                {t("consentModalTermsSuffix")}
              </label>
            </div>
          )}
        </fieldset>
      </div>
      <div className="consent-modal__actions modal-actions">
        <Button mode="secondary" onClick={handleExit} data-testid="consent-exit-button">
          {t("consentModalExitButton")}
        </Button>
        <Button
          mode="primary"
          onClick={() => {
            handleAccept();
          }}
          disabled={!allChecked || isPending}
          aria-disabled={!allChecked || isPending}
          data-testid="consent-accept-button"
        >
          {t("consentModalAcceptButton")}
        </Button>
      </div>
    </Dialog>
  );
}

export default ConsentModal;
