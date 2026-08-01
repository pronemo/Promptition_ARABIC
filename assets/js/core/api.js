/**
 * Promptition — API Layer
 * core/api.js
 *
 * A small fetch abstraction with:
 *  - in-memory + session cache (avoids duplicate requests across pages)
 *  - automatic retry with backoff
 *  - request timeout
 *  - explicit reload (cache busting)
 *  - preload helper for warming the cache
 *
 * Every method resolves to plain JavaScript objects.
 */

import { CONFIG } from "./config.js";

const memoryCache = new Map();
const inflight = new Map();

function cacheKey(path) {
  return path;
}

/** Compute a string digest used as the session-storage cache key. */
function digest(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

function sessionKey(path) {
  return `promptition:api:${digest(path)}`;
}

function readSessionCache(path) {
  try {
    const raw = window.sessionStorage.getItem(sessionKey(path));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() > entry.expires) {
      window.sessionStorage.removeItem(sessionKey(path));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeSessionCache(path, data) {
  try {
    const entry = { data, expires: Date.now() + CONFIG.api.cacheTtl };
    window.sessionStorage.setItem(sessionKey(path), JSON.stringify(entry));
  } catch {
    /* storage full / unavailable — cache miss next time */
  }
}

function readMemory(path) {
  const entry = memoryCache.get(cacheKey(path));
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memoryCache.delete(cacheKey(path));
    return null;
  }
  return entry.data;
}

function writeMemory(path, data) {
  memoryCache.set(cacheKey(path), {
    data,
    expires: Date.now() + CONFIG.api.cacheTtl,
  });
}

async function fetchWithTimeout(path, timeout) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(path, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchWithRetry(path, retries, timeout) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(path, timeout);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, 250 * Math.pow(2, attempt))
        );
      }
    }
  }
  throw lastError;
}

/**
 * Fetch and parse a JSON file, using cache layers.
 *
 * @param {string} path  Path relative to the site root.
 * @param {object} [options]
 * @param {number} [options.ttl]        Override cache TTL in ms.
 * @param {boolean} [options.reload]    Bypass cache (cache-busting reload).
 * @param {boolean} [options.session]   Read/write session cache (default true).
 * @param {number} [options.retries]    Retry count override.
 * @param {number} [options.timeout]    Timeout override in ms.
 * @returns {Promise<object>}
 */
export function get(path, options = {}) {
  const {
    reload = false,
    session = true,
    retries = CONFIG.api.retries,
    timeout = CONFIG.api.timeout,
  } = options;

  if (!reload) {
    const memory = readMemory(path);
    if (memory !== null) return Promise.resolve(memory);
    if (session) {
      const stored = readSessionCache(path);
      if (stored !== null) return Promise.resolve(stored);
    }
  }

  if (inflight.has(path) && !reload) {
    return inflight.get(path);
  }

  const promise = fetchWithRetry(path, retries, timeout)
    .then((data) => {
      writeMemory(path, data);
      if (session) writeSessionCache(path, data);
      inflight.delete(path);
      return data;
    })
    .catch((err) => {
      inflight.delete(path);
      throw err;
    });

  inflight.set(path, promise);
  return promise;
}

/** Drop a single path from every cache layer. */
export function invalidate(path) {
  memoryCache.delete(cacheKey(path));
  try {
    window.sessionStorage.removeItem(sessionKey(path));
  } catch {
    /* ignore */
  }
}

/** Drop every cached entry. */
export function clear() {
  memoryCache.clear();
  try {
    const prefix = "promptition:api:";
    const keys = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** Warm the cache for a list of paths without awaiting them. */
export function preload(paths) {
  const pending = (Array.isArray(paths) ? paths : [paths])
    .filter((path) => readMemory(path) === null)
    .map((path) => get(path).catch(() => null));
  return Promise.allSettled(pending);
}

/** Convenience getter scoped to the data directory. */
export function getData(subPath, options) {
  return get(`${CONFIG.api.baseDir}/${subPath}`, options);
}

/** Convenience getter for a collection index. */
export function getIndex(type, options) {
  return get(`${CONFIG.api.baseDir}/${type}/index.json`, options);
}

/** Convenience getter for a collection detail item. */
export function getItem(type, id, options) {
  return get(`${CONFIG.api.baseDir}/${type}/${id}.json`, options);
}
