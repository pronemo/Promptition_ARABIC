/**
 * Promptition — Home Page
 * pages/home.js
 */

import { initApp } from "../core/app.js";
import { getCollection } from "../core/config.js";
import { icon, escapeHtml, render } from "../utils/dom.js";
import { fetchCollection, featured, fetchCounts } from "../utils/data.js";
import { card, wireFavorites, wireCardActions } from "../components/card.js";
import { initCopyButtons } from "../components/copy.js";
import { t } from "../core/i18n.js";

const HIGHLIGHT_TYPES = ["models", "tools", "loras"];

async function loadHighlights() {
  for (const type of HIGHLIGHT_TYPES) {
    const target = document.querySelector(`[data-highlights="${type}"]`);
    if (!target) continue;
    const { items } = await fetchCollection(type).catch(() => ({ items: [] }));
    const picks = featured(items, 4);
    render(target, picks.map((item) => card(item, type)).join(""));
    wireFavorites(target);
    wireCardActions(target);
  }
}

async function loadTutorials() {
  const target = document.querySelector("[data-highlights=tutorials]");
  if (!target) return;
  const { items } = await fetchCollection("tutorials").catch(() => ({ items: [] }));
  const picks = featured(items, 3);
  render(
    target,
    picks
      .map(
        (item) => `
        <article class="card" data-type="tutorials" data-id="${escapeHtml(item.id)}">
          <div class="card-body">
            <div class="card-tags">${[item.category, item.difficulty]
              .filter(Boolean)
              .map((t) => `<span class="badge badge-default">${escapeHtml(t)}</span>`)
              .join("")}</div>
            <h3 class="card-title"><a href="tutorial.html?id=${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a></h3>
            <p class="card-desc">${escapeHtml(item.description || item.summary || "")}</p>
            <div class="card-meta">
              <span class="meta-item">${icon("i-clock")}${escapeHtml(item.readTime)}</span>
              <span class="meta-item">${icon("i-user")}${escapeHtml(item.author || "")}</span>
            </div>
          </div>
        </article>`
      )
      .join("")
  );
}

function loadCategories() {
  const target = document.querySelector("[data-categories]");
  if (!target) return;
  const types = [
    "models", "tools", "loras", "prompts",
    "styles", "workflows", "tutorials", "datasets", "nodes",
  ];
  render(
    target,
    types
      .map((type) => {
        const config = getCollection(type);
        return `
        <a class="card-tile" href="${config.path}">
          <span class="card-tile-icon">${icon(config.icon)}</span>
          <h3>${escapeHtml(config.label)}</h3>
          <p>${escapeHtml(config.description)}</p>
          <span class="card-tile-count" data-cat-count="${type}">${icon("i-arrow-right")} ${escapeHtml(t("Browse"))}</span>
        </a>`;
      })
      .join("")
  );
}

async function loadStats() {
  const target = document.querySelector("[data-stats]");
  if (!target) return;
  const counts = await fetchCounts().catch(() => ({ total: 0 }));
  const statEls = target.querySelectorAll("[data-stat]");
  statEls.forEach((el) => {
    const key = el.dataset.stat;
    el.textContent = key === "total" ? String(counts.total || 0) : String(counts[key] || 0);
  });
}

async function bootHome() {
  await initApp();
  initCopyButtons();
  loadCategories();
  loadHighlights();
  loadTutorials();
  loadStats();
}

bootHome();
