/**
 * Promptition — Tabs
 * components/tabs.js
 *
 * Accessible tab navigation: ARIA roles, keyboard arrows and focus handling.
 */

import { qsa } from "../utils/dom.js";

/**
 * Initialise tabs inside a scope.
 * @param {HTMLElement} scope  Container with [data-tabs] markup.
 */
export function initTabs(scope = document) {
  if (!scope) scope = document;
  const list = scope.querySelector("[role='tablist']");
  if (!list) return;

  const tabs = qsa("[role='tab']", list);
  const panels = qsa("[role='tabpanel']", scope);

  const select = (tab) => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
      t.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.id !== tab.getAttribute("aria-controls");
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      select(tab);
      tab.focus();
    });
    tab.addEventListener("keydown", (e) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      let next = index;
      if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = tabs.length - 1;
      select(tabs[next]);
      tabs[next].focus();
    });
  });

  // Select the first tab that is marked active, otherwise the first tab.
  const initial = tabs.find((t) => t.classList.contains("is-active")) || tabs[0];
  if (initial) select(initial);
}
