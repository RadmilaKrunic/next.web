const DOCK_LOCALE_OVERRIDES: Record<string, string> = {
  "en-TR": "en-gb",
  "fr-TN": "fr-fr",
  "ar-SA": "ar-ae",
};

export function toDockLocale(locale: string): string {
  return DOCK_LOCALE_OVERRIDES[locale] ?? locale.toLowerCase();
}

export function getDockElement(): Element | null {
  return document.querySelector("dock-privacy-settings");
}

export function syncDockLocale(locale: string): void {
  document.documentElement.lang = locale;
  void customElements.whenDefined("dock-privacy-settings").then(() => {
    getDockElement()?.setAttribute("locale", toDockLocale(locale));
  });
}
