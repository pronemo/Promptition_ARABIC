/**
 * Promptition — Tool Details
 * pages/tool.js
 */

import { bootDetailPage } from "./shared.js";
import { icon, escapeHtml, render } from "../utils/dom.js";
import {
  featureList,
  examplesSection,
  relatedSection,
  codeBlock,
} from "../components/detail.js";
import { shotUrl } from "../components/cover.js";
import { initTabs } from "../components/tabs.js";
import { t } from "../core/i18n.js";

bootDetailPage("tools", async (item) => {
  const container = document.querySelector("[data-detail-content]");
  if (!container) return;

  render(container, `
    <div class="content-grid">
      <div>
        ${overviewSection(item)}

        ${examplesSection(item, "tools")}

        ${screenshotsSection(item)}

        <section class="content-card">
          <h3>${icon("i-code")} ${escapeHtml(t("Install"))}</h3>
          ${installBlock(item)}
        </section>

        <div data-related></div>
      </div>
      <aside class="content-side">
        <div class="side-panel">
          ${linksPanel(item)}
          ${requirementsPanel(item)}
          ${formatsPanel(item)}
        </div>
      </aside>
    </div>
  `);

  initTabs(document.querySelector("[data-detail-tabs]"));
  relatedSection("tools", item.related, "[data-related]");
});

function overviewSection(item) {
  return `
    <section class="content-card">
      <h3>${icon("i-info")} ${escapeHtml(t("Overview"))}</h3>
      <p>${escapeHtml(item.description || "")}</p>
      ${item.features?.length ? `<div style="margin-top:1rem">${featureList(item.features)}</div>` : ""}
      <div class="spec-grid" style="margin-top:1rem">
        ${spec(t("Publisher"), item.publisher, "i-user")}
        ${spec(t("Version"), item.version, "i-tag")}
        ${spec(t("License"), item.license, "i-doc")}
        ${spec(t("Category"), item.category, "i-grid")}
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

function screenshotsSection(item) {
  const shots = item.screenshots || [];
  if (!shots.length) return "";
  return `
    <section class="content-card">
      <h3>${icon("i-image")} ${escapeHtml(t("Screenshots"))}</h3>
      <div class="shots-grid">
        ${shots.map((seed) => `<div class="shot"><img src="${shotUrl(seed)}" alt="${escapeHtml(item.name)} ${escapeHtml(t("screenshot"))}" loading="lazy" decoding="async"></div>`).join("")}
      </div>
    </section>`;
}

function installBlock(item) {
  const isNode = item.type === "node";
  if (isNode && item.installation) {
    return codeBlock(t("Installation"), item.installation);
  }
  const links = item.links || {};
  const download = links.download || links.github || "";
  return codeBlock(
    t("Quick install"),
    `# Download the latest release
# ${links.website || links.github || download}`
  );
}

function linksPanel(item) {
  const links = item.links || {};
  return `
    <div class="side-card">
      <h3>${icon("i-external")} ${escapeHtml(t("Links"))}</h3>
      <div class="download-list">
        ${linkRow(t("Website"), links.website)}
        ${linkRow(t("GitHub"), links.github, "i-github")}
        ${linkRow(t("Download"), links.download)}
      </div>
    </div>`;
}

function linkRow(label, url, iconName = "i-external") {
  if (!url) return "";
  return `
    <a class="download-item" href="${escapeHtml(url)}" target="_blank" rel="noopener">
      ${icon(iconName)}
      <span class="meta">
        <span class="name">${escapeHtml(label)}</span>
        <span class="size">${escapeHtml(t("Open"))}</span>
      </span>
    </a>`;
}

function requirementsPanel(item) {
  const req = item.requirements || {};
  const rows = [
    [t("OS"), (req.os || []).join(", ")],
    ["GPU", req.gpu],
    [t("Min VRAM"), req.minVram],
    ["Python", req.python],
    ["CUDA", req.cuda],
  ].filter(([, v]) => v);
  if (!rows.length) return "";
  return `
    <div class="side-card">
      <h3>${icon("i-cpu")} ${escapeHtml(t("Requirements"))}</h3>
      <div class="spec-grid">
        ${rows.map(([label, value]) => spec(label, value)).join("")}
      </div>
    </div>`;
}

function formatsPanel(item) {
  const formats = item.supportedFormats || [];
  if (!formats.length) return "";
  return `
    <div class="side-card">
      <h3>${icon("i-file-json")} ${escapeHtml(t("Supported Formats"))}</h3>
      <div class="tag-list">${formats.map((f) => `<span class="badge badge-default font-mono">${escapeHtml(f)}</span>`).join("")}</div>
    </div>`;
}
