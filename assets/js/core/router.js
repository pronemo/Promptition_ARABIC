/**
 * Promptition — Router & URL Helpers
 * core/router.js
 *
 * This is a static multi-page site, so there is no SPA routing. This module
 * centralises query-string state (filters, pagination, compare items) so that
 * any page can sync its UI state to the URL and back — deep-linkable,
 * shareable and back/forward friendly.
 */

const paramCache = new Map();

/** Parse the current location search string into an object. */
export function getQuery(source = window.location.search) {
  if (paramCache.has(source)) return paramCache.get(source);
  const params = new URLSearchParams(source);
  const out = {};
  for (const [key, value] of params) {
    if (Array.isArray(out[key])) {
      out[key].push(value);
    } else if (key in out) {
      out[key] = [out[key], value];
    } else {
      out[key] = value;
    }
  }
  paramCache.set(source, out);
  return out;
}

/** Serialize an object into a query string (without leading '?'). */
export function buildQuery(params) {
  const url = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null && v !== "") url.append(key, v);
      });
    } else {
      url.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Update the URL query string without a full reload.
 * Returns true when the URL actually changed.
 */
export function setQuery(params, { replace = false, title } = {}) {
  const current = window.location.pathname;
  const qs = buildQuery(params);
  const url = qs ? `${current}?${qs}` : current;
  if (window.location.pathname + window.location.search === url) return false;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, title || "", url);
  paramCache.clear();
  window.dispatchEvent(new CustomEvent("promptition:route"));
  return true;
}

/** Merge additional params into the current query and update the URL. */
export function mergeQuery(partial, options) {
  return setQuery({ ...getQuery(), ...partial }, options);
}

/** Remove one or more keys from the query and update the URL. */
export function removeQuery(keys, options) {
  const next = { ...getQuery() };
  (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete next[k]);
  return setQuery(next, options);
}

/** Subscribe to back/forward and manual route changes. */
export function onRouteChange(handler) {
  window.addEventListener("popstate", handler);
  window.addEventListener("promptition:route", handler);
  return () => {
    window.removeEventListener("popstate", handler);
    window.removeEventListener("promptition:route", handler);
  };
}

/** Build the canonical URL for a detail page. */
export function detailUrl(typeConfig, id) {
  return `${typeConfig.detailPath}?id=${encodeURIComponent(id)}`;
}

/** Build the canonical URL for a collection page with optional state. */
export function collectionUrl(typeConfig, params = {}) {
  const qs = buildQuery(params);
  return qs ? `${typeConfig.path}?${qs}` : typeConfig.path;
}

/** Read an `id` query parameter, decoded and sanitised. */
export function getDetailId() {
  const id = getQuery().id;
  return typeof id === "string" ? decodeURIComponent(id) : null;
}

/** Safe helper to read a single query value. */
export function getParam(key, fallback = "") {
  const value = getQuery()[key];
  return Array.isArray(value) ? value[0] : value ?? fallback;
}

/** Read a multi-value query parameter as an array. */
export function getParamArray(key) {
  const value = getQuery()[key];
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** Cache-free force refresh of the current query. */
export function refreshQuery() {
  paramCache.clear();
}
