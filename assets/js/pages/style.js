/**
 * Promptition — Style Details
 * pages/style.js
 */

import { bootDetailPage } from "./shared.js";
import { icon, escapeHtml, render } from "../utils/dom.js";
import {
  examplesSection,
  relatedSection,
  renderCompatRows,
  codeBlock,
} from "../components/detail.js";
import { t } from "../core/i18n.js";

bootDetailPage("styles", async (item) => {
  const container = document.querySelector("[data-detail-content]");
  if (!container) return;

  render(container, `
    <div class="content-grid">
      <div>
        ${overviewSection(item)}

        <section class="content-card">
          <h3>${icon("i-doc")} ${escapeHtml(t("Style Suffix"))}</h3>
          ${codeBlock(t("Add to any prompt"), item.promptSuffix || "")}
        </section>

        <section class="content-card">
          <h3>${icon("i-close")} ${escapeHtml(t("Negative Suffix"))}</h3>
          ${codeBlock(t("Add to negative"), item.negativeSuffix || "")}
        </section>

        ${examplesSection(item, "styles")}

        ${compatibilitySection(item)}

        <div data-related></div>
      </div>
      <aside class="content-side">
        <div class="side-panel">
          ${palettePanel(item)}
        </div>
      </aside>
    </div>
  `);

  relatedSection("styles", item.related, "[data-related]");
  renderCompatRows(
    { models: item.compatibleModels, loras: item.compatibleLoras },
    container
  );
});

function overviewSection(item) {
  return `
    <section class="content-card">
      <h3>${icon("i-info")} ${escapeHtml(t("Overview"))}</h3>
      <p>${escapeHtml(item.description || "")}</p>
      <div class="spec-grid" style="margin-top:1rem">
        ${spec(t("Mood"), (item.mood || []).join(", "))}
        ${spec(t("Palette"), (item.palette || []).join(", "))}
        ${spec(t("Suggested strength"), item.strength ?? "—")}
      </div>
    </section>`;
}

function spec(label, value) {
  return `
    <div class="spec-item">
      <div class="spec-label">${icon("i-info")}${escapeHtml(t(label))}</div>
      <div class="spec-value">${escapeHtml(value || "—")}</div>
    </div>`;
}

function compatibilitySection(item) {
  const models = item.compatibleModels || [];
  const loras = item.compatibleLoras || [];
  return `
    <section class="content-card">
      <h3>${icon("i-layers")} ${escapeHtml(t("Compatibility"))}</h3>
      ${models.length ? `
        <h4 style="font-size:0.95rem;margin-bottom:0.5rem">${escapeHtml(t("Works best with"))}</h4>
        <div class="compat-row" data-compat-models></div>` : ""}
      ${loras.length ? `
        <h4 style="font-size:0.95rem;margin:1rem 0 0.5rem">${escapeHtml(t("Recommended LoRAs"))}</h4>
        <div class="compat-row" data-compat-loras></div>` : ""}
    </section>`;
}

function palettePanel(item) {
  const palette = item.palette || [];
  const chips = palette
    .map(
      (color) => `
      <span class="badge badge-default" style="gap:6px">
        <span style="width:10px;height:10px;border-radius:50%;background:${cssSafe(color)};display:inline-block"></span>
        ${escapeHtml(color)}
      </span>`
    )
    .join("");
  return `
    <div class="side-card">
      <h3>${icon("i-palette")} ${escapeHtml(t("Palette"))}</h3>
      <div class="tag-list">${chips || "—"}</div>
    </div>`;
}

function cssSafe(color) {
  return String(color || "#888").replace(/[^a-zA-Z0-9#,()\s-]/g, "");
}
