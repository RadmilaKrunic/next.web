import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";

type JsonObject = Record<string, unknown>;
type LocaleModule = { default: JsonObject };

const modules = import.meta.glob<LocaleModule>("../i18n/**/*.json", {
  eager: true,
});

const resources: Resource = Object.entries(modules).reduce((acc, [path, mod]) => {
  const match = /bass-([^/]+)\.json$/.exec(path) || /\/([^/]+)\.json$/.exec(path);

  if (!match) return acc;

  const locale = match[1];
  const messages = mod.default;

  acc[locale] = { translation: messages };
  return acc;
}, {});

const DEFAULT_LANG = "en-US";

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANG,
  fallbackLng: DEFAULT_LANG,
  supportedLngs: Object.keys(resources),
  interpolation: { escapeValue: false },
});

export default i18n;
