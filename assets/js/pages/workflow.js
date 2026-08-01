/**
 * Promptition — Workflow Details
 * pages/workflow.js
 */

import { bootDetailPage } from "./shared.js";
import { icon, escapeHtml, render } from "../utils/dom.js";
import {
  relatedSection,
  codeBlock,
} from "../components/detail.js";
import { downloadJson } from "../components/detail.js";
import { t } from "../core/i18n.js";

bootDetailPage("workflows", async (item) => {
  const container = document.querySelector("[data-detail-content]");
  if (!container) return;

  render(container, `
    <div class="content-grid">
      <div>
        ${overviewSection(item)}

        <section class="content-card">
          <h3>${icon("i-node")} ${escapeHtml(t("Steps"))}</h3>
          <ol class="steps">
            ${(item.steps || [])
              .map(
                (step) => `
                <li class="step">
                  <h4>${escapeHtml(step.title)}</h4>
                  <p>${escapeHtml(step.description)}</p>
                </li>`
              )
              .join("")}
          </ol>
        </section>

        ${extensionsSection(item)}

        <section class="content-card">
          <h3>${icon("i-file-json")} ${escapeHtml(t("Workflow JSON"))}</h3>
          ${codeBlock(`${item.download?.filename || "workflow.json"}`, JSON.stringify(item.workflowJson || { nodes: [], links: [] }, null, 2))}
          <div style="margin-top:1rem">
            <button type="button" class="btn btn-primary" data-download-workflow>${icon("i-download")} ${escapeHtml(t("Download workflow"))}</button>
          </div>
        </section>

        <div data-related></div>
      </div>
      <aside class="content-side">
        <div class="side-panel">
          ${infoPanel(item)}
          ${compatibilityPanel(item)}
        </div>
      </aside>
    </div>
  `);

  container.querySelector("[data-download-workflow]")?.addEventListener("click", () => {
    downloadJson(item.download?.filename || `${item.id}.json`, item.workflowJson || {});
  });

  relatedSection("workflows", item.related, "[data-related]");
});

function overviewSection(item) {
  return `
    <section class="content-card">
      <h3>${icon("i-info")} ${escapeHtml(t("Overview"))}</h3>
      <p>${escapeHtml(item.description || "")}</p>
    </section>`;
}

function extensionsSection(item) {
  const exts = item.requiredExtensions || [];
  if (!exts.length) return "";
  return `
    <section class="content-card">
      <h3>${icon("i-wrench")} ${escapeHtml(t("Required Extensions"))}</h3>
      <div class="download-list">
        ${exts.map((ext) => `
          <a class="download-item" href="${escapeHtml(ext.url)}" target="_blank" rel="noopener">
            ${icon("i-github")}
            <span class="meta">
              <span class="name">${escapeHtml(ext.name)}</span>
              <span class="size">${escapeHtml(t("Install via ComfyUI Manager"))}</span>
            </span>
          </a>`).join("")}
      </div>
    </section>`;
}

function infoPanel(item) {
  return `
    <div class="side-card">
      <h3>${icon("i-info")} ${escapeHtml(t("At a glance"))}</h3>
      <div class="spec-grid">
        ${spec(t("Difficulty"), item.difficulty)}
        ${spec(t("Est. time"), item.estimatedTime)}
        ${spec(t("Downloads"), item.downloads)}
      </div>
    </div>`;
}

function spec(label, value) {
  return `
    <div class="spec-item">
      <div class="spec-label">${icon("i-info")}${escapeHtml(t(label))}</div>
      <div class="spec-value">${escapeHtml(value || "—")}</div>
    </div>`;
}

function compatibilityPanel(item) {
  const models = item.compatibleModels || [];
  const nodes = item.compatibleNodes || [];
  return `
    <div class="side-card">
      <h3>${icon("i-layers")} ${escapeHtml(t("Compatibility"))}</h3>
      ${models.length ? `
        <p class="field-hint" style="margin-bottom:0.5rem">${escapeHtml(t("Models"))}</p>
        <div class="tag-list" style="margin-bottom:1rem">${models.map((m) => `<span class="badge badge-default">${escapeHtml(m)}</span>`).join("")}</div>` : ""}
      ${nodes.length ? `
        <p class="field-hint" style="margin-bottom:0.5rem">${escapeHtml(t("Nodes used"))}</p>
        <div class="tag-list">${nodes.map((n) => `<span class="badge badge-brand font-mono">${escapeHtml(n)}</span>`).join("")}</div>` : ""}
    </div>`;
}
