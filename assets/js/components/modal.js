/**
 * Promptition — Modal
 * components/modal.js
 *
 * Accessible modal dialog: overlay click-to-close, Esc key, focus trap and
 * return focus to the trigger.
 */

import { el, qs, focusTrap, icon, escapeHtml } from "../utils/dom.js";
import { t } from "../core/i18n.js";

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string|HTMLElement} opts.content
 * @param {Array} [opts.footer]  Array of HTML strings for footer actions.
 * @returns {object} { open(), close(), element }
 */
export function modal({ title, content, footer = [] }) {
  const overlay = el("div", { class: "modal-overlay", role: "dialog", "aria-modal": "true" });

  const node = el("div", { class: "modal", role: "document", "aria-label": title });
  node.innerHTML = `
    <header class="modal-head">
      <h2 class="modal-title"></h2>
      <button type="button" class="icon-btn modal-close" aria-label="${escapeHtml(t("Close dialog"))}">${icon("i-close")}</button>
    </header>
    <div class="modal-body"></div>
    ${footer.length ? `<footer class="modal-foot">${footer.join("")}</footer>` : ""}
  `;

  node.querySelector(".modal-title").textContent = title;
  const body = qs(".modal-body", node);
  if (typeof content === "string") body.innerHTML = content;
  else if (content) body.append(content);

  let previouslyFocused = null;

  const close = () => {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (previouslyFocused) previouslyFocused.focus();
  };

  const open = () => {
    previouslyFocused = document.activeElement;
    overlay.classList.add("is-open");
    overlay.removeAttribute("aria-hidden");
    document.body.style.overflow = "hidden";
    const focusable = qs("button, input, select, a[href]", node);
    if (focusable) focusable.focus();
  };

  overlay.append(node);
  document.body.append(overlay);

  node.querySelector(".modal-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (!overlay.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    else focusTrap(node, e);
  });

  return { open, close, element: node };
}
