/**
 * Promptition — Internationalization Core
 * core/i18n.js
 *
 * Lightweight i18n for the static site. Supports English and Arabic with a
 * `t()` helper for UI strings, persisted language selection, automatic
 * `<html dir>/<lang>` application and static DOM translation via
 * `data-i18n` / `data-i18n-attr` attributes.
 */

import ar from "../i18n/ar.js";
import { CONFIG } from "./config.js";

const STORAGE_KEY = "promptition:lang";
const SUPPORTED = ["en", "ar"];
const DEFAULT_LANG = "en";

/** Load a translation dictionary (sync, bundled). */
function loadDict(lang) {
  if (lang === "ar") return ar;
  return {};
}

let state = {
  lang: DEFAULT_LANG,
  dict: {},
};

/** Current active language code. */
export function getLang() {
  return state.lang;
}

/** Resolve the persisted language, falling back to the default. */
export function resolveLang() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_LANG;
}

/**
 * Translate a UI string into the active language.
 * @param {string} key  English source string.
 * @param {object} [vars]  `{name}` placeholders to interpolate.
 */
export function t(key, vars) {
  let value = state.dict[key] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.split(`{${name}}`).join(String(replacement));
    }
  }
  return value;
}

/** Apply dir/lang attributes to the document root. */
export function applyDocumentLang() {
  const root = document.documentElement;
  root.lang = state.lang;
  root.dir = state.lang === "ar" ? "rtl" : "ltr";
}

/** Switch language, persist it and re-render the page shell. */
export function setLang(lang) {
  if (!SUPPORTED.includes(lang)) return;
  state.lang = lang;
  state.dict = loadDict(lang);
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
  applyDocumentLang();
  applyStaticTranslations();
  localizeConfig();
  window.dispatchEvent(new CustomEvent("promptition:lang", { detail: { lang } }));
}

/**
 * Translate static DOM: text of `[data-i18n]` elements and attributes
 * declared with `data-i18n-attr` (JSON like `{"aria-label":"Search"}`).
 */
export function applyStaticTranslations(root = document) {
  const targets = root.querySelectorAll("[data-i18n]");
  targets.forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key) node.textContent = t(key);
  });
  const attrTargets = root.querySelectorAll("[data-i18n-attr]");
  attrTargets.forEach((node) => {
    try {
      const map = JSON.parse(node.getAttribute("data-i18n-attr") || "{}");
      for (const [attr, key] of Object.entries(map)) {
        node.setAttribute(attr, t(key));
      }
    } catch {
      /* malformed attr map — skip */
    }
  });
}

/** Initialise i18n before app boot: load persisted language and apply dir. */
export function initI18n() {
  state.lang = resolveLang();
  state.dict = loadDict(state.lang);
  applyDocumentLang();
  applyStaticTranslations();
  localizeConfig();
}

/**
 * Localize the shared CONFIG collection metadata (label, singular,
 * description) in place so components reading CONFIG directly render
 * translated text. Non-destructive: English values remain the source.
 */
function localizeConfig() {
  const active = state.lang === "ar";
  for (const entry of CONFIG.collections) {
    const cached = entry._en || {};
    cached.label ??= entry.label;
    cached.singular ??= entry.singular;
    cached.description ??= entry.description;
    entry._en = cached;

    entry.label = active ? t(cached.label) : cached.label;
    entry.singular = active ? t(cached.singular) : cached.singular;
    entry.description = active ? t(cached.description) : cached.description;
  }
  if (CONFIG.site) {
    const cached = CONFIG.site._en || { tagline: CONFIG.site.tagline, description: CONFIG.site.description };
    CONFIG.site._en = cached;
    CONFIG.site.tagline = active ? t(cached.tagline) : cached.tagline;
    CONFIG.site.description = active ? t(cached.description) : cached.description;
  }
}

/** Toggle between the two supported languages. */
export function toggleLang() {
  setLang(state.lang === "ar" ? "en" : "ar");
}
