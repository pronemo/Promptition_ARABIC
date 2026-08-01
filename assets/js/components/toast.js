/**
 * Promptition — Toasts
 * components/toast.js
 *
 * Minimal, accessible toast notifications rendered into a fixed region.
 */

import { el, icon, escapeHtml } from "../utils/dom.js";
import { t } from "../core/i18n.js";

let region = null;

function ensureRegion() {
  if (region && document.contains(region)) return region;
  region = el(
    "div",
    { class: "toast-region", "aria-live": "polite", "aria-atomic": "true" }
  );
  document.body.append(region);
  return region;
}

const ICONS = {
  success: "i-check",
  error: "i-alert",
  info: "i-info",
};

/**
 * Show a toast.
 * @param {string} message
 * @param {'success'|'error'|'info'} [kind]
 * @param {number} [duration]  ms before auto-dismiss (0 = sticky).
 */
export function toast(message, kind = "info", duration = 3500) {
  const box = ensureRegion();
  const node = el("div", { class: "toast", "data-kind": kind, role: "status" });
  node.innerHTML = `
    ${icon(ICONS[kind] || ICONS.info)}
    <p class="toast-message"></p>
    <button type="button" class="toast-close" aria-label="${escapeHtml(t("Dismiss notification"))}">${icon("i-close")}</button>
  `;
  node.querySelector(".toast-message").textContent = message;
  box.append(node);

  const dismiss = () => {
    if (!node.isConnected) return;
    node.classList.add("is-leaving");
    node.addEventListener("transitionend", () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 400);
  };

  node.querySelector(".toast-close").addEventListener("click", dismiss);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return dismiss;
}
