/**
 * Promptition — History
 * pages/history.js
 */

import { initApp } from "../core/app.js";
import { icon, escapeHtml, render, qs } from "../utils/dom.js";
import { History } from "../utils/storage.js";
import { lookupKey } from "../utils/data.js";
import { historyRow } from "../components/history.js";
import { t } from "../core/i18n.js";

async function bootHistory() {
  await initApp();
  const listEl = qs("[data-history-list]");
  const emptyEl = qs("[data-history-empty]");
  const countEl = qs("[data-history-count]");
  if (!listEl) return;

  const renderList = async () => {
    const entries = History.list();
    if (countEl) countEl.textContent = `${entries.length} ${t("items")}`;
    if (!entries.length) {
      render(listEl, "");
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    const records = await Promise.all(entries.map((e) => lookupKey(`${e.type}:${e.id}`).catch(() => null)));
    const rows = entries
      .map((entry, i) => (records[i] ? historyRow(entry, records[i]) : ""))
      .filter(Boolean);

    render(listEl, `<div class="timeline">${rows.join("")}</div>`);

    listEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".js-history-remove");
      if (!btn) return;
      History.remove(btn.dataset.type, btn.dataset.id);
      renderList();
    });
  };

  document.querySelector("[data-history-clear]")?.addEventListener("click", () => {
    History.clear();
    renderList();
  });

  History.onChange(renderList);
  await renderList();
}

bootHistory();
