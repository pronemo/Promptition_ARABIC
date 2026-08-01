/**
 * Promptition — Articles (Tutorial Articles)
 * pages/articles.js
 *
 * A dedicated long-form reading list: tutorials whose category is "article",
 * rendered as compact editorial cards.
 */

import { initApp } from "../core/app.js";
import { getCollection } from "../core/config.js";
import { icon, escapeHtml, render, qs } from "../utils/dom.js";
import { fetchCollection } from "../utils/data.js";
import { detailUrl } from "../core/router.js";
import { formatDate } from "../utils/helpers.js";
import { t } from "../core/i18n.js";

async function bootArticles() {
  await initApp();
  const { items } = await fetchCollection("tutorials").catch(() => ({ items: [] }));
  const articles = items.filter((i) => String(i.type).toLowerCase() === "article");
  const list = qs("[data-articles-list]");
  const empty = qs("[data-articles-empty]");
  const meta = qs("[data-articles-meta]");

  if (meta) meta.textContent = `${articles.length} ${t("articles")}`;

  if (!articles.length) {
    if (empty) empty.hidden = false;
    return;
  }

  const config = getCollection("tutorials");
  render(
    list,
    articles
      .map(
        (item) => `
        <article class="card" data-type="tutorials" data-id="${escapeHtml(item.id)}">
          <div class="card-body">
            <div class="card-tags">
              ${icon("i-bookmark")}
              <span class="badge badge-brand">${escapeHtml(item.readTime || t("Article"))}</span>
            </div>
            <h3 class="card-title"><a href="${detailUrl(config, item.id)}">${escapeHtml(item.title)}</a></h3>
            <p class="card-desc">${escapeHtml(item.summary || item.description || "")}</p>
            <div class="card-meta">
              <span class="meta-item">${icon("i-user")}${escapeHtml(item.author || "")}</span>
              <span class="meta-item">${icon("i-calendar")}${formatDate(item.published)}</span>
            </div>
          </div>
        </article>`
      )
      .join("")
  );
}

bootArticles();
