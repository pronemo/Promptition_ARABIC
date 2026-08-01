/**
 * Promptition — Share
 * components/share.js
 *
 * Opens a share dialog with native share, copy-link and social links.
 */

import { getCollection } from "../core/config.js";
import { detailUrl } from "../core/router.js";
import { t } from "../core/i18n.js";
import { modal } from "./modal.js";
import { toast } from "./toast.js";
import { copyValue } from "./copy.js";
import { icon, escapeHtml } from "../utils/dom.js";

/**
 * Open the share dialog for a resource.
 * @param {string} type  Collection type.
 * @param {object} item  Item record.
 */
export function openShare(type, item) {
  const config = getCollection(type);
  if (!config) return;
  const url = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, "/")}${detailUrl(config, item.id)}`;
  const title = `${item.name} — ${config.label}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const content = `
    <p class="field-hint" style="margin-bottom:0.5rem">${escapeHtml(t("Share this link"))}</p>
    <div class="share-row">
      <input class="input" type="text" value="${escapeHtml(url)}" readonly aria-label="${escapeHtml(t("Share URL"))}">
      <button type="button" class="btn btn-soft btn-sm" data-share-copy>${icon("i-copy")} ${escapeHtml(t("Copy"))}</button>
    </div>
    <div class="share-networks">
      <button type="button" class="btn btn-ghost btn-sm" data-share-native>${icon("i-share")} ${escapeHtml(t("System"))}</button>
      <button type="button" class="btn btn-ghost btn-sm" data-share-twitter>${icon("i-trending")} X</button>
      <button type="button" class="btn btn-ghost btn-sm" data-share-facebook>${icon("i-bookmark")} Facebook</button>
      <button type="button" class="btn btn-ghost btn-sm" data-share-linkedin>${icon("i-user")} LinkedIn</button>
    </div>
  `;

  const dialog = modal({ title: t("Share") + " " + config.singular, content });

  dialog.element.addEventListener("click", async (e) => {
    const copyBtn = e.target.closest("[data-share-copy]");
    if (copyBtn) {
      await copyValue(url);
      return;
    }
    const native = e.target.closest("[data-share-native]");
    if (native) {
      if (navigator.share) {
        try {
          await navigator.share({ title, url });
        } catch {
          /* user cancelled */
        }
      } else {
        toast(t("Sharing is not supported in this browser"), "info");
      }
      return;
    }
    const targets = {
      "[data-share-twitter]": `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      "[data-share-facebook]": `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      "[data-share-linkedin]": `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };
    for (const [selector, href] of Object.entries(targets)) {
      if (e.target.closest(selector)) {
        window.open(href, "_blank", "noopener,width=600,height=500");
        return;
      }
    }
  });

  dialog.open();
}

/** Copy-link action used by toolbar buttons. */
export async function copyLink(type, item) {
  const config = getCollection(type);
  const url = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, "/")}${detailUrl(config, item.id)}`;
  await copyValue(url);
}
