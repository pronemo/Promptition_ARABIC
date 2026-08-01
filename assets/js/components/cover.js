/**
 * Promptition — Procedural Cover Art
 * components/cover.js
 *
 * Generates deterministic, dependency-free SVG cover art as a data URI.
 * Every item references a palette index in its data; the same item always
 * renders the same artwork, so no image assets need shipping.
 */

import { initials } from "../utils/helpers.js";

const PALETTES = [
  ["#6a3ef0", "#22d3ee"], // violet → cyan
  ["#ec4899", "#f97316"], // pink → orange
  ["#10b981", "#0ea5e9"], // emerald → sky
  ["#8b5cf6", "#ec4899"], // violet → pink
  ["#f59e0b", "#ef4444"], // amber → red
  ["#06b6d4", "#3b82f6"], // cyan → blue
  ["#84cc16", "#14b8a6"], // lime → teal
  ["#6366f1", "#8b5cf6"], // indigo → violet
  ["#e11d48", "#334155"], // rose → slate
  ["#0ea5e9", "#0284c7"], // sky → blue
  ["#a855f7", "#6366f1"], // purple → indigo
  ["#14b8a6", "#065f46"], // teal → emerald
];

const MAX_PALETTE = PALETTES.length;

/** Resolve a palette seed (1-based) into a colour pair. */
export function palette(seed = 1) {
  const index = ((Number(seed) || 1) - 1) % MAX_PALETTE;
  return PALETTES[index];
}

/**
 * Build an SVG cover for an item.
 * @param {object} item  Data record (needs `name`/`title` and optional `cover`).
 * @returns {string} Data URI usable in an <img src>.
 */
export function coverUrl(item) {
  const [c1, c2] = palette(item.cover);
  const text = initials(item.name || item.title || item.id || "PR");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="r" cx="0.8" cy="0.15" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="640" height="400" fill="url(#g)"/>
  <rect width="640" height="400" fill="url(#r)"/>
  <circle cx="560" cy="60" r="150" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="2"/>
  <circle cx="560" cy="60" r="110" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="2"/>
  <circle cx="30" cy="390" r="130" fill="#0d1025" fill-opacity="0.18"/>
  <text x="36" y="330" font-family="Segoe UI, Arial, sans-serif" font-size="120" font-weight="700" fill="#ffffff" fill-opacity="0.96" letter-spacing="6">${text}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Escape quotes/ampersands in a title for use inside SVG text. */
function safeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render a screenshot-style gradient (used in galleries) with a caption.
 * @param {number} seed  Palette index.
 * @returns {string} Data URI.
 */
export function shotUrl(seed = 1, caption = "") {
  const [c1, c2] = palette(seed);
  const label = safeText(caption).slice(0, 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="480" fill="url(#g)"/>
  <circle cx="320" cy="200" r="150" fill="#ffffff" fill-opacity="0.12"/>
  <circle cx="320" cy="200" r="90" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="3"/>
  <path d="M0 400 Q160 330 320 400 T640 400 V480 H0 Z" fill="#0d1025" fill-opacity="0.35"/>
  <text x="320" y="452" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="600" fill="#ffffff" text-anchor="middle">${label}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
