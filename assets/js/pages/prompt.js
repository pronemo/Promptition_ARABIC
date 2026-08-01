/**
 * Promptition — Prompt Details
 * pages/prompt.js
 */

import { bootDetailPage } from "./shared.js";
import { icon, escapeHtml, render } from "../utils/dom.js";
import { formatCount } from "../utils/helpers.js";
import {
  examplesSection,
  relatedSection,
  renderCompatRows,
} from "../components/detail.js";
import { shotUrl } from "../components/cover.js";
import { t } from "../core/i18n.js";

bootDetailPage("prompts", async (item) => {
  const container = document.querySelector("[data-detail-content]");
  if (!container) return;

  render(container, `
    <div class="content-grid">
      <div>
        ${promptBoxes(item)}

        ${examplesSection(item, "prompts")}

        ${compatibilitySection(item)}

        <div data-related></div>
      </div>
      <aside class="content-side">
        <div class="side-panel">
          ${settingsPanel(item)}
        </div>
      </aside>
    </div>
  `);

  relatedSection("prompts", item.related, "[data-related]");
  renderCompatRows(
    { models: item.compatibleModels, loras: item.compatibleLoras },
    container
  );
});

function promptBoxes(item) {
  return `
    <section class="content-card">
      <h3>${icon("i-doc")} ${escapeHtml(t("Prompt"))}</h3>
      <div class="stack">
        <div class="prompt-box">
          <div class="prompt-box-label"><span class="pos">${icon("i-check")}</span> ${escapeHtml(t("Positive prompt"))}</div>
          <p>${escapeHtml(item.positive || "")}</p>
          <button type="button" class="btn btn-soft btn-sm prompt-copy" data-copy-value="${escapeHtml(item.positive || "").replace(/"/g, "&quot;")}">
            ${icon("i-copy")} ${escapeHtml(t("Copy"))}
          </button>
        </div>
        <div class="prompt-box">
          <div class="prompt-box-label"><span class="neg">${icon("i-close")}</span> ${escapeHtml(t("Negative prompt"))}</div>
          <p>${escapeHtml(item.negative || "")}</p>
          <button type="button" class="btn btn-soft btn-sm prompt-copy" data-copy-value="${escapeHtml(item.negative || "").replace(/"/g, "&quot;")}">
            ${icon("i-copy")} ${escapeHtml(t("Copy"))}
          </button>
        </div>
      </div>
    </section>`;
}

function compatibilitySection(item) {
  const models = item.compatibleModels || [];
  const loras = item.compatibleLoras || [];
  if (!models.length && !loras.length) return "";
  return `
    <section class="content-card">
      <h3>${icon("i-layers")} ${escapeHtml(t("Compatibility"))}</h3>
      ${models.length ? `
        <h4 style="font-size:0.95rem;margin-bottom:0.5rem">${escapeHtml(t("Compatible models"))}</h4>
        <div class="compat-row" data-compat-models></div>` : ""}
      ${loras.length ? `
        <h4 style="font-size:0.95rem;margin:1rem 0 0.5rem">${escapeHtml(t("Recommended LoRAs"))}</h4>
        <div class="compat-row" data-compat-loras></div>` : ""}
    </section>`;
}

function settingsPanel(item) {
  const s = item.settings || {};
  const rows = [
    [t("Model"), s.model],
    [t("Resolution"), s.width && s.height ? `${s.width} × ${s.height}` : null],
    [t("Steps"), s.steps],
    ["CFG", s.cfg],
    [t("Sampler"), s.sampler],
    [t("Aspect"), s.aspect],
  ].filter(([, v]) => v);
  return `
    <div class="side-card">
      <h3>${icon("i-gear")} ${escapeHtml(t("Generator Settings"))}</h3>
      <div class="spec-grid">
        ${rows.map(([label, value]) => `
          <div class="spec-item">
            <div class="spec-label">${icon("i-info")}${escapeHtml(t(label))}</div>
            <div class="spec-value">${escapeHtml(value)}</div>
          </div>`).join("")}
      </div>
    </div>`;
}
