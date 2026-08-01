/**
 * Promptition — Node Pack Details
 * pages/node.js
 */

import { bootDetailPage } from "./shared.js";
import { icon, escapeHtml, render } from "../utils/dom.js";
import { formatCount } from "../utils/helpers.js";
import {
  featureList,
  relatedSection,
  codeBlock,
} from "../components/detail.js";
import { t } from "../core/i18n.js";

bootDetailPage("nodes", async (item) => {
  const container = document.querySelector("[data-detail-content]");
  if (!container) return;

  render(container, `
    <div class="content-grid">
      <div>
        ${overviewSection(item)}

        <section class="content-card">
          <h3>${icon("i-gear")} ${escapeHtml(t("Installation"))}</h3>
          ${codeBlock(t("Command line"), `git clone ${item.github || ""} custom_nodes/${item.package || item.id}\ncd custom_nodes/${item.package || item.id}\npip install -r requirements.txt`)}
          <p style="margin-top:0.75rem;font-size:0.85rem;color:var(--text-muted)">${escapeHtml(t("Easier: install from the ComfyUI Manager inside ComfyUI."))}</p>
        </section>

        ${ioSection(item)}

        <div data-related></div>
      </div>
      <aside class="content-side">
        <div class="side-panel">
          ${metaPanel(item)}
        </div>
      </aside>
    </div>
  `);

  relatedSection("nodes", item.related, "[data-related]");
});

function overviewSection(item) {
  return `
    <section class="content-card">
      <h3>${icon("i-info")} ${escapeHtml(t("Overview"))}</h3>
      <p>${escapeHtml(item.description || "")}</p>
      ${item.features?.length ? `<div style="margin-top:1rem">${featureList(item.features)}</div>` : ""}
    </section>`;
}

function ioSection(item) {
  const inputs = item.inputs || [];
  const outputs = item.outputs || [];
  if (!inputs.length && !outputs.length) return "";
  return `
    <section class="content-card">
      <h3>${icon("i-node")} ${escapeHtml(t("Node Interface"))}</h3>
      ${inputs.length ? `
        <h4 style="font-size:0.95rem;margin-bottom:0.5rem">${escapeHtml(t("Inputs"))}</h4>
        <div class="tag-list" style="margin-bottom:1rem">${inputs.map((i) => `<span class="badge badge-accent font-mono">${escapeHtml(i)}</span>`).join("")}</div>` : ""}
      ${outputs.length ? `
        <h4 style="font-size:0.95rem;margin-bottom:0.5rem">${escapeHtml(t("Outputs"))}</h4>
        <div class="tag-list">${outputs.map((o) => `<span class="badge badge-brand font-mono">${escapeHtml(o)}</span>`).join("")}</div>` : ""}
    </section>`;
}

function metaPanel(item) {
  return `
    <div class="side-card">
      <h3>${icon("i-tag")} ${escapeHtml(t("Package Info"))}</h3>
      <div class="spec-grid">
        ${spec(t("Author"), item.author, "i-user")}
        ${spec(t("Version"), item.version, "i-tag")}
        ${spec(t("License"), item.license, "i-doc")}
        ${spec(t("Stars"), formatCount(item.stars || 0), "i-star")}
      </div>
      ${item.github ? `<a class="btn btn-ghost btn-block" style="margin-top:1rem" href="${escapeHtml(item.github)}" target="_blank" rel="noopener">${icon("i-github")} ${escapeHtml(t("View on GitHub"))}</a>` : ""}
    </div>`;
}

function spec(label, value, iconName) {
  return `
    <div class="spec-item">
      <div class="spec-label">${icon(iconName)}${escapeHtml(t(label))}</div>
      <div class="spec-value">${escapeHtml(value || "—")}</div>
    </div>`;
}
