/**
 * Promptition — Image Analyzer
 * pages/upload.js
 *
 * Client-side image analyzer: reads file metadata and EXIF, extracts
 * dominant colors, then classifies the image against the styles library
 * using color-name and mood heuristics to suggest matching styles.
 * Nothing is uploaded — everything runs locally in the browser.
 */

import { initApp } from "../core/app.js";
import { icon, escapeHtml, render, qs } from "../utils/dom.js";
import { detailUrl } from "../core/router.js";
import { t } from "../core/i18n.js";
import { formatBytes } from "../utils/helpers.js";
import { fetchCollection, fetchItem } from "../utils/data.js";
import {
  readFileAsArrayBuffer,
  readFileAsDataURL,
  loadImageSize,
  extractExif,
  extractDominantColors,
} from "../utils/exif.js";
import { extractGenerationMeta } from "../utils/gendata.js";
import { saveImage } from "../utils/gallery.js";
import { initCopyButtons } from "../components/copy.js";
import { toast } from "../components/toast.js";

const ACCEPTED = ["png", "jpeg", "jpg", "webp", "gif", "avif", "bmp"];

let currentDataUrl = null;
let currentColors = [];
let currentMatches = [];
let currentFile = null;
let currentGen = null;

async function boot() {
  await initApp();
  initCopyButtons();

  const dropzone = qs("[data-dropzone]");
  const input = qs("[data-upload-input]");

  dropzone.addEventListener("click", () => input.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (file) handleFile(file);
  });

  ["dragenter", "dragover"].forEach((name) =>
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragging");
    })
  );
  ["dragleave", "drop"].forEach((name) =>
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-dragging");
    })
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  qs("[data-upload-reset]")?.addEventListener("click", reset);
  qs("[data-save-library]")?.addEventListener("click", saveToLibrary);
}

function isValidImage(file) {
  const ext = (file.name || "").split(".").pop().toLowerCase();
  return ACCEPTED.includes(ext) || String(file.type).startsWith("image/");
}

async function handleFile(file) {
  if (!isValidImage(file)) {
    toast(t("Please choose a supported image file"), "error");
    return;
  }

  const dropzone = qs("[data-dropzone]");
  const loading = qs("[data-upload-loading]");
  const preview = qs("[data-upload-preview]");

  dropzone.classList.add("is-hidden");
  preview.hidden = true;
  loading.hidden = false;
  qs("[data-upload-results]").hidden = true;

  try {
    const [buffer, dataUrl] = await Promise.all([
      readFileAsArrayBuffer(file),
      readFileAsDataURL(file),
    ]);
    currentDataUrl = dataUrl;
    currentFile = file;

    const size = await loadImageSize(dataUrl);
    const thumb = qs("[data-upload-thumb]");
    thumb.src = dataUrl;
    thumb.alt = file.name || t("Uploaded image");
    preview.hidden = false;

    const [colors, exif, gen] = await Promise.all([
      extractDominantColors(thumb, 6),
      Promise.resolve(extractExif(buffer)),
      extractGenerationMeta(file),
    ]);
    currentGen = gen;

    renderResults(file, size, exif, colors);
    renderGenMeta(gen);
    currentColors = colors;

    qs("[data-save-library]").hidden = false;

    loading.hidden = true;
    const results = qs("[data-upload-results]");
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error(err);
    loading.hidden = true;
    dropzone.classList.remove("is-hidden");
    preview.hidden = true;
    toast(t("Could not analyze this image"), "error");
  }
}

function specItem(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return `
    <div class="spec-item">
      <span class="spec-label">${escapeHtml(label)}</span>
      <span class="spec-value">${escapeHtml(String(value))}</span>
    </div>`;
}

function renderResults(file, size, exif, colors) {
  const ext = (file.name || "").split(".").pop().toLowerCase() || (file.type || "").split("/")[1] || "";

  const meta = [
    specItem(t("Filename"), file.name),
    specItem(t("Type"), ext.toUpperCase() || file.type),
    specItem(t("MIME type"), file.type || "—"),
    specItem(t("Size"), formatBytes(file.size)),
    specItem(t("Dimensions"), `${size.width} × ${size.height} px`),
    specItem(t("Aspect ratio"), `${(size.width / size.height).toFixed(2)}:1`),
    specItem(t("Megapixels"), ((size.width * size.height) / 1_000_000).toFixed(2)),
  ].join("");

  const exifRows = [
    specItem(t("Camera"), exif.make ? [exif.make, exif.model].filter(Boolean).join(" ") : null),
    specItem(t("Model"), exif.model && !exif.make ? exif.model : null),
    specItem(t("Lens"), exif.lensModel),
    specItem(t("Focal length"), exif.focalLengthLabel),
    specItem(t("Aperture"), exif.fNumberLabel),
    specItem(t("Shutter speed"), exif.exposureTimeLabel),
    specItem(t("ISO"), exif.iso != null ? `ISO ${exif.iso}` : null),
    specItem(t("Date taken"), exif.dateTimeOriginal),
    specItem(t("Software"), exif.software),
    specItem(t("Orientation"), exif.orientationLabel),
    specItem(t("GPS"), exif.gps ? `${exif.gps.lat.toFixed(5)}, ${exif.gps.lng.toFixed(5)}` : null),
  ].join("");

  render(qs("[data-meta]"), meta);
  render(qs("[data-exif]"), exifRows);
  qs("[data-exif-empty]").hidden = !!exifRows.trim();

  render(
    qs("[data-colors]"),
    colors
      .map(
        (c) => `
        <div class="color-chip">
          <span class="color-swatch" style="background:${c.hex}" aria-hidden="true"></span>
          <span class="color-meta">
            <strong>${escapeHtml(c.name)}</strong>
            <small>${c.hex} · ${c.pct.toFixed(0)}%</small>
          </span>
        </div>`
      )
      .join("")
  );

  classify(colors).then((matches) => {
    currentMatches = matches;
    renderMatches(matches);
    renderSuggestion(matches, colors);
  });
}

function styleScore(style, colors) {
  const palette = (style.palette || []).map((p) => p.toLowerCase());
  const mood = (style.mood || []).map((m) => m.toLowerCase());
  const tags = (style.tags || []).map((t) => t.toLowerCase());
  const words = new Set([...palette, ...mood, ...tags]);

  let score = 0;
  const hits = [];
  for (const color of colors) {
    const name = color.name.toLowerCase();
    if (words.has(name)) {
      score += color.pct / 10;
      hits.push(name);
    }
  }

  // Bonus for palette-name overlap against dominant color names.
  const paletteOverlap = palette.filter((p) => colors.some((c) => c.name.toLowerCase() === p)).length;
  score += paletteOverlap * 6;

  return { score, hits, paletteOverlap };
}

async function classify(colors) {
  try {
    const { items } = await fetchCollection("styles");
    const scored = [];
    for (const item of items) {
      const detail = await fetchItem("styles", item.id).catch(() => item);
      const { score, hits, paletteOverlap } = styleScore(detail, colors);
      if (score > 0) scored.push({ item: detail, score, hits, paletteOverlap });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3);
  } catch {
    return [];
  }
}

function renderGenMeta(gen) {
  const section = qs("[data-gen-section]");
  const empty = qs("[data-gen-empty]");
  if (!gen || !gen.source) {
    if (section) section.hidden = true;
    return;
  }
  section.hidden = false;

  const rows = [
    specItem(t("Source"), gen.source === "comfyui" ? "ComfyUI workflow" : gen.source === "a1111" ? "AUTOMATIC1111" : "SDXL JSON"),
    specItem(t("Model"), gen.model),
    specItem(t("Sampler"), gen.sampler ? (gen.scheduler ? `${gen.sampler} / ${gen.scheduler}` : gen.sampler) : null),
    specItem(t("Steps"), gen.steps != null ? String(gen.steps) : null),
    specItem(t("CFG"), gen.cfg != null ? String(gen.cfg) : null),
    specItem(t("Seed"), gen.seed != null ? String(gen.seed) : null),
    specItem(t("Denoise"), gen.denoise != null ? String(gen.denoise) : null),
    specItem(t("Clip skip"), gen.clipSkip != null ? String(gen.clipSkip) : null),
    specItem(t("Size"), gen.size || (gen.width && gen.height ? `${gen.width}×${gen.height}` : null)),
    specItem(t("LoRAs"), gen.loras?.length ? gen.loras.map((l) => `${l.name}${l.weight != null ? ` @${l.weight}` : ""}`).join(", ") : null),
  ].join("");

  render(qs("[data-gen]"), rows);
  empty.hidden = !!rows.trim();

  const prompt = gen.prompt || null;
  const negative = gen.negative || null;
  if (prompt) {
    const pre = qs("[data-gen-prompt]");
    pre.textContent = prompt;
    const btn = qs("[data-gen-section] [data-copy-value]");
    btn.setAttribute("data-copy-value", prompt);
    qs("[data-gen-negative]").hidden = !negative;
    qs("[data-gen-negative-text]").textContent = negative || "";
  } else {
    qs("[data-gen-prompt]").textContent = "";
    qs("[data-gen-negative]").hidden = true;
    empty.hidden = false;
    empty.textContent = t("Found embedded parameters but no prompt text to display.");
  }
}

async function saveToLibrary() {
  if (!currentFile || !currentDataUrl) return;
  try {
    await saveImage({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: currentFile.name || t("Image"),
      type: currentFile.type || "",
      size: currentFile.size,
      addedAt: Date.now(),
      dataUrl: currentDataUrl,
      meta: {
        colors: currentColors,
        matches: currentMatches,
        gen: currentGen,
      },
    });
    toast(t("Saved to your library"), "success");
  } catch (err) {
    console.error(err);
    toast(t("Could not save to library"), "error");
  }
}

function renderMatches(matches) {
  const container = qs("[data-matches]");
  if (!matches.length) {
    render(container, `<p class="field-hint">${escapeHtml(t("No close style matches — try another image."))}</p>`);
    return;
  }
  render(
    container,
    matches
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
      .join("")
  );
}

function renderSuggestion(matches, colors) {
  const container = qs("[data-suggestion]");
  if (!container) return;

  const top = matches[0]?.item;
  const paletteWords = colors.slice(0, 4).map((c) => c.name.toLowerCase());
  const suffix = top?.promptSuffix || "high detail, sharp focus, professional photography";
  const negative = top?.negativeSuffix || "blurry, low quality, distorted, watermark, text, extra limbs";

  const prompt = [
    `${t("Style")}: ${top ? top.name : "photorealistic"}.`,
    `${t("Palette")}: ${paletteWords.join(", ")}.`,
    suffix,
  ].join(" ");

  const btn = container.querySelector("[data-copy-value]");
  if (btn) btn.setAttribute("data-copy-value", prompt);
  const pre = container.querySelector("[data-suggestion-text]");
  if (pre) pre.textContent = prompt;

  const negativeEl = qs("[data-negative-text]");
  if (negativeEl) negativeEl.textContent = negative;
}

function reset() {
  currentDataUrl = null;
  currentColors = [];
  currentMatches = [];
  currentFile = null;
  currentGen = null;
  const form = document.createElement("form");
  const results = qs("[data-upload-results]");
  results.parentNode.insertBefore(form, results);
  form.reset();
  form.remove();

  qs("[data-dropzone]").classList.remove("is-hidden");
  qs("[data-upload-preview]").hidden = true;
  qs("[data-upload-loading]").hidden = true;
  qs("[data-upload-thumb]").src = "";
  results.hidden = true;
  qs("[data-upload-input]").value = "";
  qs("[data-gen-section]").hidden = true;
  qs("[data-save-library]").hidden = true;
}

boot();
