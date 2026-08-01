/**
 * Promptition — Application Bootstrap
 * core/app.js
 *
 * Bootstraps global chrome shared by every page: theme handling, header
 * navigation, footer metadata, favorites badge, global search, scroll-to-top
 * and toast/modal registries. Page controllers import and call initApp().
 */

import { CONFIG } from "./config.js";
import { initI18n } from "./i18n.js";
import { initTheme } from "../components/theme.js";
import { initHeader } from "../components/header.js";
import { initFooter } from "../components/footer.js";
import { initScrollTop } from "../components/scrolltop.js";
import { initGlobalSearch } from "../components/searchbox.js";
import { Favorites } from "../components/favorites.js";
import { History } from "../components/history.js";
import { initCompareStrip } from "../components/compare.js";
import { getQuery } from "./router.js";

const APP_STATE = {
  booted: false,
  page: null,
  dataLoaded: false,
};

export const app = APP_STATE;

/**
 * Boot the shared application shell. Safe to call multiple times.
 * Returns a promise that resolves when the shell is ready.
 */
export async function initApp() {
  if (APP_STATE.booted) return;
  APP_STATE.booted = true;

  initI18n();
  initTheme();
  initHeader();
  initFooter();
  initScrollTop();
  initGlobalSearch();

  // Lazy-load the remaining global data when the browser is idle so the
  // first paint is never blocked by data fetching.
  if (CONFIG.api.preloadOnIdle && "requestIdleCallback" in window) {
    window.requestIdleCallback(
      () => {
        initCompareStrip().catch(() => null);
      },
      { timeout: 3000 }
    );
  } else {
    initCompareStrip().catch(() => null);
  }
}

/**
 * Resolve the current page name from the body data attribute.
 * Pages declare <body data-page="models">.
 */
export function getPageName() {
  const body = document.body;
  return body ? body.dataset.page || "unknown" : "unknown";
}

/** Record a page view into recent history. */
export function trackView(type, id) {
  History.add({ type, id, viewedAt: Date.now() });
}

/** Global favorites accessor used by the header badge. */
export { Favorites, History };

/** Current query state (filters, pagination). */
export function queryState() {
  return getQuery();
}
