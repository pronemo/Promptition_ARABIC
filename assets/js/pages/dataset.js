/**
 * Promptition — Dataset Details
 * pages/dataset.js
 */

import { bootDetailPage } from "./shared.js";
import { icon, escapeHtml, render } from "../utils/dom.js";
import {
  featureList,
  relatedSection,
} from "../components/detail.js";
import { t } from "../core/i18n.js";

bootDetailPage("datasets", async (item) => {
  const container = document.querySelector("[data-detail-content]");
  if (!container) return;

  render(container, `
    <div class="content-grid">
      <div>
        ${overviewSection(item)}

        ${usesSection(item)}

        <div data-related></div>
      </div>
      <aside class="content-side">
        <div class="side-panel">
          ${statsPanel(item)}
          ${sourcePanel(item)}
        </div>
      </aside>
    </div>
  `);

  relatedSection("datasets", item.related, "[data-related]");
});

function overviewSection(item) {
  return `
    <section class="content-card">
      <h3>${icon("i-info")} ${escapeHtml(t("Overview"))}</h3>
      <p>${escapeHtml(item.description || "")}</p>
      ${item.features?.length ? `<div style="margin-top:1rem">${featureList(item.features)}</div>` : ""}
    </section>`;
}

function usesSection(item) {
  const uses = item.uses || [];
  if (!uses.length) return "";
  return `
    <section class="content-card">
      <h3>${icon("i-layers")} ${escapeHtml(t("Common Uses"))}</h3>
      <div class="card-body-list">
        ${uses.map((u) => `<li>${icon("i-check")}<span>${escapeHtml(u)}</span></li>`).join("")}
      </div>
    </section>`;
}

function statsPanel(item) {
  return `
    <div class="side-card">
      <h3>${icon("i-database")} ${escapeHtml(t("Stats"))}</h3>
      <div class="spec-grid">
        ${spec(t("Samples"), item.samples)}
        ${spec(t("Size"), item.sizeGb ? `${item.sizeGb} GB` : "—")}
        ${spec(t("Format"), item.format)}
        ${spec(t("License"), item.license)}
        ${spec(t("Used by"), item.usedBy)}
      </div>
    </div>`;
}

function sourcePanel(item) {
  if (!item.source) return "";
  return `
    <div class="side-card">
      <h3>${icon("i-external")} ${escapeHtml(t("Source"))}</h3>
      <a class="link" href="${escapeHtml(item.source)}" target="_blank" rel="noopener">${escapeHtml(item.source)}</a>
    </div>`;
}

function spec(label, value) {
  return `
    <div class="spec-item">
      <div class="spec-label">${icon("i-info")}${escapeHtml(t(label))}</div>
      <div class="spec-value">${escapeHtml(value || "—")}</div>
    </div>`;
}
