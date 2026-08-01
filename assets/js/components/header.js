/**
 * Promptition — Header Controller
 * components/header.js
 *
 * Mobile navigation toggle, active link highlighting, favorites badge and
 * global search wiring (when a searchbox is present in the header).
 */

import { qs, qsa, on } from "../utils/dom.js";
import { Favorites } from "../utils/storage.js";
import { toggleLang, getLang } from "../core/i18n.js";

/** Highlight the nav link matching the current page. */
export function markActiveNav() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  qsa(".nav-link").forEach((link) => {
    const href = (link.getAttribute("href") || "").split("?")[0].split("#")[0];
    const isActive = href === current || (current === "" && href === "index.html");
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function updateFavoriteBadge() {
  const badge = qs("[data-favorites-count]");
  if (!badge) return;
  const count = Favorites.count;
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

function initMobileNav() {
  const toggle = qs("[data-nav-toggle]");
  const nav = qs(".nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.innerHTML = open
      ? '<svg class="icon"><use href="assets/icons/icons.svg#i-close"></use></svg>'
      : '<svg class="icon"><use href="assets/icons/icons.svg#i-menu"></use></svg>';
  });

  nav.addEventListener("click", (e) => {
    if (e.target.closest(".nav-link")) {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function initLangToggle() {
  const toggle = qs("[data-lang-toggle]");
  const label = qs("[data-lang-label]");
  if (!toggle) return;
  const update = () => {
    const isAr = getLang() === "ar";
    if (label) label.textContent = isAr ? "EN" : "ع";
    toggle.setAttribute("aria-label", isAr ? "Switch to English" : "Switch to Arabic");
  };
  toggle.addEventListener("click", () => {
    toggleLang();
    update();
  });
  update();
}

/** Bootstrap all header behaviour. */
export function initHeader() {
  markActiveNav();
  initMobileNav();
  initLangToggle();
  updateFavoriteBadge();
  Favorites.onChange(updateFavoriteBadge);
}

/** Manually refresh the badge after a favorites change. */
export function refreshHeaderBadge() {
  updateFavoriteBadge();
}
