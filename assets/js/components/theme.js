/**
 * Promptition — Theme Controller
 * components/theme.js
 *
 * Resolves the active theme (light/dark/system), applies it to the root
 * element and keeps the toggle button in sync. Persists explicit choices.
 */

import { CONFIG } from "../core/config.js";
import { storage } from "../utils/storage.js";
import { qs, qsa, on, icon } from "../utils/dom.js";
import { t } from "../core/i18n.js";

const ATTR = CONFIG.theme.attr;

function currentSystem() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolvedTheme(preference) {
  if (preference === "light" || preference === "dark") return preference;
  return currentSystem();
}

/** Apply the theme to the document root. */
export function applyTheme(preference) {
  const theme = resolvedTheme(preference);
  document.documentElement.setAttribute(ATTR, theme);
  document.documentElement.style.colorScheme = theme;
  return theme;
}

/** Current resolved theme ('light' | 'dark'). */
export function getTheme() {
  const stored = storage.get(CONFIG.storage.theme, null);
  return resolvedTheme(stored || CONFIG.theme.default);
}

/** Set and persist a theme preference ('light' | 'dark' | 'system'). */
export function setTheme(preference) {
  if (preference === "light" || preference === "dark") {
    storage.set(CONFIG.storage.theme, preference);
  } else {
    storage.remove(CONFIG.storage.theme);
  }
  const resolved = applyTheme(preference || CONFIG.theme.default);
  updateToggleIcons();
  return resolved;
}

function updateToggleIcons() {
  const theme = getTheme();
  qsa("[data-theme-toggle]").forEach((btn) => {
    btn.innerHTML = icon(theme === "dark" ? "i-sun" : "i-moon");
    btn.setAttribute(
      "aria-label",
      theme === "dark" ? t("Switch to light theme") : t("Switch to dark theme")
    );
  });
}

/** Wire theme toggle buttons and system preference changes. */
export function initTheme() {
  applyTheme(storage.get(CONFIG.storage.theme, CONFIG.theme.default));

  on(document, "click", "[data-theme-toggle]", () => {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const stored = storage.get(CONFIG.storage.theme, null);
      if (!stored) applyTheme(CONFIG.theme.default);
    });

  updateToggleIcons();
  const root = qs("html");
  if (root) root.style.opacity = "1";
}
