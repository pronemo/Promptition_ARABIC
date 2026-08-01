/**
 * Promptition — Tutorial / Article Details
 * pages/tutorial.js
 */

import { bootDetailPage } from "./shared.js";
import { icon, escapeHtml, render } from "../utils/dom.js";
import { formatDate } from "../utils/helpers.js";
import { relatedSection } from "../components/detail.js";
import { initTabs } from "../components/tabs.js";
import { t } from "../core/i18n.js";

bootDetailPage("tutorials", async (item) => {
  const container = document.querySelector("[data-detail-content]");
  if (!container) return;

  render(container, `
    <div class="content-narrow" style="max-width:760px;margin-inline:auto">
      ${bylineSection(item)}
      ${contentSection(item)}
      ${authorSection(item)}
      <div data-related></div>
    </div>
  `);

  relatedSection("tutorials", item.related, "[data-related]");
});

function bylineSection(item) {
  return `
    <div class="content-card">
      <div class="spec-grid" style="margin-top:0">
        ${spec(t("Author"), item.author, "i-user")}
        ${spec(t("Published"), formatDate(item.published), "i-calendar")}
        ${spec(t("Read time"), item.readTime, "i-clock")}
        ${spec(t("Difficulty"), item.difficulty, "i-trending")}
      </div>
    </div>`;
}

function contentSection(item) {
  const sections = item.content || [];
  const markup = sections
    .map((section) => {
      const paragraphs = (section.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      const list = section.list?.length
        ? `<ul style="margin:0.75rem 0;padding-left:1.2rem;display:grid;gap:0.35rem;list-style:disc;color:var(--text-soft);font-size:0.95rem">${section.list.map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>`
        : "";
      return `
        <section>
          <h2 style="font-size:1.35rem;margin:2rem 0 0.6rem;letter-spacing:-0.01em">${escapeHtml(section.heading)}</h2>
          <div class="stack">${paragraphs}${list}</div>
        </section>`;
    })
    .join("");

  return `
    <article class="content-card">
      <p style="font-size:1.05rem;color:var(--text-soft);font-weight:500;margin-bottom:1rem;line-height:1.7">${escapeHtml(item.summary || "")}</p>
      ${markup}
    </article>`;
}

function authorSection(item) {
  if (!item.author) return "";
  return `
    <div class="callout">
      ${icon("i-user")}
      <p><strong>${escapeHtml(item.author)}</strong> · ${escapeHtml(t("Written for the {series} series.", { series: item.category || "Promptition" }))}</p>
    </div>`;
}

function spec(label, value, iconName) {
  return `
    <div class="spec-item">
      <div class="spec-label">${icon(iconName)}${escapeHtml(t(label))}</div>
      <div class="spec-value">${escapeHtml(value || "—")}</div>
    </div>`;
}
