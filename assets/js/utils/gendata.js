/**
 * Promptition — Generation Metadata Extraction
 * utils/gendata.js
 *
 * Reads embedded generation metadata from image files produced by the major
 * open diffusion tools:
 *   - AUTOMATIC1111 / Forge: `parameters` (tEXt) and `exif` (JSON) chunks
 *   - ComfyUI: `prompt` (JSON workflow) and `workflow` chunks
 *   - SDXL-era A1111: base64-JSON inside a PNG `exif` text chunk
 *
 * Everything runs client-side on the raw bytes.
 */

import { readFileAsArrayBuffer } from "./exif.js";

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

/**
 * Extract generation metadata from an image File.
 * @returns {Promise<{source: string|null, raw: string|null, prompt?: string, negative?: string, model?: string, sampler?: string, steps?: number, cfg?: number, seed?: number, size?: string, scheduler?: string, denoise?: number, clipSkip?: number, loras?: Array<{name:string, weight?:number}>, width?: number, height?: number, extra?: Object}>}
 */
export async function extractGenerationMeta(file) {
  const buffer = await readFileAsArrayBuffer(file);
  const view = new DataView(buffer);
  if (view.byteLength < 8) return { source: null, raw: null };

  const sig = Array.from(new Uint8Array(buffer, 0, 8)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (sig.startsWith("89504e47")) return parsePng(buffer);
  if (sig.startsWith("ffd8")) return parseJpeg(buffer);
  if (sig.startsWith("52494646")) return parseWebp(buffer);

  return { source: null, raw: null };
}

/* ------------------------------------------------------------------ *
 * PNG — tEXt / zTXt / iTXt chunks
 * ------------------------------------------------------------------ */

function parsePng(buffer) {
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);
  const texts = {};
  let offset = 8;

  while (offset + 8 <= view.byteLength) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(u8[offset + 4], u8[offset + 5], u8[offset + 6], u8[offset + 7]);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > view.byteLength) break;

    if (type === "tEXt") {
      const { key, value } = parseTextLatin1(u8, dataStart, dataEnd);
      if (key) texts[key] = value;
    } else if (type === "zTXt") {
      const { key, value } = parseCompressedText(u8, dataStart, dataEnd);
      if (key) texts[key] = value;
    } else if (type === "iTXt") {
      const { key, value } = parseInternationalText(u8, dataStart, dataEnd);
      if (key) texts[key] = value;
    }

    offset = dataEnd + 4; // skip CRC
  }

  return decodeTexts(texts);
}

/** tEXt: `keyword\0text` (Latin-1). */
function parseTextLatin1(u8, start, end) {
  const nul = u8.indexOf(0, start);
  if (nul < start || nul >= end) return { key: null, value: null };
  const key = latin1(u8, start, nul);
  const value = latin1(u8, nul + 1, end);
  return { key, value };
}

/** zTXt: `keyword\0method(1 byte) deflate(text)`. */
function parseCompressedText(u8, start, end) {
  const nul = u8.indexOf(0, start);
  if (nul < start || nul + 2 > end) return { key: null, value: null };
  const key = latin1(u8, start, nul);
  const compressed = u8.slice(nul + 2, end);
  try {
    const value = inflate(compressed);
    return { key, value };
  } catch {
    return { key, value: null };
  }
}

/** iTXt: `keyword\0flag(1) method(1) language\0translated\0text`. */
function parseInternationalText(u8, start, end) {
  const nul = u8.indexOf(0, start);
  if (nul < start || nul + 2 > end) return { key: null, value: null };
  const key = latin1(u8, start, nul);
  const flag = u8[nul + 1];
  const textStart = findIttxtTextStart(u8, nul + 3, end);
  if (textStart < 0) return { key, value: null };
  let bytes = u8.slice(textStart, end);
  if (flag === 1) {
    try {
      bytes = inflate(bytes);
    } catch {
      return { key, value: null };
    }
  }
  return { key, value: utf8(bytes) };
}

function findIttxtTextStart(u8, from, end) {
  let p = from;
  while (p < end && u8[p] !== 0) p++; // language
  if (p >= end) return -1;
  p++;
  while (p < end && u8[p] !== 0) p++; // translated keyword
  if (p >= end) return -1;
  return p + 1;
}

function latin1(u8, start, end) {
  let out = "";
  for (let i = start; i < end; i++) out += String.fromCharCode(u8[i]);
  return out;
}

function utf8(bytes) {
  try {
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
}

function inflate(compressed) {
  const ds = new DecompressionStream("deflate");
  const stream = new Blob([compressed]).stream().pipeThrough(ds);
  return new Response(stream).arrayBuffer();
}

/* ------------------------------------------------------------------ *
 * JPEG — APP1 (EXIF UserComment / XMP) and APP13 (Photoshop)
 * ------------------------------------------------------------------ */

function parseJpeg(buffer) {
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);
  let offset = 2;
  const texts = {};

  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if (marker === 0xffd9) break;
    const segLen = view.getUint16(offset + 2);
    const segStart = offset + 4;
    const segEnd = segStart + segLen - 2;
    if (segEnd > view.byteLength) break;

    if (marker === 0xffe1 && segLen >= 6) {
      const ident = latin1(u8, segStart, segStart + 5);
      if (ident === "Exif\0") {
        const parsed = parseExifUserComment(buffer, segStart + 6, segEnd);
        Object.assign(texts, parsed);
      } else if (latin1(u8, segStart, segStart + 4) === "http") {
        const xmp = latin1(u8, segStart, segEnd);
        const xmpData = parseXmp(xmp);
        if (xmpData) Object.assign(texts, xmpData);
      }
    } else if (marker === 0xffed && segLen >= 6) {
      const ident = latin1(u8, segStart, segStart + 4);
      if (ident === "Photoshop") {
        const parsed = parsePhotoshopIrb(u8, segStart + 4, segEnd);
        Object.assign(texts, parsed);
      }
    }

    offset = segEnd;
  }

  return decodeTexts(texts);
}

/** Read the EXIF UserComment tag (0x9286) where A1111 embeds JSON. */
function parseExifUserComment(buffer, tiffStart, segEnd) {
  const view = new DataView(buffer);
  if (tiffStart + 4 > segEnd) return {};
  const isLittle = view.getUint16(tiffStart) === 0x4949;
  const get16 = (o) => view.getUint16(o, isLittle);
  const get32 = (o) => view.getUint32(o, isLittle);
  const ifdOffset = get32(tiffStart + 4);
  if (tiffStart + ifdOffset + 2 > segEnd) return {};

  const readIfd = (base, depth = 0) => {
    if (depth > 3 || base + 2 > segEnd) return {};
    const count = get16(base);
    const tags = {};
    for (let i = 0; i < count && base + 2 + i * 12 + 12 <= segEnd; i++) {
      const entry = base + 2 + i * 12;
      const tag = get16(entry);
      const type = get16(entry + 2);
      const valueCount = get32(entry + 4);
      const sizeOf = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
      const typeSize = sizeOf[type] || 1;
      const inline = typeSize * valueCount <= 4;
      const valueOffset = inline ? entry + 8 : tiffStart + get32(entry + 8);
      if (valueOffset + valueCount <= segEnd + 1) {
        tags[tag] = { type, count: valueCount, valueOffset };
      }
    }
    return tags;
  };

  try {
    const ifd0 = readIfd(tiffStart + ifdOffset);
    const out = {};
    const userComment = ifd0[0x9286];
    if (userComment) {
      const start = userComment.valueOffset + (userComment.type === 7 ? 8 : 0);
      const bytes = new Uint8Array(buffer, start, Math.min(userComment.count, segEnd - start));
      const text = utf8(bytes).replace(/^\s*[\x00-\x1f]+/, "").trim();
      if (text) out.userComment = text;
    }
    const software = ifd0[0x0131];
    if (software) {
      out.software = latin1(new Uint8Array(buffer), software.valueOffset, software.valueOffset + Math.min(software.count, segEnd - software.valueOffset)).replace(/\0+$/, "").trim();
    }
    return out;
  } catch {
    return {};
  }
}

/** Parse an XMP packet for a `tiff:Model` / `parameters` style fields. */
function parseXmp(xmp) {
  const model = /<tiff:Model>([^<]+)<\/tiff:Model>/.exec(xmp);
  const software = /<tiff:Software>([^<]+)<\/tiff:Software>/.exec(xmp);
  const params = /<dc:description><rdf:Alt><rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/.exec(xmp);
  const out = {};
  if (model) out.software = decodeEntities(model[1]);
  if (software) out.software = out.software || decodeEntities(software[1]);
  if (params && params[1].trim()) out.parameters = decodeEntities(params[1]).trim();
  return out;
}

/** Parse Photoshop IRB: `8BIM` blocks with 0x0404 "Info" or text blocks. */
function parsePhotoshopIrb(u8, start, end) {
  const texts = {};
  let p = start;
  while (p + 8 <= end) {
    const sig = latin1(u8, p, p + 4);
    if (sig !== "8BIM") break;
    const id = u8[p + 4] * 256 + u8[p + 5];
    const nameLen = (u8[p + 6] << 8) | u8[p + 7];
    const nameStart = p + 8;
    const nameEnd = nameStart + nameLen;
    const dataStart = nameEnd + (nameLen % 2);
    if (dataStart + 4 > end) break;
    const dataLen = (u8[dataStart] << 24) | (u8[dataStart + 1] << 16) | (u8[dataStart + 2] << 8) | u8[dataStart + 3];
    const bodyStart = dataStart + 4;
    const bodyEnd = bodyStart + dataLen;
    if (bodyEnd > end) break;

    if (id === 0x0404) {
      // Information resource: can contain "parameters\0..." text.
      const body = latin1(u8, bodyStart, Math.min(bodyEnd, end)).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]+/g, "\n").trim();
      if (body) texts.parameters = body;
    }
    p = bodyEnd + (dataLen % 2);
  }
  return texts;
}

function decodeEntities(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/* ------------------------------------------------------------------ *
 * WebP — EXIF chunk
 * ------------------------------------------------------------------ */

function parseWebp(buffer) {
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);
  let offset = 12; // RIFF header + WEBP
  const texts = {};

  while (offset + 8 <= view.byteLength) {
    const chunk = latin1(u8, offset, offset + 4);
    const size = view.getUint32(offset + 4, true);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    if (dataEnd > view.byteLength) break;

    if (chunk === "EXIF") {
      const parsed = parseExifUserComment(buffer, dataStart + 6, dataEnd);
      Object.assign(texts, parsed);
    }
    offset = dataEnd + (size % 2);
  }

  return decodeTexts(texts);
}

/* ------------------------------------------------------------------ *
 * Normalisation — turn raw chunks into structured generation metadata
 * ------------------------------------------------------------------ */

function decodeTexts(texts) {
  const raw = texts.parameters || texts.userComment || texts["exif"] || texts.prompt || null;

  if (texts["exif"] || texts.userComment) {
    const json = tryParseJson(texts["exif"] || texts.userComment);
    if (json) {
      const parsed = parseSdxlJson(json);
      if (parsed) return parsed;
    }
  }

  if (texts.prompt) {
    const workflow = tryParseJson(texts.prompt);
    if (workflow && workflow["3"]?.class_type) {
      return parseComfyWorkflow(workflow, texts);
    }
  }

  if (texts.parameters) {
    const parsed = parseA1111Params(texts.parameters);
    if (parsed) return parsed;
  }

  if (raw) {
    return { source: "unknown", raw };
  }

  return { source: null, raw: null };
}

/** SDXL-era A1111 stores a JSON blob (sometimes base64) in `exif`. */
function parseSdxlJson(json) {
  if (typeof json === "string") json = tryParseJson(json);
  if (!json || typeof json !== "object") return null;
  if (!("prompt" in json) && !("negativePrompt" in json) && !("steps" in json)) return null;

  const getLoras = (text) => {
    if (!text) return [];
    const loras = [];
    const re = /<lora:([^:>]+):([0-9.]+)>/g;
    let m;
    while ((m = re.exec(text))) loras.push({ name: m[1], weight: parseFloat(m[2]) });
    return loras;
  };

  return {
    source: "sdxl-json",
    raw: JSON.stringify(json),
    prompt: json.prompt || null,
    negative: json.negativePrompt || null,
    model: json.modelName || json.modelFilename || json.model || null,
    sampler: json.samplerName || json.sampler || null,
    steps: numOrNull(json.steps),
    cfg: numOrNull(json.cfgScale ?? json.cfg),
    seed: numOrNull(json.seed),
    scheduler: json.scheduler || null,
    denoise: numOrNull(json.denoisingStrength ?? json.denoise),
    clipSkip: numOrNull(json.clipSkip),
    width: numOrNull(json.width),
    height: numOrNull(json.height),
    size: json.size || (json.width && json.height ? `${json.width}x${json.height}` : null),
    loras: getLoras(json.prompt),
    extra: json,
  };
}

/** Classic AUTOMATIC1111 `parameters` text block. */
function parseA1111Params(text) {
  if (!text || typeof text !== "string") return null;

  // Split positive prompt from the "Negative prompt:" section.
  let prompt = text;
  let negative = null;
  const negIdx = text.indexOf("Negative prompt:");
  if (negIdx >= 0) {
    prompt = text.slice(0, negIdx).replace(/\n+$/, "");
    const after = text.slice(negIdx + "Negative prompt:".length);
    const newline = after.indexOf("\n");
    negative = (newline >= 0 ? after.slice(0, newline) : after).trim();
  }

  // Remaining settings lines ("Steps: 20, Sampler: Euler a, ...").
  const settings = {};
  const lines = text.split("\n");
  const settingsLine = lines.find((l) => /^\s*Steps:/.test(l)) || lines.find((l) => /^\s*Seed:/.test(l));
  if (settingsLine) {
    const commaParts = settingsLine.split(",");
    for (const part of commaParts) {
      const [k, ...v] = part.split(":");
      if (v.length) settings[k.trim()] = v.join(":").trim();
    }
  }

  const getLoras = () => {
    const loras = [];
    const re = /<lora:([^:>]+):([0-9.]+)>/g;
    let m;
    while ((m = re.exec(prompt || ""))) loras.push({ name: m[1], weight: parseFloat(m[2]) });
    return loras;
  };

  return {
    source: "a1111",
    raw: text,
    prompt: (prompt.trim().replace(/\0/g, "") || null),
    negative: negative || null,
    model: settings["Model"] || null,
    sampler: settings["Sampler"] || null,
    steps: numOrNull(settings["Steps"]),
    cfg: numOrNull(settings["CFG scale"]),
    seed: numOrNull(settings["Seed"]),
    size: settings["Size"] || null,
    scheduler: settings["Schedule type"] || null,
    denoise: numOrNull(settings["Denoising strength"]),
    clipSkip: numOrNull(settings["Clip skip"]),
    loras: getLoras(),
    extra: settings,
  };
}

/** ComfyUI embeds the full workflow graph as JSON in the `prompt` chunk. */
function parseComfyWorkflow(graph, texts) {
  if (!graph || typeof graph !== "object") return null;

  let model = null;
  let positive = null;
  let negative = null;
  let sampler = null;
  let scheduler = null;
  let steps = null;
  let cfg = null;
  let seed = null;
  let denoise = null;
  let width = null;
  let height = null;
  const loras = [];

  for (const node of Object.values(graph)) {
    const cls = node?.class_type;
    const inputs = node?.inputs || {};

    if (cls === "CheckpointLoaderSimple" || cls === "CheckpointLoaderAdvanced") {
      model = inputs.ckpt_name || inputs.ckpt_name2 || model;
    } else if (cls === "UNETLoader") {
      model = inputs.unet_name || model;
    } else if (cls === "CLIPTextEncode" || cls === "CLIPTextEncodeSDXL") {
      const text = String(inputs.text || "");
      if (!positive) positive = text;
      else negative = negative || text;
    } else if (cls === "KSampler" || cls === "KSamplerAdvanced") {
      sampler = inputs.sampler_name || sampler;
      scheduler = inputs.scheduler || scheduler;
      steps = numOrNull(inputs.steps);
      cfg = numOrNull(inputs.cfg);
      seed = numOrNull(inputs.seed);
      denoise = numOrNull(inputs.denoise);
    } else if (cls === "EmptyLatentImage" || cls === "EmptySD3LatentImage") {
      width = numOrNull(inputs.width);
      height = numOrNull(inputs.height);
    } else if (cls === "LoraLoader" || cls === "LoraLoaderModelOnly") {
      if (inputs.lora_name) loras.push({ name: inputs.lora_name, weight: numOrNull(inputs.strength_model ?? inputs.strength) });
    } else if (cls === "CLIPSetLastLayer") {
      /* handled via stop_at_clip_layer */
    }
  }

  return {
    source: "comfyui",
    raw: texts.prompt || JSON.stringify(graph),
    prompt: positive,
    negative,
    model,
    sampler,
    scheduler,
    steps,
    cfg,
    seed,
    denoise,
    width,
    height,
    size: width && height ? `${width}x${height}` : null,
    loras,
  };
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function tryParseJson(text) {
  if (!text) return null;
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(text.trim())) {
    try {
      const decoded = atob(text.trim());
      return JSON.parse(decoded);
    } catch {
      /* not base64 JSON */
    }
  }
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

function numOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
