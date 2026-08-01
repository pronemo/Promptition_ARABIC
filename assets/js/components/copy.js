/**
 * Promptition — Copy Utilities
 * components/copy.js
 *
 * Shared copy-to-clipboard behaviours used by prompt boxes, code blocks,
 * share links and favourite links.
 */

import { copyText } from "../utils/helpers.js";
import { toast } from "./toast.js";
import { icon } from "../utils/dom.js";
import { t } from "../core/i18n.js";

/**
 * Wire any element marked [data-copy] to copy its `data-copy-value`,
 * showing a checkmark while it copies.
 */
export function initCopyButtons(scope = document) {
  scope.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy], [data-copy-value]");
    if (!btn) return;
    e.preventDefault();
    const value = btn.getAttribute("data-copy-value") || btn.getAttribute("data-copy") || "";
    const ok = await copyText(value);
    toast(ok ? t("Copied to clipboard") : t("Could not copy text"), ok ? "success" : "error");

    if (ok) {
      const original = btn.innerHTML;
      btn.innerHTML = icon("i-check");
      btn.classList.add("copied");
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove("copied");
      }, 1400);
    }
  });
}

/** Copy an arbitrary string programmatically. */
export async function copyValue(value) {
  const ok = await copyText(value);
  toast(ok ? t("Copied to clipboard") : t("Could not copy text"), ok ? "success" : "error");
  return ok;
}
