/**
 * Promptition — 404 Page
 * pages/notfound.js
 */

import { initApp } from "../core/app.js";
import { icon, escapeHtml, render, qs } from "../utils/dom.js";
import { t } from "../core/i18n.js";

async function bootNotFound() {
  await initApp();
  const root = qs("[data-notfound]");
  if (!root) return;
  const code = qs("[data-notfound-code]");
  render(root, `
    <div class="state-box">
      <span class="state-icon">${icon("i-alert")}</span>
      <h1 class="state-title">${escapeHtml(t("Page not found"))}</h1>
      <p class="state-text">${escapeHtml(t("The page you requested does not exist or may have moved."))}</p>
      <div class="state-actions">
        <a class="btn btn-primary" href="index.html">${icon("i-home")} ${escapeHtml(t("Back home"))}</a>
        <a class="btn btn-ghost" href="search.html">${icon("i-search")} ${escapeHtml(t("Search"))}</a>
      </div>
    </div>`);
  if (code) code.textContent = "404";
}

bootNotFound();
