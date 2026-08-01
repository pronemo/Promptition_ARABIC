/**
 * Promptition — Footer Controller
 * components/footer.js
 *
 * Fills in the dynamic bits of the footer: current year, data updated date
 * and collection counts shown as subtle meta text.
 */

import { CONFIG } from "../core/config.js";
import { qs } from "../utils/dom.js";
import { fetchCounts } from "../utils/data.js";

/** Inject the current year into any [data-year] element. */
export function initFooter() {
  const year = qs("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  const updated = qs("[data-updated]");
  const counts = qs("[data-total-items]");
  if (!updated && !counts) return;

  fetchCounts()
    .then((c) => {
      if (updated) updated.textContent = CONFIG.site.name;
      if (counts) counts.textContent = String(c.total || 0);
    })
    .catch(() => {
      /* silent — footer meta is decorative */
    });
}
