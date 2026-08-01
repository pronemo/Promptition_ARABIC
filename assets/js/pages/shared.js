/**
 * Promptition — Shared Page Bootstrappers
 * pages/shared.js
 *
 * Tiny factories that keep page controllers (models.js, tools.js, …)
 * nearly identical while all real logic lives in components.
 */

import { initApp, trackView } from "../core/app.js";
import { getDetailId } from "../core/router.js";
import { getCollection } from "../core/config.js";
import { fetchItem } from "../utils/data.js";
import { CollectionController } from "../components/collection.js";
import { initCopyButtons } from "../components/copy.js";
import {
  renderDetailHead,
  detailLoading,
  detailNotFound,
  applySeo,
} from "../components/detail.js";

/** Boot a collection page for the given type. */
export async function bootCollectionPage(type) {
  await initApp();
  const controller = new CollectionController(type);
  await controller.boot();
  initCopyButtons();
  return controller;
}

/**
 * Boot a detail page for the given type.
 * @param {string} type  Collection type.
 * @param {(item) => Promise<void>|void} renderBody  Type-specific section renderer.
 */
export async function bootDetailPage(type, renderBody) {
  await initApp();
  initCopyButtons();

  const id = getDetailId();
  const config = getCollection(type);

  if (!id || !config) {
    detailNotFound();
    return;
  }

  // Show skeleton while fetching.
  detailLoading("[data-detail-content]");

  try {
    const item = await fetchItem(type, id);
    if (!item) throw new Error("missing");

    trackView(type, id);
    renderDetailHead(item, type, "[data-detail-head]");
    applySeo({
      title: item.name || item.title,
      description: item.description || item.summary,
      type,
      item,
    });
    await renderBody(item);
  } catch {
    detailNotFound();
  }
}
