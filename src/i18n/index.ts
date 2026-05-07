import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "./locales/de.json";
import en from "./locales/en.json";

const GERMAN_COUNTRIES = ["AT", "DE", "CH", "Österreich", "Deutschland", "Schweiz", "Austria", "Germany", "Switzerland"];

export const LANG_STORAGE_KEY = "evendle.lang";
export const LANG_MANUAL_KEY = "evendle.lang.manual";

export function languageForCountry(country?: string | null): "de" | "en" {
  if (!country) return "en";
  return GERMAN_COUNTRIES.includes(country.trim()) ? "de" : "en";
}

function detectInitialLanguage(): "de" | "en" {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (stored === "de" || stored === "en") return stored;
  const browser = (navigator.language || "en").toLowerCase();
  return browser.startsWith("de") ? "de" : "en";
}

const initialLang = detectInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    lng: initialLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });

document.documentElement.lang = initialLang;

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

export function setAppLanguage(lang: "de" | "en", manual = false) {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  if (manual) localStorage.setItem(LANG_MANUAL_KEY, "1");
  i18n.changeLanguage(lang);
}

export function applyLanguageFromCountry(country?: string | null) {
  if (localStorage.getItem(LANG_MANUAL_KEY) === "1") return;
  const lang = languageForCountry(country);
  setAppLanguage(lang, false);
}

export default i18n;
