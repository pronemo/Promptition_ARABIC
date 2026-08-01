/**
 * Promptition — Breadcrumbs
 * components/breadcrumbs.js
 *
 * Renders a semantic breadcrumb trail (with JSON-LD) into [data-breadcrumbs].
 */

import { getCollection, CONFIG } from "../core/config.js";
import { t } from "../core/i18n.js";
import { icon, escapeHtml } from "../utils/dom.js";

const HOME = CONFIG.site.name;

/**
 * @param {string} type     Collection type (or null for non-collection pages).
 * @param {string} [current]  Current page label (item name, etc.).
 * @param {string} [container]  Selector of the target element.
 */
export function renderBreadcrumbs({ type, current, container = "[data-breadcrumbs]" }) {
  const target = document.querySelector(container);
  if (!target) return;

  let crumbs = "";

  const homeCrumb = type
    ? `<a href="index.html">${icon("i-home")}${escapeHtml(HOME)}</a>`
    : `<span aria-current="page">${icon("i-home")}${escapeHtml(HOME)}</span>`;

  crumbs += `${homeCrumb}<span class="sep" aria-hidden="true">/</span>`;

  if (type) {
    const config = getCollection(type);
    crumbs += `<a href="${config.path}">${escapeHtml(config.label)}</a>`;
    if (current) {
      crumbs += `<span class="sep" aria-hidden="true">/</span><span class="current">${escapeHtml(current)}</span>`;
    }
  } else if (current) {
    crumbs += `<span class="current">${escapeHtml(current)}</span>`;
  }

  target.innerHTML = `<nav class="breadcrumbs" aria-label="${escapeHtml(t("Breadcrumb"))}">${crumbs}</nav>`;

  // Structured data
  const items = [{ name: HOME, item: "index.html" }];
  if (type) {
    const config = getCollection(type);
    items.push({ name: config.label, item: config.path });
  }
  if (current) items.push({ name: current, item: null });
  emitBreadcrumbJsonLd(items);
}

/** Inject breadcrumb JSON-LD structured data. */
export function emitBreadcrumbJsonLd(items) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
      .map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: entry.name,
        ...(entry.item ? { item: entry.item } : {}),
      })),
  };
  upsertJsonLd("breadcrumbs", ld);
}

/** Insert or replace a JSON-LD script block. */
export function upsertJsonLd(id, payload) {
  const existing = document.getElementById(`ld-${id}`);
  if (existing) existing.remove();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = `ld-${id}`;
  script.textContent = JSON.stringify(payload);
  document.head.appendChild(script);
}
