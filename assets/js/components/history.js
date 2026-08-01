/**
 * Promptition — Recent History
 * components/history.js
 *
 * Facade over the History storage store, exposing helpers used by detail
 * pages to record views and by the history page to list them.
 */

import { History } from "../utils/storage.js";
import { getCollection } from "../core/config.js";
import { detailUrl } from "../core/router.js";
import { icon, escapeHtml } from "../utils/dom.js";
import { timeAgo } from "../utils/helpers.js";
import { coverUrl } from "./cover.js";
import { t } from "../core/i18n.js";

export { History };

/** Record a view for the current item. */
export function recordView(type, id) {
  History.add({ type, id, viewedAt: Date.now() });
}

/** Render one history row (used by the history page). */
export function historyRow(entry, item) {
  const config = getCollection(entry.type);
  const name = escapeHtml(item.name || item.title || entry.id);
  const href = detailUrl(config, entry.id);
  const kind = escapeHtml(config?.singular || entry.type);

  return `
    <article class="timeline-item" data-type="${escapeHtml(entry.type)}" data-id="${escapeHtml(entry.id)}">
      <a class="timeline-thumb" href="${href}" tabindex="-1" aria-hidden="true">
        <img src="${coverUrl(item)}" alt="" loading="lazy" decoding="async">
      </a>
      <div class="timeline-meta">
        <a href="${href}"><strong>${name}</strong></a>
        <small>${icon("i-tag")}${kind} · ${escapeHtml(timeAgo(entry.viewedAt))}</small>
      </div>
      <button type="button" class="btn btn-ghost btn-sm js-history-remove" data-type="${escapeHtml(entry.type)}" data-id="${escapeHtml(entry.id)}">
        ${icon("i-trash")} ${escapeHtml(t("Remove"))}
      </button>
    </article>
  `;
}
