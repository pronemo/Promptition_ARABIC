/**
 * Promptition — Global Search
 * components/searchbox.js
 *
 * Embedded search experience: an input that queries every collection as the
 * user types and shows grouped, keyboard-navigable results. Any element with
 * [data-searchbox] becomes a live search box.
 */

import { CONFIG } from "../core/config.js";
import { t } from "../core/i18n.js";
import { qs, qsa, icon, escapeHtml } from "../utils/dom.js";
import { debounce } from "../utils/helpers.js";
import { searchItems, fetchCollection } from "../utils/data.js";
import { detailUrl } from "../core/router.js";
import { coverUrl } from "./cover.js";

const GROUPS = 3; // max groups shown
const PER_GROUP = 5;

let cache = null;

async function loadAll() {
  if (cache) return cache;
  const groups = await Promise.all(
    CONFIG.collections.map((config) =>
      fetchCollection(config.type)
        .then((payload) => ({ type: config.type, config, items: payload.items }))
        .catch(() => null)
    )
  );
  cache = groups.filter(Boolean);
  return cache;
}

function highlight(name, query) {
  const text = String(name || "");
  const q = String(query || "").trim();
  if (!q) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${escapeRegExp(escapeHtml(q))})`, "gi");
  return escaped.replace(regex, "<mark>$1</mark>");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Initialise every [data-searchbox] on the page.
 */
export function initGlobalSearch() {
  qsa("[data-searchbox]").forEach(setupSearchBox);
}

function setupSearchBox(root) {
  const input = root.querySelector("input[type='search'], input[type='text']");
  if (!input) return;
  root.classList.add("searchbar");

  const dropdown = document.createElement("div");
  dropdown.className = "search-dropdown";
  dropdown.setAttribute("role", "listbox");
  root.append(dropdown);

  let items = []; // flattened {type, config, item}
  let activeIndex = -1;

  const close = () => {
    dropdown.classList.remove("is-open");
    dropdown.setAttribute("aria-expanded", "false");
    activeIndex = -1;
  };

  const open = () => {
    dropdown.classList.add("is-open");
    dropdown.setAttribute("aria-expanded", "true");
  };

  const render = (results) => {
    items = [];
    let markup = "";
    let count = 0;

    for (const group of results.slice(0, GROUPS)) {
      markup += `<div class="sd-group"><p class="sd-title">${escapeHtml(group.config.label)}</p>`;
      for (const item of group.hits.slice(0, PER_GROUP)) {
        items.push({ type: group.type, config: group.config, item });
        markup += `
          <a class="sd-item" href="${detailUrl(group.config, item.id)}" role="option" id="sd-${count}">
            <span class="sd-thumb"><img src="${coverUrl(item)}" alt="" loading="lazy" decoding="async"></span>
            <span class="sd-name">
              <strong>${highlight(item.name || item.title, input.value)}</strong>
              <small>${escapeHtml(group.config.singular)} · ${escapeHtml(item.category || "")}</small>
            </span>
            ${icon("i-arrow-right")}
          </a>`;
        count++;
      }
      markup += `</div>`;
    }

    if (!count) {
      markup = `<div class="sd-empty">${escapeHtml(t("No matches for"))} "${escapeHtml(input.value)}". ${escapeHtml(t("Try the"))} <a class="link" href="search.html?q=${encodeURIComponent(input.value)}">${escapeHtml(t("full search"))}</a>.</div>`;
    }

    dropdown.innerHTML = markup;
    open();
  };

  const run = debounce(async () => {
    const query = input.value.trim();
    if (query.length < CONFIG.search.minChars) {
      close();
      return;
    }
    const groups = await loadAll();
    const results = groups
      .map((g) => ({ ...g, hits: searchItems(g.items, query) }))
      .filter((g) => g.hits.length)
      .sort((a, b) => b.hits.length - a.hits.length);
    render(results);
  }, CONFIG.search.debounceMs);

  input.addEventListener("input", run);
  input.addEventListener("focus", () => {
    if (items.length) open();
  });

  const highlightRow = (index) => {
    activeIndex = index;
    qsa(".sd-item", dropdown).forEach((node, i) => {
      node.classList.toggle("is-highlighted", i === index);
    });
  };

  input.addEventListener("keydown", (e) => {
    const rows = qsa(".sd-item", dropdown);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!rows.length) return;
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const next = (activeIndex + delta + rows.length) % rows.length;
      highlightRow(next);
      rows[next].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && rows[activeIndex]) {
        e.preventDefault();
        window.location.href = rows[activeIndex].getAttribute("href");
      }
    } else if (e.key === "Escape") {
      close();
    }
  });

  dropdown.addEventListener("mousemove", (e) => {
    const row = e.target.closest(".sd-item");
    if (!row) return;
    highlightRow(qsa(".sd-item", dropdown).indexOf(row));
  });

  // Click outside closes the dropdown
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) close();
  });
}
