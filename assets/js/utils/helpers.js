/**
 * Promptition — General Helpers
 * utils/helpers.js
 *
 * Pure, reusable formatting and functional utilities. No DOM access.
 */

/** Debounce a function call. */
export function debounce(fn, wait = 200) {
  let timer;
  return function debounced(...args) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Throttle a function call (leading edge). */
export function throttle(fn, wait = 120) {
  let last = 0;
  return function throttled(...args) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/** Clamp a number into a range. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Format a count into a compact human string: 1250000 -> "1.25M". */
export function formatCount(value) {
  const n = typeof value === "number" ? value : parseCount(value);
  if (Number.isNaN(n)) return value ?? "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}

/**
 * Parse strings like "12.4M", "8.1M", "26.7M", "2.8M" into numbers.
 * Falls back to the raw value when unparseable.
 */
export function parseCount(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const match = value.trim().match(/^([\d.]+)\s*([kmb]?)$/i);
  if (!match) return Number.NaN;
  const num = parseFloat(match[1]);
  const suffix = match[2].toLowerCase();
  if (suffix === "k") return num * 1_000;
  if (suffix === "m") return num * 1_000_000;
  if (suffix === "b") return num * 1_000_000_000;
  return num;
}

/** Format an ISO date or "YYYY-MM" string into a friendly label. */
export function formatDate(value, style = "short") {
  if (!value) return "—";
  const [year, month, day] = String(value).split("-");
  if (!year || !month) return String(value);
  const date = day ? new Date(year, month - 1, day) : new Date(year, month - 1, 1);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: style === "short" ? "short" : "long",
    day: day ? "numeric" : undefined,
  });
}

/** Truncate a string with an ellipsis. */
export function truncate(value, max = 120) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Lowercase slug from any string. */
export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Stable sort helper. `order` is 1 or -1. */
export function sortBy(items, keyFn, order = 1) {
  return [...items].sort((a, b) => {
    const av = keyFn(a);
    const bv = keyFn(b);
    if (av < bv) return -1 * order;
    if (av > bv) return 1 * order;
    return 0;
  });
}

/** Group an array by a key function. */
export function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

/** Return unique values from an array (strings/numbers). */
export function unique(array) {
  return [...new Set(array)];
}

/** Pluck a unique sorted list of values for a field across items. */
export function pluckUnique(items, field) {
  return unique(items.map((i) => i?.[field]).filter(Boolean)).sort();
}

/** Get initials for cover art: "FLUX.1 dev" -> "FD". */
export function initials(name) {
  const words = String(name ?? "")
    .split(/[\s.]+/)
    .filter(Boolean);
  const first = words[0]?.[0] || "";
  const second = words[1]?.[0] || words[0]?.[1] || "";
  return (first + second).toUpperCase();
}

/** Generate a short unique id. */
export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Copy text to the clipboard with a legacy fallback. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Format bytes into a readable size. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

/** Build a readable relative timestamp. */
export function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
