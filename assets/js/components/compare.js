/**
 * Promptition — Compare
 * components/compare.js
 *
 * Manages the compare tray across collection pages: add/remove selected
 * resources, render the floating strip and navigate to the compare page.
 */

import { Compare } from "../utils/storage.js";
import { getCollection } from "../core/config.js";
import { t } from "../core/i18n.js";
import { lookupKey } from "../utils/data.js";
import { icon, escapeHtml, qs } from "../utils/dom.js";
import { toast } from "./toast.js";
import { coverUrl } from "./cover.js";

const MAX = 4;

/** Is the compare feature at capacity? */
export function isFull() {
  return Compare.isFull;
}

/** Toggle an item in the compare tray. */
export function toggleCompare(type, id) {
  const result = Compare.has(type, id)
    ? (Compare.remove(type, id), "removed")
    : Compare.add(type, id);
  if (result === "full") {
    toast(t("Compare") + ` — ${t("maximum")} ${MAX}`, "info");
  }
  return result;
}

/** Render the compare strip into [data-compare-strip] if present. */
export async function initCompareStrip() {
  const container = qs("[data-compare-strip]");
  if (!container) return;

  const render = async () => {
    const keys = Compare.list();
    if (!keys.length) {
      container.classList.add("is-empty");
      container.innerHTML = "";
      return;
    }
    container.classList.remove("is-empty");
    const records = await Promise.all(keys.map((k) => lookupKey(k).catch(() => null)));
    const items = records
      .filter(Boolean)
      .map(
        (r) => `
        <span class="compare-tag" data-type="${escapeHtml(r.type)}" data-id="${escapeHtml(r.id)}">
          <img src="${coverUrl(r)}" alt="" style="width:18px;height:18px;border-radius:4px">
          ${escapeHtml(r.name || r.title || r.id)}
          <button type="button" class="js-compare-remove" aria-label="${escapeHtml(t("Remove from compare"))}">${icon("i-close")}</button>
        </span>`
      )
      .join("");
    container.innerHTML = `
      <span class="text-sm text-muted font-semibold">${escapeHtml(t("Compare"))}</span>
      <div class="list">${items}</div>
      <a class="btn btn-primary btn-sm" href="compare.html">${icon("i-compare")} ${escapeHtml(t("Compare now"))}</a>
      <button type="button" class="btn btn-ghost btn-sm js-compare-clear">${icon("i-trash")} ${escapeHtml(t("Clear"))}</button>
    `;
  };

  container.addEventListener("click", (e) => {
    const remove = e.target.closest(".js-compare-remove");
    if (remove) {
      Compare.remove(remove.closest(".compare-tag").dataset.type, remove.closest(".compare-tag").dataset.id);
      return;
    }
    if (e.target.closest(".js-compare-clear")) {
      Compare.clear();
    }
  });

  Compare.onChange(() => render());
  await render();
}

/** Create a compare add button for a card row. */
export function compareButton(type, id) {
  const active = Compare.has(type, id);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `btn btn-icon js-compare-btn${active ? " is-active" : ""}`;
  btn.dataset.type = type;
  btn.dataset.id = id;
  btn.setAttribute("aria-pressed", String(active));
  btn.setAttribute("aria-label", active ? t("Remove from compare") : t("Add to compare"));
  btn.title = t("Compare");
  btn.innerHTML = icon("i-compare");
  btn.addEventListener("click", () => {
    const result = toggleCompare(type, id);
    const nowActive = Compare.has(type, id);
    btn.classList.toggle("is-active", nowActive);
    btn.setAttribute("aria-pressed", String(nowActive));
    btn.setAttribute("aria-label", nowActive ? t("Remove from compare") : t("Add to compare"));
    if (result !== "full" && result !== false) {
      toast(nowActive ? t("Added to compare") : t("Removed from compare"), "info");
    }
  });
  return btn;
}

/** Collection label used by the compare page. */
export function compareLabel(type) {
  const config = getCollection(type);
  return config?.singular || type;
}
