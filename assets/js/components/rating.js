/**
 * Promptition — Rating
 * components/rating.js
 *
 * Renders a star rating from a numeric score.
 */

import { icon, escapeHtml } from "../utils/dom.js";
import { t } from "../core/i18n.js";

const MAX = 5;

/**
 * Build star markup. Renders a count of filled stars proportional to value.
 * @param {number} value  0–5
 * @param {number} [count]  Number of ratings for the label.
 * @param {boolean} [showValue]  Show the numeric score.
 * @returns {string} HTML.
 */
export function ratingStars(value, { count, showValue = true } = {}) {
  const score = Math.max(0, Math.min(MAX, Number(value) || 0));
  const full = Math.round(score);
  const empty = MAX - full;
  let stars = "";
  for (let i = 0; i < full; i++) stars += icon("i-star");
  for (let i = 0; i < empty; i++) stars += icon("i-star", "icon empty");

  const parts = [
    `<span class="rating" role="img" aria-label="${escapeHtml(t("Rated {score} out of 5", { score: score.toFixed(1) }))}">${stars}</span>`,
  ];
  if (showValue) {
    parts.push(`<span class="rating-value">${score.toFixed(1)}</span>`);
  }
  if (count != null) {
    parts.push(`<span class="rating-count">(${count.toLocaleString()})</span>`);
  }
  return parts.join("");
}
