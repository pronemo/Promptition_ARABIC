/**
 * Promptition — Image Analysis
 * utils/exif.js
 *
 * Dependency-free helpers for reading image metadata: dimensions, format,
 * JPEG EXIF blocks (camera, lens, exposure, GPS) and dominant color
 * extraction via canvas sampling. Everything runs client-side.
 */

/** Read a file as an ArrayBuffer. */
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.onload = () => resolve(reader.result);
    reader.readAsArrayBuffer(file);
  });
}

/** Read a file as a data URL. */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/** Load an <img> element from a data URL and resolve its natural size. */
export function loadImageSize(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = dataUrl;
  });
}

/* ------------------------------------------------------------------ *
 * EXIF parsing (JPEG APP1 / TIFF-based)
 * ------------------------------------------------------------------ */

/** Human-friendly orientation description from the EXIF orientation tag. */
const ORIENTATIONS = {
  1: "Normal",
  2: "Mirrored horizontally",
  3: "Rotated 180°",
  4: "Mirrored vertically",
  5: "Rotated 90° & mirrored",
  6: "Rotated 90° CW",
  7: "Rotated 270° & mirrored",
  8: "Rotated 270° CW",
};

/** Format a rational (numerator/denominator) as a readable string. */
function rationalString(num, den, digits = 2) {
  if (!den) return null;
  const value = num / den;
  return Number.isInteger(value) ? String(value) : value.toFixed(digits).replace(/\.0+$/, "");
}

/**
 * Parse the bytes of a TIFF little/big-endian structure into a flat map
 * of { ifd0, exif, gps } tag maps.
 */
function parseTiff(view, offset) {
  const isLittle = view.getUint16(offset) === 0x4949;
  const get16 = (o) => view.getUint16(o, isLittle);
  const get32 = (o) => view.getUint32(o, isLittle);

  const ifdOffset = get32(offset + 4);
  const readIfd = (base) => {
    const tags = {};
    const count = get16(base);
    for (let i = 0; i < count; i++) {
      const entry = base + 2 + i * 12;
      const tag = get16(entry);
      const type = get16(entry + 2);
      const valueCount = get32(entry + 4);
      let valueOffset = entry + 8;
      const sizeOf = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
      const typeSize = sizeOf[type] || 1;
      if (typeSize * valueCount > 4) {
        valueOffset = offset + get32(entry + 8);
      }
      tags[tag] = { type, count: valueCount, valueOffset };
    }
    return tags;
  };

  const ifd0 = readIfd(offset + ifdOffset);
  const exifPtr = ifd0[0x8769];
  const gpsPtr = ifd0[0x8825];

  const result = { ifd0, exif: {}, gps: {} };
  if (exifPtr) {
    try {
      result.exif = readIfd(exifPtr.valueOffset);
    } catch {
      /* ignore malformed EXIF IFD */
    }
  }
  if (gpsPtr) {
    try {
      result.gps = readIfd(gpsPtr.valueOffset);
    } catch {
      /* ignore malformed GPS IFD */
    }
  }
  return result;
}

function readTagValue(view, isLittle, tag) {
  const get16 = (o) => view.getUint16(o, isLittle);
  const get32 = (o) => view.getUint32(o, isLittle);
  const get8 = (o) => view.getUint8(o);
  const { type, count, valueOffset } = tag;

  switch (type) {
    case 1: {
      // BYTE / ASCII
      if (count === 1) return get8(valueOffset);
      const bytes = [];
      for (let i = 0; i < Math.min(count, 64); i++) bytes.push(get8(valueOffset + i));
      const text = String.fromCharCode(...bytes).replace(/\0+$/, "").trim();
      return text || null;
    }
    case 2: {
      const bytes = [];
      const length = Math.min(count, 256);
      for (let i = 0; i < length; i++) bytes.push(get8(valueOffset + i));
      return String.fromCharCode(...bytes).replace(/\0+$/, "").trim();
    }
    case 3:
      return count === 1 ? get16(valueOffset) : Array.from({ length: count }, (_, i) => get16(valueOffset + i * 2));
    case 4:
      return count === 1 ? get32(valueOffset) : Array.from({ length: count }, (_, i) => get32(valueOffset + i * 4));
    case 5: {
      const num = get32(valueOffset);
      const den = get32(valueOffset + 4);
      return { num, den };
    }
    case 10: {
      const num = view.getInt32(valueOffset, isLittle);
      const den = view.getInt32(valueOffset + 4, isLittle);
      return { num, den };
    }
    default:
      return null;
  }
}

/** Convert a GPS coordinate pair (degrees/minutes/seconds) to decimal. */
function gpsDecimal(value) {
  if (!Array.isArray(value) || value.length < 3) return null;
  const d = value[0]?.num / (value[0]?.den || 1) || 0;
  const m = value[1]?.num / (value[1]?.den || 1) || 0;
  const s = value[2]?.num / (value[2]?.den || 1) || 0;
  return d + m / 60 + s / 3600;
}

const EXIF_LABELS = {
  0x010f: "make",
  0x0110: "model",
  0x0131: "software",
  0x0112: "orientation",
  0x010e: "description",
  0x0132: "dateTime",
  0xa002: "pixelX",
  0xa003: "pixelY",
};

const EXIF_IFD_LABELS = {
  0x9003: "dateTimeOriginal",
  0x9004: "dateTimeDigitized",
  0x829a: "exposureTime",
  0x829d: "fNumber",
  0x8827: "iso",
  0x9209: "flash",
  0x920a: "focalLength",
  0xa404: "digitalZoomRatio",
};

const GPS_LABELS = {
  0x0001: "latitudeRef",
  0x0002: "latitude",
  0x0003: "longitudeRef",
  0x0004: "longitude",
};

/** Extract a structured metadata object from JPEG bytes. */
export function extractExif(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (view.getUint16(0) !== 0xffd8) return {}; // not a JPEG

  const meta = {};
  let offset = 2;
  const max = Math.min(view.byteLength, arrayBuffer.byteLength);

  while (offset + 4 <= max) {
    const marker = view.getUint16(offset);
    if (marker !== 0xffe1) {
      if (marker === 0xffd9) break;
      offset += 2;
      if (offset + 2 <= max) offset += view.getUint16(offset);
      continue;
    }
    // APP1 — EXIF segment
    const segLen = view.getUint16(offset + 2);
    const segStart = offset + 4;
    const header = String.fromCharCode(view.getUint8(segStart), view.getUint8(segStart + 1), view.getUint8(segStart + 2), view.getUint8(segStart + 3), view.getUint8(segStart + 4), view.getUint8(segStart + 5));
    if (header === "Exif\0\0") {
      try {
        const tiffOffset = segStart + 6;
        const isLittle = view.getUint16(tiffOffset) === 0x4949;
        const tiff = parseTiff(view, tiffOffset);
        const get16 = (o) => view.getUint16(o, isLittle);
        const get32 = (o) => view.getUint32(o, isLittle);

        for (const [tag, label] of Object.entries(EXIF_LABELS)) {
          const t = tiff.ifd0[tag];
          if (!t) continue;
          const value = readTagValue(view, isLittle, t);
          if (value === null || value === undefined || value === "") continue;
          meta[label] = value;
        }

        for (const [tag, label] of Object.entries(EXIF_IFD_LABELS)) {
          const t = tiff.exif[tag] || tiff.ifd0[tag];
          if (!t) continue;
          const value = readTagValue(view, isLittle, t);
          if (value === null || value === undefined) continue;
          meta[label] = value;
        }

        for (const [tag, label] of Object.entries(GPS_LABELS)) {
          const t = tiff.gps[tag];
          if (!t) continue;
          const value = readTagValue(view, isLittle, t);
          if (value === null || value === undefined) continue;
          meta[label] = value;
        }

        // Derived friendly values
        const toRational = (v) => (typeof v === "object" && v != null ? v : { num: v, den: 1 });
        if (meta.orientation != null) {
          meta.orientationLabel = ORIENTATIONS[meta.orientation] || `Orientation ${meta.orientation}`;
        }
        if (meta.exposureTime != null) {
          const { num, den } = toRational(meta.exposureTime);
          meta.exposureTimeLabel = den ? (num === 1 ? `1/${den}s` : `${rationalString(num, den, 4)}s`) : null;
        }
        if (meta.fNumber != null) {
          const { num, den } = toRational(meta.fNumber);
          meta.fNumberLabel = `f/${rationalString(num, den)}`;
        }
        if (meta.focalLength != null) {
          const { num, den } = toRational(meta.focalLength);
          meta.focalLengthLabel = `${rationalString(num, den)} mm`;
        }
        if (meta.latitude != null && meta.longitude != null) {
          const lat = gpsDecimal(meta.latitude);
          const lng = gpsDecimal(meta.longitude);
          if (lat != null && lng != null) {
            const latDir = meta.latitudeRef === "S" ? -1 : 1;
            const lngDir = meta.longitudeRef === "W" ? -1 : 1;
            meta.gps = { lat: lat * latDir, lng: lng * lngDir };
          }
        }
        delete meta.latitude;
        delete meta.longitude;
        delete meta.latitudeRef;
        delete meta.longitudeRef;
      } catch {
        /* fall through with whatever was captured */
      }
    }
    offset += 2 + segLen;
  }

  return meta;
}

/* ------------------------------------------------------------------ *
 * Dominant color extraction
 * ------------------------------------------------------------------ */

/** Named colors used to translate hex values into human words. */
const COLOR_NAMES = [
  ["Black", 0, 0, 0],
  ["White", 255, 255, 255],
  ["Red", 220, 40, 40],
  ["Crimson", 140, 20, 50],
  ["Orange", 240, 120, 30],
  ["Amber", 250, 170, 40],
  ["Yellow", 245, 220, 60],
  ["Lime", 140, 200, 40],
  ["Green", 40, 160, 70],
  ["Emerald", 20, 130, 100],
  ["Teal", 0, 140, 130],
  ["Cyan", 0, 190, 200],
  ["Sky blue", 80, 170, 230],
  ["Blue", 50, 90, 220],
  ["Indigo", 70, 50, 170],
  ["Violet", 120, 60, 200],
  ["Purple", 150, 60, 160],
  ["Magenta", 210, 40, 160],
  ["Pink", 240, 120, 170],
  ["Brown", 130, 80, 50],
  ["Tan", 190, 150, 100],
  ["Beige", 220, 200, 165],
  ["Gray", 130, 130, 130],
  ["Silver", 190, 190, 190],
  ["Navy", 25, 40, 90],
  ["Deep indigo", 30, 25, 70],
  ["Maroon", 90, 25, 30],
  ["Gold", 210, 170, 60],
];

/** Nearest named color for an RGB triplet. */
export function nearestColorName(r, g, b) {
  let best = "Color";
  let bestDist = Infinity;
  for (const [name, cr, cg, cb] of COLOR_NAMES) {
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return best;
}

/** Convert an RGB triplet to a hex string. */
export function rgbToHex(r, g, b) {
  const toHex = (n) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Extract the dominant colors of an image drawn to a small canvas.
 * @param {HTMLImageElement|string} image  <img> element or data URL.
 * @param {number} [count]  How many colors to return.
 * @returns {Promise<Array<{hex:string, r:number, g:number, b:number, pct:number, name:string}>>}
 */
export async function extractDominantColors(image, count = 6) {
  const src = typeof image === "string" ? await loadImageElement(image) : image;
  const sample = 96;
  const canvas = document.createElement("canvas");
  canvas.width = sample;
  canvas.height = sample;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const ratio = Math.min(sample / src.naturalWidth, sample / src.naturalHeight);
  const w = Math.max(1, Math.round(src.naturalWidth * ratio));
  const h = Math.max(1, Math.round(src.naturalHeight * ratio));
  ctx.drawImage(src, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const buckets = new Map();
  const bucketSize = 24;
  const skip = 2;

  for (let i = 0; i < data.length; i += 4 * skip) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    const key = `${r >> 3}-${g >> 3}-${b >> 3}`;
    const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;
    buckets.set(key, bucket);
  }

  const total = data.length / 4;
  const sorted = Array.from(buckets.values())
    .filter((b) => b.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, count * 2);

  // Merge remaining pixels into the closest kept bucket.
  const kept = sorted.map((b) => ({
    r: Math.round(b.r / b.n),
    g: Math.round(b.g / b.n),
    b: Math.round(b.b / b.n),
    n: b.n,
  }));

  const results = kept.map((b) => {
    const pct = total ? (b.n / total) * 100 : 0;
    return {
      hex: rgbToHex(b.r, b.g, b.b),
      r: b.r,
      g: b.g,
      b: b.b,
      pct: Math.min(100, Math.max(0, pct)),
      name: nearestColorName(b.r, b.g, b.b),
    };
  });

  return results.slice(0, count);
}

/** Load an image element from a data URL. */
export function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = dataUrl;
  });
}
