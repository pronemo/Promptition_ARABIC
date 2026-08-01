/**
 * Promptition — Resource Card
 * components/card.js
 *
 * Renders a unified card for any resource type (model, tool, lora, prompt,
 * style, workflow, tutorial, dataset, node) with cover art, category badge,
 * favorite toggle, description, tags and metadata.
 */

import { getCollection } from "../core/config.js";
import { detailUrl } from "../core/router.js";
import { t } from "../core/i18n.js";
import { icon, escapeHtml } from "../utils/dom.js";
import { formatCount, formatDate, truncate } from "../utils/helpers.js";
import { Favorites, Compare } from "../utils/storage.js";
import { coverUrl } from "./cover.js";
import { ratingStars } from "./rating.js";
import { openShare, copyLink } from "./share.js";
import { toggleCompare } from "./compare.js";

/**
 * @param {object} item      Data record.
 * @param {string} type      Collection type (e.g. 'models').
 * @returns {string} Card HTML.
 */
export function card(item, type) {
  const config = getCollection(type);
  const name = escapeHtml(item.name || item.title || item.id);
  const desc = escapeHtml(truncate(item.description || item.summary || "", 120));
  const href = detailUrl(config, item.id);
  const isFav = Favorites.has(type, item.id);
  const cover = coverUrl(item);
  const tags = (item.tags || []).slice(0, 3);

  const metaItems = [];
  if (item.rating != null) {
    metaItems.push(`<span class="rating">${ratingStars(item.rating, { showValue: true, count: item.ratingsCount })}</span>`);
  }
  if (item.downloads) {
    metaItems.push(`<span class="meta-item">${icon("i-download")}${escapeHtml(formatCount(item.downloads))}</span>`);
  }
  if (item.usedBy) {
    metaItems.push(`<span class="meta-item">${icon("i-user")}${escapeHtml(formatCount(item.usedBy))}</span>`);
  }
  if (item.released) {
    metaItems.push(`<span class="meta-item">${icon("i-calendar")}${escapeHtml(formatDate(item.released))}</span>`);
  }
  if (item.published) {
    metaItems.push(`<span class="meta-item">${icon("i-calendar")}${escapeHtml(formatDate(item.published))}</span>`);
  }
  if (item.samples) {
    metaItems.push(`<span class="meta-item">${icon("i-database")}${escapeHtml(formatCount(item.samples))}</span>`);
  }
  if (item.readTime) {
    metaItems.push(`<span class="meta-item">${icon("i-clock")}${escapeHtml(item.readTime)}</span>`);
  }
  if (item.baseModel) {
    metaItems.push(`<span class="meta-item">${icon("i-layers")}${escapeHtml(item.baseModel)}</span>`);
  }
  if (item.params) {
    metaItems.push(`<span class="meta-item">${icon("i-cpu")}${escapeHtml(item.params)}</span>`);
  }

  const tagChips = tags
    .map((t) => `<span class="badge badge-default">${escapeHtml(t)}</span>`)
    .join("");

  return `
    <article class="card" data-type="${escapeHtml(type)}" data-id="${escapeHtml(item.id)}">
      <div class="card-cover">
        <img src="${cover}" alt="" width="640" height="400" loading="lazy" decoding="async">
        <button class="card-fav js-fav${isFav ? " is-fav" : ""}" data-type="${escapeHtml(type)}" data-id="${escapeHtml(item.id)}"
          aria-label="${isFav ? t("Remove from favorites") : t("Add to favorites")}" aria-pressed="${isFav}">
          ${icon(isFav ? "i-heart-filled" : "i-heart")}
        </button>
        ${item.category ? `<span class="badge badge-glass card-cat">${escapeHtml(item.category)}</span>` : ""}
        <div class="card-actions">
          <button type="button" class="card-action js-share" data-type="${escapeHtml(type)}" data-id="${escapeHtml(item.id)}"
            aria-label="${t("Share")} ${name}" title="${t("Share")}">${icon("i-share")}</button>
          <button type="button" class="card-action js-copy" data-type="${escapeHtml(type)}" data-id="${escapeHtml(item.id)}"
            aria-label="${t("Copy link")}" title="${t("Copy link")}">${icon("i-link")}</button>
          <button type="button" class="card-action js-compare${Compare.has(type, item.id) ? " is-active" : ""}" data-type="${escapeHtml(type)}" data-id="${escapeHtml(item.id)}"
            aria-label="${Compare.has(type, item.id) ? t("Remove from compare") : t("Add to compare")}" aria-pressed="${Compare.has(type, item.id)}" title="${t("Compare")}">${icon("i-compare")}</button>
        </div>
      </div>
      <div class="card-body">
        <h3 class="card-title"><a href="${href}">${name}</a></h3>
        <p class="card-desc">${desc}</p>
        ${tagChips ? `<div class="card-tags">${tagChips}</div>` : ""}
        <div class="card-meta">${metaItems.join("")}</div>
      </div>
    </article>
  `;
}

/**
 * Favorite toggle wiring for a list of rendered cards.
 * @param {HTMLElement} scope  Element containing the cards.
 * @param {Function} [onToggle] Optional callback with (isFav, type, id).
 */
export function wireFavorites(scope = document, onToggle) {
  scope.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-fav");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const { type, id } = btn.dataset;
    const isFav = Favorites.toggle(type, id);
    btn.classList.toggle("is-fav", isFav);
    btn.setAttribute("aria-pressed", String(isFav));
    btn.setAttribute("aria-label", isFav ? t("Remove from favorites") : t("Add to favorites"));
    btn.innerHTML = icon(isFav ? "i-heart-filled" : "i-heart");
    if (typeof onToggle === "function") onToggle(isFav, type, id);
  });
}

/** Empty result message for a collection grid. */
export function emptyCard(message = "No results found") {
  return `
    <div class="state-box">
      <span class="state-icon">${icon("i-search")}</span>
      <h3 class="state-title">${escapeHtml(t("Nothing here yet"))}</h3>
      <p class="state-text">${escapeHtml(message)}</p>
    </div>
  `;
}

/**
 * Wire card action buttons (share, copy link, compare) inside a scope.
 */
export function wireCardActions(scope = document) {
  scope.addEventListener("click", async (e) => {
    const shareBtn = e.target.closest(".js-share");
    if (shareBtn) {
      e.preventDefault();
      e.stopPropagation();
      const { type, id } = shareBtn.dataset;
      const item = await lookupCardItem(type, id);
      if (item) openShare(type, item);
      return;
    }
    const copyBtn = e.target.closest(".js-copy");
    if (copyBtn) {
      e.preventDefault();
      e.stopPropagation();
      const { type, id } = copyBtn.dataset;
      const item = await lookupCardItem(type, id);
      if (item) copyLink(type, item);
      return;
    }
    const compareBtn = e.target.closest(".js-compare");
    if (compareBtn) {
      e.preventDefault();
      e.stopPropagation();
      const { type, id } = compareBtn.dataset;
      const result = toggleCompare(type, id);
      const active = Compare.has(type, id);
      compareBtn.classList.toggle("is-active", active);
      compareBtn.setAttribute("aria-pressed", String(active));
      compareBtn.setAttribute("aria-label", active ? t("Remove from compare") : t("Add to compare"));
      if (result !== "full" && result !== false && result !== "removed") {
        import("./toast.js").then(({ toast }) =>
          toast(t("Added to compare"), "success")
        );
      }
    }
  });
}

async function lookupCardItem(type, id) {
  const { fetchItem } = await import("../utils/data.js");
  return fetchItem(type, id).catch(() => null);
}
