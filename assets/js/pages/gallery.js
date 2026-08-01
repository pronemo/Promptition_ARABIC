/**
 * Promptition — My Library (Personal Gallery)
 * pages/gallery.js
 *
 * Renders images saved from the analyzer into a browsable grid, with a
 * detail view exposing each image's colors, matched styles and embedded
 * generation parameters. Storage is IndexedDB via utils/gallery.js.
 */

import { initApp } from "../core/app.js";
import { icon, escapeHtml, render, qs, on } from "../utils/dom.js";
import { detailUrl } from "../core/router.js";
import { formatBytes, formatDate } from "../utils/helpers.js";
import { listImages, deleteImage, clearLibrary } from "../utils/gallery.js";
import { initCopyButtons } from "../components/copy.js";
import { toast } from "../components/toast.js";
import { t } from "../core/i18n.js";

async function bootGallery() {
  await initApp();
  initCopyButtons();

  const grid = qs("[data-gallery-grid]");
  const empty = qs("[data-gallery-empty]");
  const count = qs("[data-gallery-count]");
  const clearBtn = qs("[data-gallery-clear]");
  const modal = qs("[data-gallery-modal]");
  const detail = qs("[data-gallery-detail]");

  let items = [];

  async function refresh() {
    items = await listImages();
    count.textContent = `${items.length} ${items.length === 1 ? t("image") : t("images")}`;
    clearBtn.hidden = !items.length;

    if (!items.length) {
      render(grid, "");
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    render(
      grid,
      items.map((item) => galleryCard(item)).join("")
    );
  }

  grid.addEventListener("click", (e) => {
    const card = e.target.closest("[data-open-image]");
    if (card) openDetail(items.find((i) => i.id === card.dataset.openImage));
  });

  const closeModal = () => {
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
  };

  on(document, "click", "[data-gallery-close]", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  on(document, "click", "[data-gallery-delete]", async (e, btn) => {
    const id = btn.dataset.galleryDelete;
    await deleteImage(id);
    toast(t("Removed from your library"));
    refresh();
  });

  on(document, "click", "[data-gallery-download]", (e, btn) => {
    const item = items.find((i) => i.id === btn.dataset.galleryDownload);
    if (!item) return;
    const a = document.createElement("a");
    a.href = item.dataUrl;
    a.download = item.name || `library-${item.id}.png`;
    document.body.append(a);
    a.click();
    a.remove();
  });

  clearBtn.addEventListener("click", async () => {
    if (!confirm(t("Remove every image from your library? This cannot be undone."))) return;
    await clearLibrary();
    toast(t("Library cleared"));
    refresh();
  });

  function openDetail(item) {
    render(detail, galleryDetail(item));
    const modalBox = modal.querySelector(".modal");
    if (modalBox) modalBox.classList.add("gallery-modal-wide");
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    const closeBtn = modal.querySelector("[data-gallery-close]");
    if (closeBtn) closeBtn.focus();
  }

  await refresh();
}

function galleryCard(item) {
  const gen = item.meta?.gen || {};
  const badge =
    gen.model ||
    gen.prompt?.slice(0, 60) ||
    (item.meta?.matches?.[0]?.item?.name ? `Style: ${item.meta.matches[0].item.name}` : null) ||
    t("No generation data");
  return `
    <article class="gallery-card" data-open-image="${escapeHtml(item.id)}">
      <div class="gallery-thumb"><img src="${item.dataUrl}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async"></div>
      <div class="gallery-card-body">
        <div class="gallery-card-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
        <div class="gallery-card-badge" title="${escapeHtml(badge)}">${escapeHtml(truncate(badge, 44))}</div>
        <div class="gallery-card-meta">
          <span>${icon("i-calendar")}${formatDate(new Date(item.addedAt).toISOString().slice(0, 10))}</span>
          <span>${icon("i-image")}${escapeHtml(formatBytes(item.size))}</span>
        </div>
      </div>
    </article>`;
}

function galleryDetail(item) {
  const gen = item.meta?.gen || {};
  const colors = item.meta?.colors || [];
  const matches = item.meta?.matches || [];

  const genRows = [
    spec(t("Source"), gen.source === "comfyui" ? t("ComfyUI workflow") : gen.source === "a1111" ? "AUTOMATIC1111" : gen.source === "sdxl-json" ? t("SDXL JSON") : null),
    spec(t("Model"), gen.model),
    spec(t("Sampler"), gen.sampler ? (gen.scheduler ? `${gen.sampler} / ${gen.scheduler}` : gen.sampler) : null),
    spec(t("Steps"), gen.steps != null ? String(gen.steps) : null),
    spec(t("CFG"), gen.cfg != null ? String(gen.cfg) : null),
    spec(t("Seed"), gen.seed != null ? String(gen.seed) : null),
    spec(t("Denoise"), gen.denoise != null ? String(gen.denoise) : null),
    spec(t("Size"), gen.size || (gen.width && gen.height ? `${gen.width}×${gen.height}` : null)),
    spec(t("LoRAs"), gen.loras?.length ? gen.loras.map((l) => `${l.name}${l.weight != null ? ` @${l.weight}` : ""}`).join(", ") : null),
  ].join("");

  const colorChips = colors.length
    ? `<div class="color-strip">${colors
        .map(
          (c) => `
        <div class="color-chip">
          <span class="color-swatch" style="background:${c.hex}" aria-hidden="true"></span>
          <span class="color-meta"><strong>${escapeHtml(c.name)}</strong><small>${c.hex} · ${c.pct.toFixed(0)}%</small></span>
        </div>`
        )
        .join("")}</div>`
    : `<p class="field-hint">${escapeHtml(t("No color data saved for this image."))}</p>`;

  const matchLinks = matches.length
    ? `<div class="style-matches">${matches
        .map(
          (m, i) => `
        <a class="style-match" href="${detailUrl({ detailPath: "style.html" }, m.item.id)}">
          <span class="style-match-rank">${i + 1}</span>
          <span class="style-match-body">
            <strong>${escapeHtml(m.item.name)}</strong>
            <small>${m.hits.slice(0, 3).join(" · ") || escapeHtml(m.item.category || "Style")}</small>
          </span>
          <span class="style-match-score">${Math.min(99, Math.round(m.score * 4))}%</span>
        </a>`
        )
        .join("")}</div>`
    : `<p class="field-hint">${escapeHtml(t("No style matches saved for this image."))}</p>`;

  const prompt = gen.prompt || null;
  const negative = gen.negative || null;

  return `
    <div class="gallery-detail-grid">
      <div class="gallery-detail-media">
        <img src="${item.dataUrl}" alt="${escapeHtml(item.name)}">
        <div class="gallery-detail-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-gallery-delete="${escapeHtml(item.id)}">${icon("i-trash")} ${escapeHtml(t("Remove"))}</button>
          <button type="button" class="btn btn-outline btn-sm" data-gallery-download="${escapeHtml(item.id)}">${icon("i-download")} ${escapeHtml(t("Download"))}</button>
        </div>
      </div>
      <div class="gallery-detail-info">
        <h2 id="gallery-modal-title">${escapeHtml(item.name)}</h2>
        <p class="field-hint">${escapeHtml(formatDate(new Date(item.addedAt).toISOString().slice(0, 10)))} · ${escapeHtml(formatBytes(item.size))}</p>

        ${gen.source ? `<section class="content-card"><h3>${icon("i-file-json")} ${escapeHtml(t("Generation parameters"))}</h3><div class="spec-grid">${genRows}</div></section>` : ""}

        ${prompt ? `
        <section class="content-card">
          <h3>${icon("i-doc")} ${escapeHtml(t("Prompt"))}</h3>
          <div class="prompt-box">
            <pre>${escapeHtml(prompt)}</pre>
            <button type="button" class="btn btn-icon btn-sm" data-copy-value="${escapeHtml(prompt).replace(/"/g, "&quot;")}" aria-label="${escapeHtml(t("Copy prompt"))}">${icon("i-copy")}</button>
          </div>
          ${negative ? `<p class="field-hint"><strong>${escapeHtml(t("Negative prompt"))}:</strong> ${escapeHtml(negative)}</p>` : ""}
        </section>` : ""}

        <section class="content-card"><h3>${icon("i-palette")} ${escapeHtml(t("Dominant colors"))}</h3>${colorChips}</section>
        <section class="content-card"><h3>${icon("i-layers")} ${escapeHtml(t("Matched styles"))}</h3>${matchLinks}</section>
      </div>
    </div>`;
}

function truncate(value, max) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function spec(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return `
    <div class="spec-item">
      <span class="spec-label">${escapeHtml(t(label))}</span>
      <span class="spec-value">${escapeHtml(String(value))}</span>
    </div>`;
}

bootGallery();
