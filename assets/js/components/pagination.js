/**
 * Promptition — Pagination
 * components/pagination.js
 *
 * Lightweight pagination controls with windowed page buttons and keyboard
 * support. Renders into a container; invokes an onChange callback.
 */

import { icon, escapeHtml } from "../utils/dom.js";
import { t } from "../core/i18n.js";

const WINDOW = 2;

/**
 * @param {object} opts
 * @param {HTMLElement} opts.container
 * @param {number} opts.page         1-based current page.
 * @param {number} opts.pageSize
 * @param {number} opts.total        Total number of records.
 * @param {Function} opts.onChange   (page) => void
 * @param {string} [opts.label]      Item label for the info line.
 */
export function pagination({ container, page, pageSize, total, onChange, label = "items" }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  let markup = `
    <div class="pagination">
      <span class="pagination-info">${escapeHtml(t("Showing"))} <strong>${from}–${to}</strong> ${escapeHtml(t("of"))} <strong>${total}</strong> ${label}</span>
      <nav class="pagination-nav" aria-label="Pagination">
  `;

  markup += pageButton({ page: 1, disabled: current === 1, label: "First page", icon: "i-chevron-left", hiddenSm: true });
  markup += pageButton({ page: current - 1, disabled: current === 1, label: "Previous page", icon: "i-chevron-left" });

  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - current) <= WINDOW) {
      markup += pageButton({ page: p, active: p === current, label: `Page ${p}` });
    } else if (p === current - WINDOW - 1 || p === current + WINDOW + 1) {
      markup += `<span class="page-ellipsis" aria-hidden="true">…</span>`;
    }
  }

  markup += pageButton({ page: current + 1, disabled: current === pages, label: "Next page", icon: "i-chevron-right" });
  markup += pageButton({ page: pages, disabled: current === pages, label: "Last page", icon: "i-chevron-right", hiddenSm: true });
  markup += `</nav></div>`;

  container.innerHTML = markup;

  container.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => onChange(Number(btn.dataset.page)));
  });
}

function pageButton({ page, disabled = false, active = false, label, icon: iconName, hiddenSm = false }) {
  const content = iconName ? icon(iconName) : String(page);
  const hidden = hiddenSm ? " is-hidden-sm" : "";
  return `
    <button type="button" class="page-btn${active ? " is-active" : ""}${hidden}"
      data-page="${page}" ${disabled ? "disabled" : ""} aria-label="${label}"
      ${active ? 'aria-current="page"' : ""}>${content}</button>
  `;
}
