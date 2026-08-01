/**
 * Promptition — Collection Page Engine
 * components/collection.js
 *
 * Reusable controller powering every collection page (models, tools, loras,
 * prompts, styles, workflows, tutorials, datasets, nodes). Owns the data
 * load, URL-synced filters, sorting, pagination, view modes and the
 * loading/empty/error states. Page controllers are thin wrappers.
 */

import { CONFIG, getCollection } from "../core/config.js";
import { getQuery, setQuery, onRouteChange } from "../core/router.js";
import { t } from "../core/i18n.js";
import { qs, qsa, icon, escapeHtml, render } from "../utils/dom.js";
import { debounce } from "../utils/helpers.js";
import {
  fetchCollection,
  searchItems,
  byCategory,
  byTags,
  byBaseModel,
  byDifficulty,
  sortItems,
  getCategories,
  getTagCounts,
} from "../utils/data.js";
import { card, emptyCard, wireFavorites, wireCardActions } from "./card.js";
import { pagination } from "./pagination.js";
import { toast } from "./toast.js";
import { Favorites } from "../utils/storage.js";

const SORT_LABELS = {
  popular: "Most popular",
  rating: "Top rated",
  newest: "Newest",
  downloads: "Most downloaded",
  used: "Most used",
  name: "Name A–Z",
  samples: "Largest",
  stars: "Most starred",
};

export class CollectionController {
  /**
   * @param {string} type  Collection type.
   * @param {object} [options]
   * @param {string[]} [options.extraFilters] Additional URL filter keys to pass through.
   */
  constructor(type, options = {}) {
    this.type = type;
    this.config = getCollection(type);
    this.extraFilters = options.extraFilters || [];
    this.items = [];
    this.filtered = [];
    this.state = {
      q: "",
      category: [],
      tags: [],
      sort: "popular",
      page: 1,
      view: "grid",
      favoritesOnly: false,
    };

    // DOM
    this.grid = qs("[data-collection-results]");
    this.countEl = qs("[data-collection-count]");
    this.searchInput = qs("[data-collection-search]");
    this.sortSelect = qs("[data-collection-sort]");
    this.categoriesEl = qs("[data-collection-categories]");
    this.tagsEl = qs("[data-collection-tags]");
    this.paginationEl = qs("[data-collection-pagination]");
    this.viewToggles = qsa("[data-view-toggle]");
    this.favToggle = qs("[data-favorites-only]");
    this.filtersBtn = qs("[data-filter-toggle]");
    this.filtersPanel = qs("[data-filter-sidebar]");
    this.stateEl = qs("[data-collection-state]");
  }

  /** Read URL params into internal state. */
  loadStateFromUrl() {
    const params = getQuery();
    this.state.q = String(params.q || "");
    this.state.category = toArray(params.category);
    this.state.tags = toArray(params.tag || params.tags);
    this.state.sort = SORT_LABELS[params.sort] ? params.sort : "popular";
    this.state.page = Math.max(1, parseInt(params.page, 10) || 1);
    this.state.view = params.view === "list" ? "list" : "grid";
    this.state.favoritesOnly = params.favorites === "1";
    for (const key of this.extraFilters) {
      this.state[key] = toArray(params[key]);
    }
  }

  /** Push internal state to the URL. */
  syncUrl() {
    const params = {};
    if (this.state.q) params.q = this.state.q;
    if (this.state.category.length) params.category = this.state.category;
    if (this.state.tags.length) params.tag = this.state.tags;
    if (this.state.sort !== "popular") params.sort = this.state.sort;
    if (this.state.page > 1) params.page = this.state.page;
    if (this.state.view !== "grid") params.view = this.state.view;
    if (this.state.favoritesOnly) params.favorites = "1";
    for (const key of this.extraFilters) {
      if (this.state[key]?.length) params[key] = this.state[key];
    }
    setQuery(params, { replace: true });
  }

  async boot() {
    if (!this.grid) return;
    this.loadStateFromUrl();
    this.renderPageHero();
    this.renderChrome();
    this.bindEvents();
    await this.load();
    onRouteChange(() => {
      this.loadStateFromUrl();
      this.renderPageHero();
      this.renderChrome();
      this.applyFilters();
    });
  }

  /** Localize the static page hero (title, description, breadcrumb) from CONFIG. */
  renderPageHero() {
    const title = qs(".page-title");
    const desc = qs(".page-description");
    const current = qs(".breadcrumbs .current");
    if (title) title.textContent = this.config.label;
    if (desc) desc.textContent = this.config.description;
    if (current) current.textContent = this.config.label;
  }

  /** Render the search input value, sort select, view and active filters. */
  renderChrome() {
    if (this.searchInput) this.searchInput.value = this.state.q;
    if (this.sortSelect) {
      this.sortSelect.innerHTML = this.config.sortable
        .map((s) => `<option value="${s}"${s === this.state.sort ? " selected" : ""}>${escapeHtml(t(SORT_LABELS[s] || s))}</option>`)
        .join("");
    }
    this.viewToggles.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.viewToggle === this.state.view);
    });
    if (this.favToggle) this.favToggle.classList.toggle("is-active", this.state.favoritesOnly);
    this.renderCategoryFilters();
    this.renderTagFilters();
  }

  async load() {
    this.setState("loading");
    try {
      const payload = await fetchCollection(this.type);
      this.items = payload.items || [];
      this.renderCategoryFilters();
      this.renderTagFilters();
      this.applyFilters();
    } catch (err) {
      this.setState("error", err.message || "Failed to load data");
    }
  }

  applyFilters() {
    const { q, category, tags, sort, favoritesOnly } = this.state;

    let list = this.items;

    // favorites-only
    if (favoritesOnly) {
      list = list.filter((item) => Favorites.has(this.type, item.id));
    }

    list = searchItems(list, q, ["baseModel", "author"]);
    list = byCategory(list, category);
    list = byTags(list, tags);
    list = byBaseModel(list, this.state.baseModel || []);
    list = byDifficulty(list, this.state.difficulty || []);

    this.filtered = sortItems(list, sort, this.config);

    this.total = this.filtered.length;
    this.render();
  }

  render() {
    this.renderResults();
    this.renderPagination();
    this.updateCount();
  }

  renderResults() {
    const pageSize = this.pageSize();
    const start = (this.state.page - 1) * pageSize;
    const pageItems = this.filtered.slice(start, start + pageSize);

    if (!this.filtered.length) {
      render(this.grid, emptyCard(t(this.state.q ? `No ${this.type} match your search.` : `No ${this.type} found.`)));
      return;
    }

    const markup = pageItems
      .map((item) => (this.state.view === "list" ? card(item, this.type) : card(item, this.type)))
      .join("");

    render(this.grid, markup);
    this.grid.classList.toggle("is-list-view", this.state.view === "list");
    wireFavorites(this.grid);
    wireCardActions(this.grid);
  }

  renderPagination() {
    if (!this.paginationEl) return;
    pagination({
      container: this.paginationEl,
      page: this.state.page,
      pageSize: this.pageSize(),
      total: this.filtered.length,
      label: this.config.label,
      onChange: (page) => {
        this.state.page = page;
        this.syncUrl();
        this.render();
        window.scrollTo({ top: this.grid?.offsetTop ? this.grid.offsetTop - 140 : 0, behavior: "smooth" });
      },
    });
  }

  pageSize() {
    const sizes = CONFIG.limits.pageSizes;
    return sizes[0];
  }

  updateCount() {
    if (!this.countEl) return;
    this.countEl.innerHTML = `<strong>${this.filtered.length}</strong> ${escapeHtml(this.config.label)}`;
  }

  setState(kind, message = "") {
    if (!this.stateEl) {
      if (kind === "error") toast(message, "error");
      return;
    }
    const states = {
      loading: `
        <div class="state-loading">
          <span class="spinner" aria-hidden="true"></span>
          <span>${escapeHtml(t(`Loading ${this.type}…`))}</span>
        </div>`,
      error: `
        <div class="error-banner">
          ${icon("i-alert")}
          <p><strong>${escapeHtml(t("Something went wrong."))}</strong> ${escapeHtml(message)}</p>
          <button type="button" class="retry" data-retry>${escapeHtml(t("Retry"))}</button>
        </div>`,
      empty: emptyCard(message),
    };
    render(this.stateEl, states[kind] || "");
    qs("[data-retry]", this.stateEl)?.addEventListener("click", () => this.load());
  }

  renderCategoryFilters() {
    if (!this.categoriesEl) return;
    const categories = getCategories(this.items);
    const counts = new Map();
    for (const item of this.items) {
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    }
    const all = this.state.category.length === 0;
    const markup = `
      <button type="button" class="filter-option${all ? " is-active" : ""}" data-cat="">
        ${icon("i-grid")} ${escapeHtml(t("All categories"))} <span class="count">${this.items.length}</span>
      </button>
      ${categories
        .map(
          (cat) => `
          <button type="button" class="filter-option${this.state.category.includes(cat) ? " is-active" : ""}" data-cat="${escapeHtml(cat)}">
            ${icon("i-tag")} ${escapeHtml(cat)} <span class="count">${counts.get(cat) || 0}</span>
          </button>`
        )
        .join("")}
    `;
    render(this.categoriesEl, markup);
  }

  renderTagFilters() {
    if (!this.tagsEl) return;
    const counts = getTagCounts(this.items);
    const markup = this.items
      .map((item) => item.tags || [])
      .flat()
      .reduce((acc, tag) => acc.set(tag, (acc.get(tag) || 0) + 1), new Map());
    const topTags = [...markup.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);
    render(
      this.tagsEl,
      topTags
        .map(
          ([tag, count]) => `
          <button type="button" class="chip${this.state.tags.includes(tag) ? " is-active" : ""}" data-tag="${escapeHtml(tag)}">
            ${escapeHtml(tag)} <span class="count">${count}</span>
          </button>`
        )
        .join("")
    );
  }

  bindEvents() {
    // search
    if (this.searchInput) {
      const run = debounce(() => {
        this.state.q = this.searchInput.value.trim();
        this.state.page = 1;
        this.syncUrl();
        this.applyFilters();
      }, CONFIG.search.debounceMs);
      this.searchInput.addEventListener("input", run);
      const clearBtn = qs(".js-search-clear", this.searchInput.closest(".input-wrap"));
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          this.searchInput.value = "";
          this.state.q = "";
          this.state.page = 1;
          this.syncUrl();
          this.applyFilters();
          this.searchInput.focus();
        });
      }
    }

    // sort
    if (this.sortSelect) {
      this.sortSelect.addEventListener("change", () => {
        this.state.sort = this.sortSelect.value;
        this.state.page = 1;
        this.syncUrl();
        this.applyFilters();
      });
    }

    // category & tag filters (delegated)
    this.categoriesEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      const value = btn.dataset.cat;
      this.state.category = value ? [value] : [];
      this.state.page = 1;
      this.syncUrl();
      this.applyFilters();
    });

    this.tagsEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tag]");
      if (!btn) return;
      const value = btn.dataset.tag;
      this.state.tags = this.state.tags.includes(value)
        ? this.state.tags.filter((t) => t !== value)
        : [...this.state.tags, value];
      this.state.page = 1;
      this.syncUrl();
      this.applyFilters();
    });

    // sidebar clear links
    qs("[data-clear-categories]")?.addEventListener("click", () => {
      if (!this.state.category.length) return;
      this.state.category = [];
      this.state.page = 1;
      this.syncUrl();
      this.applyFilters();
    });
    qs("[data-clear-tags]")?.addEventListener("click", () => {
      if (!this.state.tags.length) return;
      this.state.tags = [];
      this.state.page = 1;
      this.syncUrl();
      this.applyFilters();
    });

    // view toggle
    this.viewToggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.state.view = btn.dataset.viewToggle;
        this.syncUrl();
        this.renderChrome();
        this.render();
      });
    });

    // favorites only
    if (this.favToggle) {
      this.favToggle.addEventListener("click", () => {
        this.state.favoritesOnly = !this.state.favoritesOnly;
        this.state.page = 1;
        this.syncUrl();
        this.renderChrome();
        this.applyFilters();
      });
    }

    // mobile filter panel
    if (this.filtersBtn && this.filtersPanel) {
      this.filtersBtn.addEventListener("click", () => {
        this.filtersPanel.classList.toggle("is-open");
        this.filtersBtn.setAttribute("aria-expanded", String(this.filtersPanel.classList.contains("is-open")));
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.filtersPanel.classList.remove("is-open");
        }
      });
    }
  }
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Collection page helpers for the toolbar favourites/compare shortcut.
 */
export function initCollectionToolbar(type) {
  const root = document.body;
  wireFavorites(root);
  wireCardActions(root);
}
