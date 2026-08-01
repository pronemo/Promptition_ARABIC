/**
 * Promptition — Data Layer
 * utils/data.js
 *
 * Collection-aware access to the JSON database: fetching indexes and detail
 * records, full-text search, filtering, sorting and cross-collection lookups.
 * No UI here — page controllers and components consume these helpers.
 */

import { CONFIG, getCollection } from "../core/config.js";
import { getData } from "../core/api.js";
import { getLang } from "../core/i18n.js";
import { parseCount, sortBy } from "./helpers.js";

/**
 * Localize a data record. When the active language is Arabic and the item
 * carries an inline `ar` block, return a shallow-merged copy so the Arabic
 * field values win while structure (ids, numbers, links) is preserved.
 * The `ar` key itself is stripped from the result.
 */
export function localizeItem(item) {
  if (!item || typeof item !== "object" || getLang() !== "ar") return item;
  const ar = item.ar;
  if (!ar || typeof ar !== "object") return item;
  const localized = { ...item, ...ar };
  delete localized.ar;
  return localized;
}

/** Localize every item in a collection payload ({ type, items }). */
function localizePayload(payload) {
  if (!payload || !Array.isArray(payload.items)) return payload;
  return { ...payload, items: payload.items.map(localizeItem) };
}

/** Fetch and return a collection's index payload ({ type, updated, items }). */
export async function fetchCollection(type, options) {
  const config = getCollection(type);
  if (!config) throw new Error(`Unknown collection type: ${type}`);
  const payload = await getData(`${type}/index.json`, options);
  return localizePayload(payload || { type, items: [] });
}

/** Fetch a detail record, falling back to the index entry when missing. */
export async function fetchItem(type, id, options) {
  const config = getCollection(type);
  const item = await getData(`${type}/${id}.json`, options).catch(() => null);
  if (item) return localizeItem(item);
  const index = await fetchCollection(type);
  return index.items.find((i) => i.id === id) || null;
}

/** Fetch a detail record by URL-safe id. */
export async function fetchItemByQuery(type) {
  const { getDetailId } = await import("../core/router.js");
  const id = getDetailId();
  if (!id) return null;
  return fetchItem(type, id);
}

/** Resolve a stored "type:id" key into its record. */
export async function lookupKey(key) {
  const [type, id] = key.split(":");
  if (!type || !id) return null;
  const item = await fetchItem(type, id);
  if (!item) return null;
  return { ...item, id, type };
}

/**
 * Full-text search across an item list. Compares name, description, tags,
 * publisher, category and several optional fields. Query is tokenized.
 */
export function searchItems(items, query, extraFields = []) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return items;
  const tokens = q.split(/\s+/).filter(Boolean);
  const score = (item) => {
    const haystack = [
      item.name,
      item.description,
      item.publisher,
      item.category,
      item.subcategory,
      item.author,
      item.title,
      item.baseModel,
      item.triggerWords ? item.triggerWords.join(" ") : "",
      ...(item.tags || []),
      ...extraFields.map((f) => item[f]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!tokens.every((t) => haystack.includes(t))) return -1;
    const name = String(item.name || item.title || "").toLowerCase();
    let scoreValue = 1;
    if (name.startsWith(q)) scoreValue += 100;
    else if (name.includes(q)) scoreValue += 60;
    tokens.forEach((t) => {
      if (name.includes(t)) scoreValue += 30;
    });
    return scoreValue;
  };
  return items
    .map((item) => ({ item, score: score(item) }))
    .filter((e) => e.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((e) => e.item);
}

/**
 * Apply a predicate map of filters. Each predicate receives the item and
 * returns true when the item should be kept.
 */
export function filterItems(items, filters = {}) {
  return items.filter((item) =>
    Object.entries(filters).every(([key, predicate]) =>
      Array.isArray(predicate) ? predicate.includes(item[key]) : predicate(item)
    )
  );
}

/** Filter items by selected category/categories. */
export function byCategory(items, categories) {
  if (!categories?.length) return items;
  const set = new Set(categories);
  return items.filter((i) => set.has(i.category));
}

/** Filter items that include at least one of the selected tags. */
export function byTags(items, tags) {
  if (!tags?.length) return items;
  const set = new Set(tags);
  return items.filter((i) => (i.tags || []).some((t) => set.has(t)));
}

/** Filter by base model (LoRAs, workflows). */
export function byBaseModel(items, baseModels) {
  if (!baseModels?.length) return items;
  const set = new Set(baseModels);
  return items.filter((i) => i.baseModel && set.has(i.baseModel));
}

/** Filter by difficulty (workflows, tutorials). */
export function byDifficulty(items, levels) {
  if (!levels?.length) return items;
  const set = new Set(levels);
  return items.filter((i) => i.difficulty && set.has(i.difficulty));
}

/**
 * Sort a list by a named sort key. Supports optional field customisation.
 */
export function sortItems(items, sortKey = "popular", config = {}) {
  const map = {
    popular: (i) => parseCount(i.downloads ?? i.usedBy ?? i.stars ?? i.samples) || i.rating || 0,
    rating: (i) => i.rating || 0,
    newest: (i) => i.released || i.published || i.version || "",
    downloads: (i) => parseCount(i.downloads ?? i.stars ?? i.samples) || 0,
    used: (i) => parseCount(i.usedBy || i.downloads || 0) || 0,
    samples: (i) => parseCount(i.samples || 0) || 0,
    stars: (i) => parseCount(i.stars || 0) || 0,
    name: (i) => String(i.name || i.title || "").toLowerCase(),
  };
  const keyFn = map[sortKey] || map.popular;
  const order = sortKey === "name" ? 1 : -1;
  return sortBy(items, keyFn, order);
}

/** List distinct categories from a collection. */
export function getCategories(items) {
  return [...new Set(items.map((i) => i.category).filter(Boolean))].sort();
}

/** List distinct tags, sorted by frequency (desc), capped by `limit`. */
export function getTags(items, limit = 24) {
  const counts = new Map();
  for (const item of items) {
    for (const tag of item.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

/** Collect tag counts for display next to tag filters. */
export function getTagCounts(items) {
  const counts = new Map();
  for (const item of items) {
    for (const tag of item.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return counts;
}

/** Category counts for filter counts display. */
export function getCategoryCounts(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.category, (counts.get(item.category) || 0) + 1);
  }
  return counts;
}

/** Resolve related items (by id) from the same collection. */
export async function getRelated(type, ids = [], limit = 4) {
  if (!ids?.length) return [];
  const index = await fetchCollection(type);
  const byId = new Map(index.items.map((i) => [i.id, i]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .slice(0, limit);
}

/** Resolve items across multiple collections for search results. */
export async function searchAll(query, options = {}) {
  const { onProgress } = options;
  const results = [];
  for (const config of CONFIG.collections) {
    const { items } = await fetchCollection(config.type).catch(() => ({ items: [] }));
    const hits = searchItems(items, query);
    if (hits.length) {
      results.push({ type: config.type, config, hits });
    }
    if (typeof onProgress === "function") onProgress(config.type, hits.length);
  }
  return results.sort((a, b) => b.hits.length - a.hits.length);
}

/** All records from every collection (used by global search facets). */
export async function fetchAll() {
  const groups = await Promise.all(
    CONFIG.collections.map((config) =>
      fetchCollection(config.type)
        .then((payload) => ({ type: config.type, config, items: payload.items }))
        .catch(() => ({ type: config.type, config, items: [] }))
    )
  );
  return groups.filter((g) => g.items.length);
}

/** Total item count per collection (for home stats). */
export async function fetchCounts() {
  const groups = await fetchAll();
  const counts = {};
  let total = 0;
  for (const group of groups) {
    counts[group.type] = group.items.length;
    total += group.items.length;
  }
  counts.total = total;
  return counts;
}

/** Featured items across a type (flag or by rating). */
export function featured(items, limit = 6) {
  const flagged = items.filter((i) => i.featured);
  const pool = flagged.length ? flagged : [...items].sort((a, b) => b.rating - a.rating);
  return pool.slice(0, limit);
}
