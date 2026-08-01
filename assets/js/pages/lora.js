/**
 * Promptition — LoRA Details
 * pages/lora.js
 */

import { bootDetailPage } from "./shared.js";
import { icon, escapeHtml, render } from "../utils/dom.js";
import { formatCount } from "../utils/helpers.js";
import { initTabs } from "../components/tabs.js";
import { t } from "../core/i18n.js";
import {
  featureList,
  examplesSection,
  relatedSection,
  codeBlock,
} from "../components/detail.js";

bootDetailPage("loras", async (item) => {
  const container = document.querySelector("[data-detail-content]");
  if (!container) return;

  render(container, `
    <div class="content-grid">
      <div>
        ${overviewSection(item)}

        ${examplesSection(item, "loras")}

        <section class="content-card">
          <h3>${icon("i-doc")} ${escapeHtml(t("Trigger Words"))}</h3>
          <div class="tag-list">
            ${(item.triggerWords || []).map((w) => `<span class="badge badge-brand font-mono">${escapeHtml(w)}</span>`).join("")}
          </div>
          <div style="margin-top:1rem">
            ${codeBlock(t("Prompt usage"), buildUsagePrompt(item))}
          </div>
        </section>

        ${trainingSection(item)}

        <div data-related></div>
      </div>
      <aside class="content-side">
        <div class="side-panel">
          ${settingsPanel(item)}
          ${downloadPanel(item)}
        </div>
      </aside>
    </div>
  `);

  initTabs?.();

  container.querySelectorAll("[data-strength-slider]").forEach((slider) => {
    slider.addEventListener("input", () => {
      const label = container.querySelector("[data-strength-value]");
      if (label) label.textContent = slider.value;
    });
  });

  relatedSection("loras", item.related, "[data-related]");
});

function overviewSection(item) {
  return `
    <section class="content-card">
      <h3>${icon("i-info")} ${escapeHtml(t("Overview"))}</h3>
      <p>${escapeHtml(item.description || "")}</p>
      ${item.effects?.length ? `<div style="margin-top:1rem">${featureList(item.effects)}</div>` : ""}
      <div class="spec-grid" style="margin-top:1rem">
        ${spec(t("Base model"), item.baseModel, "i-layers")}
        ${spec(t("Category"), item.category, "i-grid")}
        ${spec(t("License"), item.license, "i-doc")}
        ${spec(t("Size"), item.sizeMb ? `${item.sizeMb} MB` : "—", "i-database")}
      </div>
    </section>`;
}

function spec(label, value, iconName) {
  return `
    <div class="spec-item">
      <div class="spec-label">${icon(iconName)}${escapeHtml(t(label))}</div>
      <div class="spec-value">${escapeHtml(value || "—")}</div>
    </div>`;
}

function buildUsagePrompt(item) {
  const trigger = item.triggerWords?.[0] && item.triggerWords[0] !== "none (global)"
    ? item.triggerWords[0]
    : "(no trigger word — use globally)";
  const strength = item.recommendedStrength != null ? item.recommendedStrength : 0.7;
  return `${trigger} masterful portrait, highly detailed\n\nLoRA weight: ${strength}`;
}

function trainingSection(item) {
  if (!item.settings && !item.trainedOn) return "";
  return `
    <section class="content-card">
      <h3>${icon("i-cpu")} ${escapeHtml(t("Training Details"))}</h3>
      <div class="spec-grid">
        ${spec(t("Steps"), item.settings?.steps ? item.settings.steps.toLocaleString() : "—", "i-clock")}
        ${spec(t("Network dim"), item.settings?.networkDim ? `dim ${item.settings.networkDim}` : "—", "i-layers")}
        ${spec(t("Learning rate"), item.settings?.learningRate || "—", "i-trending")}
        ${spec(t("Scheduler"), item.settings?.scheduler || "—", "i-gear")}
      </div>
      ${item.trainedOn?.length ? `<div style="margin-top:1rem">${featureList(item.trainedOn)}</div>` : ""}
    </section>`;
}

function settingsPanel(item) {
  const range = item.range || [];
  return `
    <div class="side-card">
      <h3>${icon("i-gear")} ${escapeHtml(t("Usage Settings"))}</h3>
      <div class="spec-grid">
        ${spec(t("Recommended"), item.recommendedStrength, "i-check")}
        ${spec(t("Range"), range.length === 2 ? `${range[0]} – ${range[1]}` : "—", "i-sort")}
      </div>
      ${range.length === 2 ? `
        <label class="field" style="margin-top:1rem">
          <span class="field-label">${escapeHtml(t("Strength"))}</span>
          <input type="range" class="range" min="${range[0]}" max="${range[1]}" step="0.05" value="${item.recommendedStrength ?? range[0]}" data-strength-slider>
          <span class="field-hint" data-strength-value>${item.recommendedStrength ?? range[0]}</span>
        </label>` : ""}
    </div>`;
}

function downloadPanel(item) {
  return `
    <div class="side-card">
      <h3>${icon("i-download")} ${escapeHtml(t("Download"))}</h3>
      <div class="download-list">
        <div class="download-item">
          ${icon("i-download")}
          <span class="meta">
            <span class="name">${escapeHtml(item.id)}.safetensors</span>
            <span class="size">${escapeHtml(formatCount(item.downloads || 0))} ${escapeHtml(t("downloads"))}</span>
          </span>
        </div>
      </div>
    </div>`;
}
