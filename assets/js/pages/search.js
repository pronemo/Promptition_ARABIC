/**
 * Promptition — Search
 * pages/search.js
 *
 * Full site-wide search across every collection with type, category and
 * rating facets, driven entirely by the query string so results are
 * shareable and back/forward friendly.
 */

import { initApp } from "../core/app.js";
import { getCollection, CONFIG } from "../core/config.js";
import { icon, escapeHtml, render, qs, qsa } from "../utils/dom.js";
import { searchAll } from "../utils/data.js";
import { getParam, setQuery, onRouteChange } from "../core/router.js";
import { debounce } from "../utils/helpers.js";
import { card, wireFavorites, wireCardActions } from "../components/card.js";
import { initCopyButtons } from "../components/copy.js";
import { t } from "../core/i18n.js";

let groups = [];
let activeType = "all";

async function bootSearch() {
  await initApp();
  initCopyButtons();

  const input = qs("[data-search-input]");
  const resultsEl = qs("[data-search-results]");
  const statusEl = qs("[data-search-status]");
  const facetsEl = qs("[data-search-facets]");
  const emptyEl = qs("[data-search-empty]");

  const initial = getParam("q");
  if (initial && input) {
    input.value = initial;
    input.setAttribute("value", initial);
  }
  activeType = getParam("type", "all");

  const run = debounce(() => {
    const query = input.value.trim();
    setQuery(query ? { q: query, type: activeType !== "all" ? activeType : undefined } : {}, { replace: true });
    execute(query);
  }, CONFIG.search.debounceMs);

  input.addEventListener("input", run);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setQuery({ q: input.value.trim() }, { replace: true });
      execute(input.value.trim());
    }
  });

  document.querySelector("[data-search-clear]")?.addEventListener("click", () => {
    input.value = "";
    input.focus();
    setQuery({}, { replace: true });
    execute("");
  });

  facetsEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-facet-type]");
    if (!btn) return;
    activeType = btn.dataset.facetType;
    qsa("[data-facet-type]", facetsEl).forEach((b) => b.classList.toggle("is-active", b === btn));
    const query = input.value.trim();
    setQuery(query ? { q: query, type: activeType !== "all" ? activeType : undefined } : {}, { replace: true });
    execute(query);
  });

  onRouteChange(() => {
    const q = getParam("q");
    if (input && q !== input.value) input.value = q || "";
  });

  await execute(initial, true);
}

async function execute(query, firstRun = false) {
  const resultsEl = qs("[data-search-results]");
  const statusEl = qs("[data-search-status]");
  const emptyEl = qs("[data-search-empty]");

  if (!firstRun) {
    render(resultsEl, `<div class="loading-block"><span class="spinner" aria-hidden="true"></span> ${escapeHtml(t("Searching…"))}</div>`);
  }

  const q = query.trim();
  groups = q.length >= CONFIG.search.minChars
    ? await searchAll(q, { onProgress: () => {} }).catch(() => [])
    : [];

  const total = groups.reduce((sum, g) => sum + g.hits.length, 0);
  if (statusEl) statusEl.textContent = q ? t("{total} results for {q}", { total, q }) : t("Type at least two characters to search.");

  renderFacets(q, total);

  if (!q || !total) {
    render(resultsEl, "");
    if (emptyEl) emptyEl.hidden = !q || !!total;
    return;
  }

  const visible = activeType === "all" ? groups : groups.filter((g) => g.type === activeType);
  render(
    resultsEl,
    visible
      .map(
        (group) => `
        <section class="search-group">
          <h3 class="search-group-title">
            ${icon(getCollection(group.type)?.icon || "i-search")}
            ${escapeHtml(group.config.label)}
            <span class="count">${group.hits.length}</span>
          </h3>
          <div class="grid cards-grid">${group.hits.map((item) => card(item, group.type)).join("")}</div>
        </section>`
      )
      .join("")
  );
  wireFavorites(resultsEl);
  wireCardActions(resultsEl);
}

function renderFacets(query, total) {
  const facetsEl = qs("[data-search-facets]");
  if (!facetsEl) return;
  if (!query) {
    render(facetsEl, "");
    return;
  }
  render(
    facetsEl,
    `
      <button type="button" class="chip${activeType === "all" ? " is-active" : ""}" data-facet-type="all">${escapeHtml(t("All"))} <span>${total}</span></button>
      ${groups.map((g) => `
        <button type="button" class="chip${activeType === g.type ? " is-active" : ""}" data-facet-type="${escapeHtml(g.type)}">
          ${escapeHtml(g.config.label)} <span>${g.hits.length}</span>
        </button>`).join("")}
    `
  );
}

bootSearch();
