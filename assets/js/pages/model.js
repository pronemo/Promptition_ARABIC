/**
 * Promptition — Model Details
 * pages/model.js
 */

import { bootDetailPage } from "./shared.js";
import { icon, escapeHtml, render } from "../utils/dom.js";
import {
  specGrid,
  featureList,
  examplesSection,
  relatedSection,
  renderCompatRows,
  codeBlock,
} from "../components/detail.js";
import { initTabs } from "../components/tabs.js";
import { t } from "../core/i18n.js";

bootDetailPage("models", async (item) => {
  const container = document.querySelector("[data-detail-content]");
  if (!container) return;

  render(container, `
    <div class="content-grid">
      <div>
        ${overviewSection(item)}

        <section class="content-card">
          <h3>${icon("i-code")} ${escapeHtml(t("Quick Start"))}</h3>
          ${codeBlock(t("ComfyUI · Load checkpoint"), `CheckpointLoaderSimple { ckpt_name: "${item.id}.safetensors" }`)}
        </section>

        ${examplesSection(item, "models")}

        ${compatibleToolsSection(item)}

        <div data-related></div>
      </div>
      <aside class="content-side">
        <div class="side-panel">
          ${requirementsPanel(item)}
          ${downloadsPanel(item)}
        </div>
      </aside>
    </div>
  `);

  initTabs(document.querySelector("[data-detail-tabs]"));
  relatedSection("models", item.related, "[data-related]");
  renderCompatRows({ tools: item.compatibleTools }, container);
});

function overviewSection(item) {
  return `
    <section class="content-card">
      <h3>${icon("i-info")} ${escapeHtml(t("Overview"))}</h3>
      <p>${escapeHtml(item.description || "")}</p>
      ${item.features?.length ? `<div style="margin-top:1rem">${featureList(item.features)}</div>` : ""}
    </section>`;
}

function compatibleToolsSection(item) {
  const ids = item.compatibleTools || [];
  if (!ids.length) return "";
  return `
    <section class="content-card">
      <h3>${icon("i-wrench")} ${escapeHtml(t("Compatible Tools"))}</h3>
      <div class="compat-row" data-compat-tools></div>
    </section>`;
}

function requirementsPanel(item) {
  const req = item.requirements || {};
  return `
    <div class="side-card">
      <h3>${icon("i-cpu")} ${escapeHtml(t("Requirements"))}</h3>
      <div class="spec-grid">
        ${entry(t("Min VRAM"), req.minVram)}
        ${entry(t("Recommended"), req.recommendedVram)}
        ${entry("RAM", req.minRam)}
        ${entry("CUDA", req.cuda)}
        ${entry("Python", req.python)}
      </div>
    </div>`;
}

function downloadsPanel(item) {
  const links = item.links || {};
  const quants = item.quantizations || [];
  return `
    <div class="side-card">
      <h3>${icon("i-download")} ${escapeHtml(t("Downloads"))}</h3>
      <div class="download-list">
        ${links.download ? downloadItem(t("Original weights"), links.download, "external") : ""}
        ${links.github ? downloadItem(t("Source / docs"), links.github, "external") : ""}
        ${links.website ? downloadItem(t("Publisher site"), links.website, "external") : ""}
      </div>
      ${quants.length ? `<div style="margin-top:0.75rem">${quantTable(quants)}</div>` : ""}
    </div>`;
}

function entry(label, value) {
  return `
    <div class="spec-item">
      <div class="spec-label">${icon("i-info")}${escapeHtml(label)}</div>
      <div class="spec-value">${escapeHtml(value || "—")}</div>
    </div>`;
}

function downloadItem(name, url, kind) {
  const href = escapeHtml(url);
  return `
    <a class="download-item" href="${href}" target="_blank" rel="noopener">
      ${icon(kind === "external" ? "i-external" : "i-download")}
      <span class="meta">
        <span class="name">${escapeHtml(name)}</span>
        <span class="size">${escapeHtml(t("External link"))}</span>
      </span>
    </a>`;
}

function quantTable(quants) {
  return `
    <div class="data-table" style="border:none">
      <table>
        <thead><tr><th>${escapeHtml(t("Quant"))}</th><th>${escapeHtml(t("Size"))}</th><th>${escapeHtml(t("Quality"))}</th></tr></thead>
        <tbody>
          ${quants.map((q) => `<tr><td class="font-mono">${escapeHtml(q.name)}</td><td>${escapeHtml(q.sizeGb)} GB</td><td>${escapeHtml(q.quality)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}
