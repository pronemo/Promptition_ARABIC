/**
 * Promptition — Detail Page Helpers
 * components/detail.js
 *
 * Shared renderers used by every detail page (model, tool, lora, prompt,
 * style, workflow, tutorial, dataset, node). Individual page controllers
 * assemble these pieces with their type-specific sections.
 */

import { getCollection, CONFIG } from "../core/config.js";
import { detailUrl } from "../core/router.js";
import { t } from "../core/i18n.js";
import { icon, escapeHtml, render } from "../utils/dom.js";
import { formatCount, formatDate, truncate } from "../utils/helpers.js";
import { coverUrl, shotUrl } from "./cover.js";
import { ratingStars } from "./rating.js";
import { favoriteButton } from "./favorites.js";
import { compareButton } from "./compare.js";
import { copyValue } from "./copy.js";
import { openShare } from "./share.js";
import { upsertJsonLd } from "./breadcrumbs.js";

/**
 * Set page <title>, meta description and OG/JSON-LD metadata.
 */
export function applySeo({ title, description, type, item }) {
  const siteName = CONFIG.site.name;
  document.title = title ? `${title} · ${siteName}` : siteName;

  const setMeta = (attr, key, value) => {
    const node = document.head.querySelector(`meta[${attr}="${key}"]`) ||
      document.head.querySelector(`meta[name="${key}"]`);
    if (node) node.setAttribute("content", value);
  };

  if (description) {
    setMeta("name", "description", description);
    setMeta("property", "og:description", description);
  }
  if (title) {
    setMeta("property", "og:title", title);
  }

  if (type && item) {
    const config = getCollection(type);
    const url = `${window.location.origin}/${detailUrl(config, item.id)}`;
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", url);
    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", url);

    upsertJsonLd("item", {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: item.name || item.title,
      description: truncate(description || item.description || "", 300),
      url,
      dateModified: new Date().toISOString(),
      publisher: { "@type": "Organization", name: siteName },
    });
  }
}

/**
 * Render the header block of a detail page: breadcrumbs, cover, title, meta,
 * description and the action bar (favorite, share, copy, compare).
 */
export function renderDetailHead(item, type, target = "[data-detail-head]") {
  const config = getCollection(type);
  const name = item.name || item.title || item.id;
  const desc = item.description || item.summary || "";

  // Breadcrumbs
  const crumb = document.querySelector("[data-breadcrumbs]");
  if (crumb) {
    crumb.innerHTML = `
      <nav class="breadcrumbs" aria-label="${escapeHtml(t("Breadcrumb"))}">
        <a href="index.html">${icon("i-home")}${escapeHtml(CONFIG.site.name)}</a>
        <span class="sep" aria-hidden="true">/</span>
        <a href="${config.path}">${escapeHtml(config.label)}</a>
        <span class="sep" aria-hidden="true">/</span>
        <span class="current">${escapeHtml(name)}</span>
      </nav>`;
  }

  const container = document.querySelector(target);
  if (!container) return;

  const metaParts = [];
  if (item.publisher) metaParts.push(escapeHtml(item.publisher));
  if (item.category) metaParts.push(escapeHtml(item.category));
  if (item.released) metaParts.push(formatDate(item.released));
  if (item.published) metaParts.push(formatDate(item.published));
  if (item.version) metaParts.push(`v${escapeHtml(item.version)}`);
  if (item.license) metaParts.push(escapeHtml(item.license));

  const actions = document.createElement("div");
  actions.className = "detail-actions";
  actions.append(
    favoriteButton(type, item.id),
    compareButton(type, item.id),
    shareButton(type, item),
    copyButton(type, item)
  );

  const cover = coverUrl(item);
  render(container, `
    <div class="detail-head">
      <div class="detail-cover">
        <img src="${cover}" alt="${escapeHtml(name)}" width="360" height="360" decoding="async">
      </div>
      <div class="detail-info">
        ${item.rating != null ? `<div class="detail-sub">${ratingStars(item.rating, { count: item.ratingsCount })}</div>` : ""}
        <h1 class="detail-title">${escapeHtml(name)}</h1>
        <div class="detail-sub">${metaParts.join(' <span aria-hidden="true">·</span> ')}</div>
        <p class="detail-desc">${escapeHtml(truncate(desc, 400))}</p>
        <div class="detail-actions" data-detail-actions></div>
        ${item.tags?.length ? tagRow(item.tags) : ""}
      </div>
    </div>
  `);

  const actionsSlot = container.querySelector("[data-detail-actions]");
  if (actionsSlot) actionsSlot.replaceWith(actions);
}

function shareButton(type, item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-outline";
  btn.innerHTML = `${icon("i-share")} ${escapeHtml(t("Share"))}`;
  btn.addEventListener("click", () => openShare(type, item));
  return btn;
}

function copyButton(type, item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-outline";
  btn.innerHTML = `${icon("i-link")} ${escapeHtml(t("Copy link"))}`;
  btn.addEventListener("click", async () => {
    const url = `${window.location.origin}/${detailUrl(getCollection(type), item.id)}`;
    await copyValue(url);
  });
  return btn;
}

export function tagRow(tags) {
  return `<div class="tag-list" style="margin-top:0.75rem">${tags
    .map((t) => `<span class="badge badge-default">${escapeHtml(t)}</span>`)
    .join("")}</div>`;
}

/** Render a "spec" grid of key/value pairs. */
export function specGrid(entries) {
  return `<div class="spec-grid">${entries
    .map(
      ([label, value, iconName]) => `
      <div class="spec-item">
        <div class="spec-label">${icon(iconName || "i-info")}${escapeHtml(label)}</div>
        <div class="spec-value">${escapeHtml(value)}</div>
      </div>`
    )
    .join("")}</div>`;
}

/** Render a list section with checkmarks. */
export function featureList(items) {
  return `<ul class="card-body-list">${items
    .map((f) => `<li>${icon("i-check")}<span>${escapeHtml(f)}</span></li>`)
    .join("")}</ul>`;
}

/** Render an example gallery from the item's `examples` array. */
export function examplesSection(item, type) {
  const examples = item.examples || [];
  if (!examples.length) return "";
  return `
    <section class="content-card">
      <h3>${icon("i-image")} ${escapeHtml(t("Examples"))}</h3>
      <div class="examples-grid">
        ${examples
          .map((ex, i) => {
            const label = ex.title || ex.prompt || ex.positive || "Example";
            return `
              <div class="example-card">
                <div class="ex-cover"><img src="${shotUrl((item.cover + i) % 12 + 1, truncate(label, 30))}" alt="${escapeHtml(truncate(label, 30))}" loading="lazy" decoding="async"></div>
                <div class="ex-body"><p class="ex-title">${escapeHtml(truncate(label, 60))}</p></div>
              </div>`;
          })
          .join("")}
      </div>
    </section>`;
}

/** Render the related-items grid. */
export async function relatedSection(type, ids, target = "[data-related]") {
  const container = document.querySelector(target);
  if (!container) return;
  const config = getCollection(type);
  const { getRelated } = await import("../utils/data.js");
  const related = await getRelated(type, ids, 4);
  if (!related.length) return;

  const { card } = await import("./card.js");
  render(container, `
    <section class="content-card">
      <h3>${icon("i-layers")} ${escapeHtml(t("Related"))} ${escapeHtml(config.label)}</h3>
      <div class="grid grid-2">${related.map((r) => card(r, type)).join("")}</div>
    </section>
  `);
  const { wireFavorites, wireCardActions } = await import("./card.js");
  wireFavorites(container);
  wireCardActions(container);
}

/** Render a "loading" placeholder for the detail area. */
export function detailLoading(target = "[data-detail-content]") {
  const container = document.querySelector(target);
  if (!container) return;
  render(container, `
    <div class="grid grid-2">
      ${Array.from({ length: 4 })
        .map(
          () => `
        <div class="skeleton-card">
          <div class="skeleton sk-cover"></div>
          <div class="sk-body">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width:70%"></div>
          </div>
        </div>`
        )
        .join("")}
    </div>`);
}

/** Render a "not found" state for missing items. */
export function detailNotFound(target = "[data-detail-content]") {
  const container = document.querySelector(target);
  if (!container) return;
  render(container, `
    <div class="state-box">
      <span class="state-icon">${icon("i-alert")}</span>
      <h2 class="state-title">${escapeHtml(t("Item not found"))}</h2>
      <p class="state-text">${escapeHtml(t("The resource you are looking for does not exist or may have been moved."))}</p>
      <div class="state-actions">
        <a class="btn btn-primary" href="index.html">${icon("i-home")} ${escapeHtml(t("Back home"))}</a>
        <a class="btn btn-ghost" href="search.html">${icon("i-search")} ${escapeHtml(t("Search"))}</a>
      </div>
    </div>`);
}

/** Download helper for workflow JSON and other blobs. */
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Render a copyable code block. */
export function codeBlock(label, code) {
  const safe = escapeHtml(code);
  return `
    <div class="code-block">
      <div class="code-block-head">
        <span class="code-block-label">${escapeHtml(label)}</span>
        <button type="button" class="code-block-copy" data-copy-value="${escapeHtml(code).replace(/"/g, "&quot;")}">
          ${icon("i-copy")} ${escapeHtml(t("Copy"))}
        </button>
      </div>
      <pre><code>${safe}</code></pre>
    </div>`;
}

/**
 * Fill one or more `[data-compat-<key>]` rows with links to related items
 * of another collection. `map` keys match the dataset keys, e.g.
 * `{ models: item.compatibleModels, loras: item.compatibleLoras }`.
 */
export async function renderCompatRows(map, container = document) {
  for (const [type, ids] of Object.entries(map || {})) {
    const target = container.querySelector(`[data-compat-${type}]`);
    if (!target || !ids?.length) continue;
    const config = getCollection(type);
    const { fetchCollection } = await import("../utils/data.js");
    const { items } = await fetchCollection(type).catch(() => ({ items: [] }));
    const byId = new Map(items.map((i) => [i.id, i]));
    const records = ids.map((id) => byId.get(id)).filter(Boolean);
    if (!records.length) {
      target.innerHTML = `<span class="field-hint">${escapeHtml(t("No") + " " + config.label + " " + t("listed yet."))}</span>`;
      continue;
    }
    target.innerHTML = records
      .map((r) => {
        const name = r.name || r.title || r.id;
        return `
          <a class="badge badge-default" href="${detailUrl(config, r.id)}">
            ${icon("i-arrow-right")}${escapeHtml(name)}
          </a>`;
      })
      .join("");
  }
}
