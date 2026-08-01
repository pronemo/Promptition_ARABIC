/**
 * Promptition — Favorites
 * components/favorites.js
 *
 * Thin facade over the Favorites storage store, plus helpers for rendering
 * favorite UI on detail pages (toggle + remove).
 */

import { Favorites } from "../utils/storage.js";
import { toast } from "./toast.js";
import { icon } from "../utils/dom.js";
import { t } from "../core/i18n.js";

export { Favorites };

/** Create a favourite toggle button element. */
export function favoriteButton(type, id, { label = "Favorite" } = {}) {
  const isFav = Favorites.has(type, id);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `btn btn-icon js-fav-detail${isFav ? " is-active" : ""}`;
  btn.dataset.type = type;
  btn.dataset.id = id;
  btn.setAttribute("aria-pressed", String(isFav));
  btn.setAttribute("aria-label", isFav ? t("Remove from favorites") : t("Add to favorites"));
  btn.innerHTML = icon(isFav ? "i-heart-filled" : "i-heart");
  btn.title = t(label);
  btn.addEventListener("click", () => {
    const nowFav = Favorites.toggle(type, id);
    btn.classList.toggle("is-active", nowFav);
    btn.setAttribute("aria-pressed", String(nowFav));
    btn.setAttribute("aria-label", nowFav ? t("Remove from favorites") : t("Add to favorites"));
    btn.innerHTML = icon(nowFav ? "i-heart-filled" : "i-heart");
    toast(nowFav ? t("Added to favorites") : t("Removed from favorites"), "info");
  });
  return btn;
}
