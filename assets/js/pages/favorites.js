/**
 * Promptition — Favorites
 * pages/favorites.js
 */

import { initApp } from "../core/app.js";
import { icon, escapeHtml, render, qs } from "../utils/dom.js";
import { Favorites } from "../utils/storage.js";
import { lookupKey } from "../utils/data.js";
import { detailUrl } from "../core/router.js";
import { getCollection } from "../core/config.js";
import { coverUrl } from "../components/cover.js";
import { t } from "../core/i18n.js";

async function bootFavorites() {
  await initApp();
  const gridEl = qs("[data-favorites-grid]");
  const emptyEl = qs("[data-favorites-empty]");
  const countEl = qs("[data-favorites-count]");
  if (!gridEl) return;

  const renderList = async () => {
    const keys = Favorites.list();
    if (countEl) countEl.textContent = `${keys.length} ${t("saved")}`;
    if (!keys.length) {
      render(gridEl, "");
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    const records = (await Promise.all(keys.map((k) => lookupKey(k).catch(() => null)))).filter(Boolean);
    render(gridEl, records.map((r) => favoriteCard(r)).join(""));

    gridEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-fav-remove]");
      if (!btn) return;
      Favorites.remove(btn.dataset.type, btn.dataset.id);
      renderList();
    });
  };

  Favorites.onChange(renderList);
  await renderList();
}

function favoriteCard(record) {
  const config = getCollection(record.type);
  const name = record.name || record.title || record.id;
  return `
    <article class="card" data-type="${escapeHtml(record.type)}" data-id="${escapeHtml(record.id)}">
      <a class="card-cover" href="${detailUrl(config, record.id)}" tabindex="-1" aria-hidden="true">
        <img src="${coverUrl(record)}" alt="" loading="lazy" decoding="async">
      </a>
      <div class="card-body">
        <div class="card-tags"><span class="badge badge-brand">${escapeHtml(config?.singular || record.type)}</span></div>
        <h3 class="card-title"><a href="${detailUrl(config, record.id)}">${escapeHtml(name)}</a></h3>
        <div class="card-meta">
          <span class="meta-item">${icon("i-tag")}${escapeHtml(record.category || "—")}</span>
        </div>
        <div class="card-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-fav-remove data-type="${escapeHtml(record.type)}" data-id="${escapeHtml(record.id)}">
            ${icon("i-trash")} ${escapeHtml(t("Remove"))}
          </button>
        </div>
      </div>
    </article>`;
}

bootFavorites();
