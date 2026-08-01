/**
 * Promptition — Compare
 * pages/compare.js
 *
 * Side-by-side comparison of up to four saved resources across the common
 * metadata fields every collection exposes (rating, license, publisher,
 * downloads, tags) with type-specific rows for the top families.
 */

import { initApp } from "../core/app.js";
import { getCollection } from "../core/config.js";
import { icon, escapeHtml, render, qs } from "../utils/dom.js";
import { Compare } from "../utils/storage.js";
import { lookupKey } from "../utils/data.js";
import { detailUrl } from "../core/router.js";
import { formatCount } from "../utils/helpers.js";
import { coverUrl } from "../components/cover.js";
import { compareLabel } from "../components/compare.js";
import { t } from "../core/i18n.js";

async function bootCompare() {
  await initApp();
  const tableEl = qs("[data-compare-table]");
  const emptyEl = qs("[data-compare-empty]");
  if (!tableEl) return;

  const keys = Compare.list();
  if (!keys.length) {
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  const records = (await Promise.all(keys.map((k) => lookupKey(k).catch(() => null))))
    .filter(Boolean);

  if (!records.length) {
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  const totalEl = qs("[data-compare-total]");
  if (totalEl) totalEl.textContent = t("Comparing {count} resources", { count: records.length });

  render(tableEl, renderTable(records));
  wireRemoveButtons(tableEl);
}

function renderTable(records) {
  const groupByType = records.reduce((acc, r) => {
    (acc[r.type] ||= []).push(r);
    return acc;
  }, {});

  const typeLabels = Object.keys(groupByType)
    .map((t) => `${escapeHtml(compareLabel(t))} ×${groupByType[t].length}`)
    .join(", ");

  const sharedRows = rows(records, [
    ["Publisher", (r) => r.publisher],
    ["Category", (r) => r.category],
    ["License", (r) => r.license],
    ["Version", (r) => r.version],
    ["Released", (r) => r.released],
    ["Downloads", (r) => (r.downloads ? formatCount(r.downloads) : "—")],
    ["Ratings", (r) => (r.rating ? `${r.rating} ★ (${formatCount(r.ratingsCount || 0)})` : "—")],
  ]);

  const modelRows = typeRows(records, "models", [
    ["Architecture", (r) => r.architecture],
    ["Base model", (r) => r.baseModel],
    ["Resolution", (r) => (r.supportedResolution || []).join(" / ")],
    ["Quantizations", (r) => (r.quantizations || []).join(", ")],
  ]);

  const toolRows = typeRows(records, "tools", [
    ["Platform", (r) => r.platform],
    ["Interface", (r) => r.interface],
    ["License", (r) => r.license],
  ]);

  const loraRows = typeRows(records, "loras", [
    ["Trigger words", (r) => (r.triggerWords || []).join(", ")],
    ["Base model", (r) => r.baseModel],
    ["Recommended strength", (r) => r.recommendedStrength],
  ]);

  const workflowRows = typeRows(records, "workflows", [
    ["Difficulty", (r) => r.difficulty],
    ["Est. time", (r) => r.estimatedTime],
    ["ComfyUI version", (r) => r.comfyuiVersion],
  ]);

  return `
    <div class="compare-view">
      <p class="field-hint">${escapeHtml(typeLabels)}</p>
      <div class="table-scroll">
        <table class="compare-table">
          <thead>
            <tr>
              <th scope="col" class="compare-th-fixed">${escapeHtml(t("Feature"))}</th>
              ${records.map((r) => `<th scope="col">${thumbCell(r)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${sharedRows}
            ${modelRows}
            ${toolRows}
            ${loraRows}
            ${workflowRows}
          </tbody>
        </table>
      </div>
    </div>`;
}

function thumbCell(record) {
  const config = getCollection(record.type);
  const name = record.name || record.title || record.id;
  return `
    <a href="${detailUrl(config, record.id)}" class="compare-thumb-link">
      <img src="${coverUrl(record)}" alt="" width="56" height="56" loading="lazy" decoding="async">
      <strong>${escapeHtml(name)}</strong>
    </a>`;
}

function rows(records, fields) {
  return fields
    .map(
      ([label, pick]) => `
      <tr>
        <th scope="row" class="compare-th-fixed">${escapeHtml(t(label))}</th>
        ${records.map((r) => `<td>${escapeHtml(pick(r) || "—")}</td>`).join("")}
      </tr>`
    )
    .join("");
}

function typeRows(records, type, fields) {
  const subset = records.filter((r) => r.type === type);
  if (!subset.length) return "";
  return fields
    .map(
      ([label, pick]) => `
      <tr>
        <th scope="row" class="compare-th-fixed">${escapeHtml(t(label))}</th>
        ${records.map((r) => (r.type === type ? `<td>${escapeHtml(pick(r) || "—")}</td>` : `<td class="muted">—</td>`)).join("")}
      </tr>`
    )
    .join("");
}

function wireRemoveButtons(tableEl) {
  tableEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-compare-remove]");
    if (!btn) return;
    Compare.remove(btn.dataset.type, btn.dataset.id);
    window.location.reload();
  });
}

bootCompare();
