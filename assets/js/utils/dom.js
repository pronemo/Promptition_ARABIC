/**
 * Promptition — DOM Utilities
 * utils/dom.js
 *
 * Small, dependency-free helpers for element selection, creation,
 * templating, event delegation and SVG icon rendering.
 */

const ICONS_PATH = "assets/icons/icons.svg";

/** Query a single element. */
export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

/** Query many elements as an array. */
export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/** Create an element with attributes, class and children. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "dataset") {
      Object.assign(node.dataset, value);
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

/** Replace the contents of a container with a template string. */
export function render(container, template) {
  if (container == null) return;
  container.innerHTML = template;
}

/** Set a container to an empty state. */
export function clear(container) {
  if (container == null) return;
  container.innerHTML = "";
}

/** Append a template string to a container. */
export function append(container, template) {
  if (container == null) return;
  container.insertAdjacentHTML("beforeend", template);
}

/**
 * Render an SVG icon from the sprite.
 * @param {string} name Symbol id (e.g. "i-search").
 * @param {string} [className] Extra classes.
 * @returns {string} HTML string.
 */
export function icon(name, className = "icon") {
  const escaped = String(name).replace(/[^a-z0-9-]/gi, "");
  const classes = className ? ` icon ${className}` : " icon";
  return `<svg class="${classes.trim()}" aria-hidden="true" focusable="false"><use href="${ICONS_PATH}#${escaped}"></use></svg>`;
}

/**
 * Event delegation — listen for events bubbling from `selector`.
 */
export function on(scope, event, selector, handler) {
  scope.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && scope.contains(target)) handler(e, target);
  });
}

/** Run `fn` once per element for a node list (debounced rendering helper). */
export function each(list, fn) {
  Array.from(list).forEach(fn);
}

/** Escape HTML special characters. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Focus trap used by modals. */
export function focusTrap(container, event) {
  if (event.key !== "Tab") return;
  const focusables = qsa(
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    container
  ).filter((n) => n.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/** Move keyboard focus to a named element. */
export function focusById(id) {
  const node = document.getElementById(id);
  if (node) node.focus();
}
