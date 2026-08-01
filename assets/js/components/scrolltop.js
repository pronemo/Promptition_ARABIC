/**
 * Promptition — Scroll-to-Top
 * components/scrolltop.js
 *
 * Shows a floating button once the user scrolls down, scrolling back to the
 * top with reduced-motion awareness.
 */

import { qs, on } from "../utils/dom.js";
import { icon } from "../utils/dom.js";

export function initScrollTop() {
  const btn = qs("[data-scroll-top]");
  if (!btn) return;

  const update = () => {
    const visible = window.scrollY > 480;
    btn.classList.toggle("is-visible", visible);
    btn.setAttribute("aria-hidden", String(!visible));
    btn.tabIndex = visible ? 0 : -1;
  };

  window.addEventListener(
    "scroll",
    (() => {
      let ticking = false;
      return () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          update();
          ticking = false;
        });
      };
    })(),
    { passive: true }
  );

  on(document, "click", "[data-scroll-top]", () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  });

  update();
}
