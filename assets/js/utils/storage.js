/**
 * Promptition — Storage Layer
 * utils/storage.js
 *
 * Namespaced, JSON-safe wrappers around localStorage plus opinionated
 * persistence helpers for the favorites, history and compare features.
 */

import { CONFIG } from "../core/config.js";

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const storage = {
  get: read,
  set: write,
  remove,
};

/** Emit a namespaced change event (used by the header badge, etc.). */
function emit(eventName, payload) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
}

const EVENTS = {
  favorites: "promptition:favorites-changed",
  history: "promptition:history-changed",
  compare: "promptition:compare-changed",
};

function keyOf(type, id) {
  return `${type}:${id}`;
}

/**
 * Favorites — a set of "type:id" keys.
 */
export const Favorites = {
  list() {
    return read(CONFIG.storage.favorites, []);
  },
  has(type, id) {
    return this.list().includes(keyOf(type, id));
  },
  add(type, id) {
    if (this.has(type, id)) return false;
    const next = [keyOf(type, id), ...this.list()];
    write(CONFIG.storage.favorites, next);
    emit(EVENTS.favorites);
    return true;
  },
  remove(type, id) {
    if (!this.has(type, id)) return false;
    const next = this.list().filter((k) => k !== keyOf(type, id));
    write(CONFIG.storage.favorites, next);
    emit(EVENTS.favorites);
    return true;
  },
  toggle(type, id) {
    return this.has(type, id)
      ? (this.remove(type, id), false)
      : (this.add(type, id), true);
  },
  clear() {
    remove(CONFIG.storage.favorites);
    emit(EVENTS.favorites);
  },
  get count() {
    return this.list().length;
  },
  /** Resolve stored keys into rich records using a lookup function. */
  async resolve(lookup) {
    const keys = this.list();
    const records = [];
    for (const key of keys) {
      const [type, id] = key.split(":");
      const record = await lookup(type, id).catch(() => null);
      if (record) records.push({ type, id, ...record });
    }
    return records;
  },
  onChange(handler) {
    window.addEventListener(EVENTS.favorites, () => handler(this));
  },
};

/**
 * History — most recent items first, capped at CONFIG.limits.history.
 */
export const History = {
  list() {
    return read(CONFIG.storage.history, []);
  },
  add(entry) {
    const existing = this.list();
    const next = [
      entry,
      ...existing.filter((e) => !(e.type === entry.type && e.id === entry.id)),
    ].slice(0, CONFIG.limits.history);
    write(CONFIG.storage.history, next);
    emit(EVENTS.history);
    return next;
  },
  remove(type, id) {
    const next = this.list().filter((e) => !(e.type === type && e.id === id));
    write(CONFIG.storage.history, next);
    emit(EVENTS.history);
    return next;
  },
  clear() {
    remove(CONFIG.storage.history);
    emit(EVENTS.history);
  },
  async resolve(lookup) {
    const records = [];
    for (const entry of this.list()) {
      const record = await lookup(entry.type, entry.id).catch(() => null);
      if (record) records.push({ ...entry, ...record });
    }
    return records;
  },
  onChange(handler) {
    window.addEventListener(EVENTS.history, () => handler(this));
  },
};

/**
 * Compare — an ordered list of "type:id" keys, capped at CONFIG.limits.compare.
 */
export const Compare = {
  list() {
    return read(CONFIG.storage.compare, []);
  },
  has(type, id) {
    return this.list().includes(keyOf(type, id));
  },
  add(type, id) {
    if (this.has(type, id)) return false;
    if (this.list().length >= CONFIG.limits.compare) return "full";
    const next = [...this.list(), keyOf(type, id)];
    write(CONFIG.storage.compare, next);
    emit(EVENTS.compare);
    return true;
  },
  remove(type, id) {
    const next = this.list().filter((k) => k !== keyOf(type, id));
    write(CONFIG.storage.compare, next);
    emit(EVENTS.compare);
    return next;
  },
  clear() {
    remove(CONFIG.storage.compare);
    emit(EVENTS.compare);
  },
  get count() {
    return this.list().length;
  },
  get isFull() {
    return this.list().length >= CONFIG.limits.compare;
  },
  async resolve(lookup) {
    const records = [];
    for (const key of this.list()) {
      const [type, id] = key.split(":");
      const record = await lookup(type, id).catch(() => null);
      if (record) records.push({ type, id, ...record });
    }
    return records;
  },
  onChange(handler) {
    window.addEventListener(EVENTS.compare, () => handler(this));
  },
};
