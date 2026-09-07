/**
 * tiptapToDocx.ts
 * ----------------------------------------------------------------------------
 * Converts a Tiptap / ProseMirror JSON document into a real, working .docx
 * file (WordprocessingML) using the `docx` (docx-js) library.
 *
 * Supported nodes:
 *   doc, paragraph, text, heading, bulletList, orderedList, listItem,
 *   taskList, taskItem, blockquote, codeBlock, horizontalRule, hardBreak,
 *   image, table, tableRow, tableCell, tableHeader
 *
 * Supported marks:
 *   bold, italic, underline, strike, code, link, highlight, textStyle
 *   (color / fontFamily / fontSize), subscript, superscript
 *
 * Usage:
 *   import { tiptapToDocx } from "./tiptapToDocx";
 *   const buffer = await tiptapToDocx(tiptapJson);
 *   fs.writeFileSync("out.docx", buffer);
 * ----------------------------------------------------------------------------
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  LineRuleType,
  Packer,
  PageBreak,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlignTable,
  VerticalMergeType,
  WidthType,
  convertInchesToTwip,
  type IRunOptions,
  type ILevelsOptions,
  type ParagraphChild,
} from "docx";

// ---------------------------------------------------------------------------
// Tiptap / ProseMirror JSON types
// ---------------------------------------------------------------------------

export interface TiptapMark {
  type: string;
  attrs?: Record<string, any>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapDocument {
  type: "doc";
  content: TiptapNode[];
}

// ---------------------------------------------------------------------------
// Public options
// ---------------------------------------------------------------------------

export interface ResolvedImage {
  data: Uint8Array;
  width: number; // px
  height: number; // px
  type: "png" | "jpg" | "gif" | "bmp";
}

export interface ConvertOptions {
  /** "LETTER" (US) or "A4". Default: "LETTER". */
  pageSize?: "LETTER" | "A4";
  orientation?: "portrait" | "landscape";
  /** Page margins in inches on all sides. Default 1. */
  marginInches?: number;
  defaultFont?: string; // default "Calibri"
  defaultFontSizePt?: number; // default 11
  /**
   * Resolves an <img src> (data: URL or remote URL) into raster bytes.
   * A default resolver handles data: URLs. Remote http(s) URLs require
   * either Node 18+ (global fetch) or a custom resolver to be supplied,
   * since network access is environment-specific.
   */
  resolveImage?: (src: string) => Promise<ResolvedImage>;
  /** Default max image display width in pixels (scaled proportionally). */
  maxImageWidthPx?: number;
  /**
   * Called when an image fails to resolve/decode/convert, instead of the
   * default `console.warn`. The image is always skipped either way (one bad
   * image never aborts the whole export) — this just lets you surface it,
   * e.g. as a toast: `onImageError: (src, err) => toast.warn(...)`.
   */
  onImageError?: (src: string, error: Error) => void;
  /**
   * Maps non-standard node type names to the canonical ones this converter
   * understands (e.g. if your schema calls it "toggle" / "toggleSummary" /
   * "toggleContent" instead of "details" / "detailsSummary" / "detailsContent").
   */
  nodeAliases?: Record<string, string>;
  /** Same idea as nodeAliases, but for mark types (e.g. { inlineCode: "code" }). */
  markAliases?: Record<string, string>;
  /**
   * Visual theme — colors/fonts/sizes for the elements a CSS stylesheet
   * would normally control. Defaults below are pulled directly from a
   * Tiptap `.tiptap` stylesheet; pass any subset to override just those.
   */
  theme?: Partial<DocxTheme>;
}

export interface DocxTheme {
  /** `a { color: ... }` */
  linkColor: string;
  /** `td, th { border: 1px solid ... }` */
  tableBorderColor: string;
  /** `th { background-color: ... }` */
  tableHeaderBg: string;
  /** `pre, code { font-family: ... }` */
  codeFont: string;
  /** `pre { background: ... }` (inline `code` outside a `pre` gets no fill, matching the source CSS) */
  codeBlockBg: string;
  /**
   * `blockquote { border-left: 3px solid var(--chart-2) }` — a CSS custom
   * property can't be resolved from the stylesheet alone, so this needs a
   * concrete fallback color. Override via `theme.quoteBorderColor` to match
   * your actual `--chart-2` value.
   */
  quoteBorderColor: string;
  /** `hr { border-top: 1px solid ... }` */
  hrColor: string;
  /** `h1..h6 { font-size: ...rem }`, converted to points (1rem = 12pt @ 16px root). */
  headingSizesPt: { h1: number; h2: number; h3: number; h4: number; h5: number; h6: number };
  /** `h1, h2 { margin: 1rem 0 }` — only h1/h2 have explicit spacing in the source CSS. */
  headingSpacingTwips: { before: number; after: number };
}

const DEFAULT_THEME: DocxTheme = {
  linkColor: "3B82F6",
  tableBorderColor: "CED3D8",
  tableHeaderBg: "F1F7FD",
  codeFont: "JetBrains Mono",
  codeBlockBg: "F5F8FD",
  quoteBorderColor: "94A3B8", // fallback for unresolved var(--chart-2)
  hrColor: "D4DBE5",
  headingSizesPt: { h1: 16.8, h2: 14.4, h3: 13.2, h4: 12, h5: 12, h6: 12 },
  headingSpacingTwips: { before: 240, after: 240 }, // 1rem = 16px = 12pt = 240 twips
};

const DEFAULT_MARK_ALIASES: Record<string, string> = {
  inlineCode: "code",
  codeInline: "code",
};

/** Custom node type names this converter recognizes out of the box. */
const DEFAULT_NODE_ALIASES: Record<string, string> = {
  customImage: "image", // e.g. a resizable-image extension with its own node name
};

const DEFAULT_MAX_IMAGE_WIDTH_PX = 600;

// ---------------------------------------------------------------------------
// Conversion state threaded through the recursive walk
// ---------------------------------------------------------------------------

interface NumberingConfigEntry {
  reference: string;
  levels: ILevelsOptions[];
}

interface ConvertState {
  options: Required<
    Pick<
      ConvertOptions,
      "defaultFont" | "defaultFontSizePt" | "maxImageWidthPx"
    >
  > &
    ConvertOptions;
  theme: DocxTheme;
  numberingConfigs: NumberingConfigEntry[];
  numberingCounter: number;
  contentWidthTwips: number;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function halfPointsFromPt(pt: number): number {
  return Math.round(pt * 2);
}

function cleanHex(input: string): string {
  let hex = input.trim();
  if (hex.startsWith("#")) hex = hex.slice(1);
  const named: Record<string, string> = {
    yellow: "FFFF00",
    green: "00FF00",
    blue: "0000FF",
    red: "FF0000",
    purple: "800080",
    orange: "FFA500",
    pink: "FFC0CB",
    gray: "D3D3D3",
    grey: "D3D3D3",
    cyan: "00FFFF",
    black: "000000",
    white: "FFFFFF",
  };
  if (named[hex.toLowerCase()]) hex = named[hex.toLowerCase()];
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "FFFF00"; // fallback yellow
  return hex.toUpperCase();
}

/** Parses a CSS-ish size string ("14px", "12pt", "1.2em") into points. */
function cssSizeToPt(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  const m = value.trim().match(/^([\d.]+)\s*(px|pt|em|rem)?$/i);
  if (!m) return undefined;
  const num = parseFloat(m[1]);
  const unit = (m[2] || "pt").toLowerCase();
  if (unit === "pt") return num;
  if (unit === "px") return num * 0.75; // 96px = 72pt
  if (unit === "em" || unit === "rem") return num * 12; // assume 12pt base
  return num;
}

function nextNumberingReference(state: ConvertState, kind: "bullet" | "ordered"): string {
  state.numberingCounter += 1;
  return `${kind}-list-${state.numberingCounter}`;
}

/**
 * Converts a CSS `line-height` value (from a `lineHeight` global attribute
 * extension) into docx paragraph spacing. CSS line-height comes in three
 * flavors:
 *   - "normal" / unset → no override (Word's own default applies).
 *   - unitless multiplier ("1.5") or percentage ("150%") → relative to the
 *     font size, so docx's "auto" line rule (line = 240 * multiplier).
 *   - absolute length ("24px", "1.5em") → a fixed height regardless of font
 *     size, so docx's "atLeast" line rule (line = twentieths-of-a-point).
 */
function lineHeightToSpacing(value: unknown): { line: number; lineRule: (typeof LineRuleType)[keyof typeof LineRuleType] } | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase();
  if (!v || v === "normal") return undefined;

  const percentMatch = v.match(/^([\d.]+)%$/);
  if (percentMatch) {
    return { line: Math.round(240 * (parseFloat(percentMatch[1]) / 100)), lineRule: LineRuleType.AUTO };
  }
  const unitlessMatch = v.match(/^([\d.]+)$/);
  if (unitlessMatch) {
    return { line: Math.round(240 * parseFloat(unitlessMatch[1])), lineRule: LineRuleType.AUTO };
  }
  const emMatch = v.match(/^([\d.]+)(em|rem)$/);
  if (emMatch) {
    // Relative to font size, same as a unitless multiplier for our purposes.
    return { line: Math.round(240 * parseFloat(emMatch[1])), lineRule: LineRuleType.AUTO };
  }
  const absoluteMatch = v.match(/^([\d.]+)(px|pt)$/);
  if (absoluteMatch) {
    const pt = absoluteMatch[2] === "px" ? parseFloat(absoluteMatch[1]) * 0.75 : parseFloat(absoluteMatch[1]);
    return { line: Math.round(pt * 20), lineRule: LineRuleType.AT_LEAST };
  }
  return undefined;
}

function canonicalNodeType(type: string, state: ConvertState): string {
  return state.options.nodeAliases?.[type] ?? DEFAULT_NODE_ALIASES[type] ?? type;
}

function canonicalMarkType(type: string, state: ConvertState): string {
  return state.options.markAliases?.[type] ?? DEFAULT_MARK_ALIASES[type] ?? type;
}

const BULLET_CHARS = ["\u25CF", "\u25CB", "\u25A0", "\u2013"]; // ● ○ ■ –

function buildBulletLevels(): ILevelsOptions[] {
  return Array.from({ length: 9 }, (_, level) => ({
    level,
    format: LevelFormat.BULLET,
    text: BULLET_CHARS[level % BULLET_CHARS.length],
    alignment: AlignmentType.LEFT,
    style: {
      paragraph: {
        indent: { left: convertInchesToTwip(0.25 * (level + 1)), hanging: convertInchesToTwip(0.25) },
      },
    },
  }));
}

const ORDERED_FORMATS = [
  LevelFormat.DECIMAL,
  LevelFormat.LOWER_LETTER,
  LevelFormat.LOWER_ROMAN,
  LevelFormat.DECIMAL,
  LevelFormat.LOWER_LETTER,
  LevelFormat.LOWER_ROMAN,
  LevelFormat.DECIMAL,
  LevelFormat.LOWER_LETTER,
  LevelFormat.LOWER_ROMAN,
];

function buildOrderedLevels(start: number): ILevelsOptions[] {
  return Array.from({ length: 9 }, (_, level) => ({
    level,
    format: ORDERED_FORMATS[level],
    text: `%${level + 1}.`,
    alignment: AlignmentType.LEFT,
    start: level === 0 ? start : 1,
    style: {
      paragraph: {
        indent: { left: convertInchesToTwip(0.25 * (level + 1)), hanging: convertInchesToTwip(0.25) },
      },
    },
  }));
}

// ---------------------------------------------------------------------------
// Default image resolver (browser-native: atob + fetch, no Buffer)
//
// docx-js can only embed png/jpg/gif/bmp directly. Images pasted from
// clipboards (e.g. copied out of Word, or off a webpage) routinely arrive
// as `blob:` object URLs, or as `data:` URLs in formats docx-js can't embed
// (webp, svg). This resolver:
//   1. Fetches the raw bytes from whatever URL scheme it is (data/blob/http).
//   2. Sniffs the *actual* format from magic bytes (never trusts a claimed
//      mime type alone — clipboards routinely mislabel these).
//   3. If it's already png/jpg/gif/bmp, uses it as-is.
//   4. Otherwise (webp, svg, anything else) rasterizes it to PNG via an
//      offscreen <img> + <canvas>, which only works in a real browser.
// ---------------------------------------------------------------------------

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function fetchBytesFromUrl(src: string): Promise<{ bytes: Uint8Array; hintedMime?: string }> {
  const dataUrlMatch = src.match(/^data:([^;,]+)?(;base64)?,(.*)$/is);
  if (dataUrlMatch) {
    const [, mime, isBase64, payload] = dataUrlMatch;
    const bytes = isBase64
      ? base64ToUint8Array(payload)
      : new TextEncoder().encode(decodeURIComponent(payload));
    return { bytes, hintedMime: mime };
  }

  if (/^(https?|blob):/i.test(src)) {
    if (typeof fetch !== "function") {
      throw new Error(
        `Cannot fetch image "${src}": no global fetch available in this environment. ` +
          `Pass a custom "resolveImage" option to handle it yourself.`
      );
    }
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch image "${src}": HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || undefined;
    return { bytes, hintedMime: contentType };
  }

  // Relative ("/uploads/x.png") or protocol-relative ("//cdn.example.com/x.png")
  // URLs — common when an app serves its own uploaded images. Resolve
  // against the page origin and retry, since that's almost certainly what
  // the app author meant.
  if (typeof window !== "undefined" && window.location && !/^[a-z][a-z0-9+.-]*:/i.test(src)) {
    const absolute = new URL(src, window.location.href).toString();
    return fetchBytesFromUrl(absolute);
  }

  throw new Error(
    `Cannot resolve image src "${src}". Only data:, blob:, http(s), and relative/` +
      `protocol-relative URLs are supported by the default resolver — pass a custom ` +
      `"resolveImage" option for anything else (e.g. a file:// path or an app-specific ` +
      `asset reference).`
  );
}

type SniffedFormat = "png" | "jpg" | "gif" | "bmp" | "webp" | "svg" | "tiff" | "emf" | "wmf" | "heic" | "unknown";

/**
 * Formats that are common on OS clipboards (especially when copying out of
 * Word) but that NO browser can decode via <img>/<canvas> — there is no
 * client-side fallback for these; they need a real conversion library.
 */
const UNDECODABLE_IN_BROWSER: Partial<Record<SniffedFormat, string>> = {
  tiff: "TIFF — very common on macOS clipboards when copying images out of Word/Preview/Pages",
  emf: "EMF (Windows Enhanced Metafile) — very common on Windows clipboards when copying out of Word",
  wmf: "WMF (Windows Metafile) — same family as EMF, same cause",
  heic: "HEIC/HEIF",
};

/** Identifies the real image format from its bytes — never trusts a claimed mime type alone. */
function sniffImageFormat(bytes: Uint8Array, hintedMime?: string): SniffedFormat {
  const b = bytes;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "gif"; // "GIF"
  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) return "bmp"; // "BM"
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 && // "RIFF"
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50 // "WEBP"
  ) {
    return "webp";
  }
  // TIFF: "II*\0" (little-endian) or "MM\0*" (big-endian)
  if (b.length >= 4 && ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) ||
      (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a))) {
    return "tiff";
  }
  // WMF: standard header, or the "Aldus Placeable" wrapper some clipboards use.
  if (
    b.length >= 4 &&
    ((b[0] === 0x01 && b[1] === 0x00 && b[2] === 0x09 && b[3] === 0x00) ||
      (b[0] === 0xd7 && b[1] === 0xcd && b[2] === 0xc6 && b[3] === 0x9a))
  ) {
    return "wmf";
  }
  // EMF: record type 1, with the "EMF " signature at byte offset 40.
  if (
    b.length >= 44 &&
    b[0] === 0x01 &&
    b[1] === 0x00 &&
    b[2] === 0x00 &&
    b[3] === 0x00 &&
    b[40] === 0x20 &&
    b[41] === 0x45 &&
    b[42] === 0x4d &&
    b[43] === 0x46
  ) {
    return "emf";
  }
  // HEIC/HEIF: ISO base media file format with a heic/heif/mif1-family brand.
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = new TextDecoder("ascii").decode(b.slice(8, 12));
    if (/^(heic|heix|hevc|hevx|mif1|msf1|heim|heis|hevm|hevs)$/i.test(brand)) return "heic";
  }
  // Text-based formats: sniff the leading text for SVG/XML.
  const head = new TextDecoder("utf-8", { fatal: false }).decode(b.slice(0, 300)).trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<svg") || /^<svg[\s>]/.test(head)) return "svg";

  if (hintedMime) {
    if (/svg/i.test(hintedMime)) return "svg";
    if (/webp/i.test(hintedMime)) return "webp";
    if (/png/i.test(hintedMime)) return "png";
    if (/jpe?g/i.test(hintedMime)) return "jpg";
    if (/gif/i.test(hintedMime)) return "gif";
    if (/bmp/i.test(hintedMime)) return "bmp";
    if (/tiff?/i.test(hintedMime)) return "tiff";
    if (/heic|heif/i.test(hintedMime)) return "heic";
    if (/emf/i.test(hintedMime)) return "emf";
    if (/wmf/i.test(hintedMime)) return "wmf";
  }
  return "unknown";
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000; // avoid blowing the call stack on String.fromCharCode(...array)
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Rasterizes any browser-decodable image (webp, svg, ...) to PNG via canvas. Browser-only. */
async function rasterizeToPng(
  bytes: Uint8Array,
  hintedMime: string | undefined
): Promise<{ data: Uint8Array; width: number; height: number }> {
  if (typeof Image === "undefined" || typeof document === "undefined") {
    throw new Error(
      "This image format needs canvas-based conversion, which requires a browser environment. " +
        'Pass a custom "resolveImage" option to convert it yourself in this environment.'
    );
  }
  const mime = hintedMime && /^image\//i.test(hintedMime) ? hintedMime : "image/png";
  // A data: URL (rather than a Blob + object URL) keeps this free of any
  // Blob/URL global dependency — just Image, document, and canvas.
  const dataUrl = `data:${mime};base64,${uint8ArrayToBase64(bytes)}`;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Browser could not decode this image for conversion."));
    el.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width || 300;
  canvas.height = img.naturalHeight || img.height || 200;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable for image conversion.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const pngDataUrl = canvas.toDataURL("image/png");
  const base64 = pngDataUrl.slice(pngDataUrl.indexOf(",") + 1);
  const data = base64ToUint8Array(base64);
  return { data, width: canvas.width, height: canvas.height };
}

async function defaultResolveImage(src: string): Promise<ResolvedImage> {
  const { bytes, hintedMime } = await fetchBytesFromUrl(src);
  const format = sniffImageFormat(bytes, hintedMime);

  if (format === "png" || format === "jpg" || format === "gif" || format === "bmp") {
    const dims = readImageDimensions(bytes, format);
    return { data: bytes, width: dims.width, height: dims.height, type: format };
  }

  const undecodableReason = UNDECODABLE_IN_BROWSER[format];
  if (undecodableReason) {
    throw new Error(
      `This image is ${undecodableReason}. No browser can decode this format via <img>/canvas, ` +
        `so it can't be auto-converted like WEBP/SVG can. This usually means the paste/upload handler ` +
        `grabbed the OS clipboard's native format instead of a web-friendly one. Fix at the source: ` +
        `when reading the clipboard, prefer "image/png" (e.g. clipboardData.items — browsers typically ` +
        `offer a PNG-normalized copy alongside the native one; or with the async Clipboard API, check ` +
        `ClipboardItem.types and pick "image/png" if present). Otherwise, pass a custom "resolveImage" ` +
        `that runs this through a real conversion library (e.g. server-side with sharp/libvips, or a ` +
        `WASM decoder) before returning bytes.`
    );
  }

  // webp / svg / unknown: convert to something docx-js can actually embed.
  const raster = await rasterizeToPng(bytes, hintedMime ?? (format === "svg" ? "image/svg+xml" : undefined));
  return { data: raster.data, width: raster.width, height: raster.height, type: "png" };
}

/** Minimal PNG/JPEG/GIF/BMP dimension sniffers, built on DataView (no Node Buffer). */
function readImageDimensions(
  bytes: Uint8Array,
  type: "png" | "jpg" | "gif" | "bmp"
): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    if (type === "png") {
      // PNG: width/height are 4-byte big-endian ints at offset 16 / 20
      return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
    }
    if (type === "gif") {
      // GIF: little-endian 16-bit at offset 6 / 8
      return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
    }
    if (type === "bmp") {
      return { width: view.getInt32(18, true), height: Math.abs(view.getInt32(22, true)) };
    }
    if (type === "jpg") {
      // Walk JPEG markers looking for an SOFx segment
      let offset = 2;
      while (offset < bytes.length) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          const height = view.getUint16(offset + 5, false);
          const width = view.getUint16(offset + 7, false);
          return { width, height };
        }
        const segLength = view.getUint16(offset + 2, false);
        offset += 2 + segLength;
      }
    }
  } catch {
    // fall through to default
  }
  return { width: 300, height: 200 };
}

// ---------------------------------------------------------------------------
// Marks -> run properties
// ---------------------------------------------------------------------------

function marksToRunOptions(marks: TiptapMark[] | undefined, state: ConvertState): Partial<IRunOptions> {
  const opts: { -readonly [K in keyof IRunOptions]?: IRunOptions[K] } = {};
  if (!marks || marks.length === 0) return opts;

  for (const mark of marks) {
    switch (canonicalMarkType(mark.type, state)) {
      case "bold":
        opts.bold = true;
        break;
      case "italic":
        opts.italics = true;
        break;
      case "underline":
        opts.underline = { type: UnderlineType.SINGLE };
        break;
      case "strike":
        opts.strike = true;
        break;
      case "subscript":
        opts.subScript = true;
        break;
      case "superscript":
        opts.superScript = true;
        break;
      case "code":
        // Source CSS only sets font-family on `code` — no background outside
        // a `pre` block — so inline code gets the theme font and nothing else.
        opts.font = state.theme.codeFont;
        break;
      case "highlight": {
        const color = mark.attrs?.color ? cleanHex(String(mark.attrs.color)) : "FFFF00";
        opts.shading = { type: ShadingType.CLEAR, fill: color, color: "auto" };
        break;
      }
      case "textStyle": {
        if (mark.attrs?.color) opts.color = cleanHex(String(mark.attrs.color));
        if (mark.attrs?.fontFamily) {
          const family = String(mark.attrs.fontFamily).split(",")[0].trim().replace(/^['"]|['"]$/g, "");
          if (family) opts.font = family;
        }
        const pt = cssSizeToPt(mark.attrs?.fontSize);
        if (pt) opts.size = halfPointsFromPt(pt);
        break;
      }
      default:
        break;
    }
  }
  return opts;
}

function alignmentFromAttrs(attrs: Record<string, any> | undefined): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const align = attrs?.textAlign;
  switch (align) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "justify":
      return AlignmentType.JUSTIFIED;
    case "left":
      return AlignmentType.LEFT;
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Inline content (text / hardBreak / image-as-inline) -> ParagraphChild[]
// ---------------------------------------------------------------------------

async function convertInline(
  nodes: TiptapNode[] | undefined,
  state: ConvertState,
  extraRunOptions: Partial<IRunOptions> = {}
): Promise<ParagraphChild[]> {
  if (!nodes) return [];
  const children: ParagraphChild[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      const marks = node.marks || [];
      const linkMark = marks.find((m) => canonicalMarkType(m.type, state) === "link");
      const runOptions: IRunOptions = {
        text: node.text ?? "",
        ...extraRunOptions,
        ...marksToRunOptions(
          marks.filter((m) => canonicalMarkType(m.type, state) !== "link"),
          state
        ),
      };
      const run = new TextRun(runOptions);
      if (linkMark && linkMark.attrs?.href) {
        children.push(
          new ExternalHyperlink({
            link: String(linkMark.attrs.href),
            children: [
              new TextRun({
                ...runOptions,
                style: "Hyperlink",
                color: runOptions.color ?? state.theme.linkColor,
                underline: runOptions.underline ?? { type: UnderlineType.SINGLE },
              }),
            ],
          })
        );
      } else {
        children.push(run);
      }
    } else if (node.type === "hardBreak") {
      const isPageBreak = node.attrs?.pageBreak === true || node.attrs?.type === "page";
      children.push(isPageBreak ? new PageBreak() : new TextRun({ text: "", break: 1, ...extraRunOptions }));
    } else if (node.type === "image") {
      const run = await imageNodeToRun(node, state);
      if (run) children.push(run);
    } else if (!node.content && extractImageSrc(node)) {
      // Same custom-image-node fallback as the block-level converter.
      const run = await imageNodeToRun(node, state);
      if (run) children.push(run);
    } else if (node.content) {
      children.push(...(await convertInline(node.content, state, extraRunOptions)));
    }
  }
  return children;
}

function reportImageIssue(state: ConvertState, src: string, error: Error): void {
  if (state.options.onImageError) {
    state.options.onImageError(src, error);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[tiptapToDocx] Skipping image (${src.slice(0, 60)}): ${error.message}`);
  }
}

/** Common attr keys different Tiptap image extensions use for the URL. */
const IMAGE_SRC_ATTR_KEYS = ["src", "url", "href", "path"];
function extractImageSrc(node: TiptapNode): string | undefined {
  for (const key of IMAGE_SRC_ATTR_KEYS) {
    const value = node.attrs?.[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

/**
 * Resolves a CSS-ish width attr (from a resizable-image extension) to pixels.
 * Handles "50%" (relative to page content width), "300px"/"300", and bare
 * numbers. Returns undefined for anything else (e.g. "auto", "100%" is
 * technically valid but so common as a default that treating it as "no
 * explicit width" gives nicer results than always filling the page).
 */
function resolveExplicitWidthPx(width: unknown, contentWidthTwips: number): number | undefined {
  if (typeof width === "number") return width > 0 ? width : undefined;
  if (typeof width !== "string") return undefined;
  const v = width.trim();
  const percentMatch = v.match(/^(\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    const pct = parseFloat(percentMatch[1]);
    if (pct >= 100) return undefined; // "100%" == default sizing, not a real constraint
    const contentWidthPx = contentWidthTwips / 15;
    return Math.round((pct / 100) * contentWidthPx);
  }
  const pxMatch = v.match(/^(\d+(?:\.\d+)?)(px)?$/);
  if (pxMatch) return Math.round(parseFloat(pxMatch[1]));
  return undefined;
}

/** Maps a resizable-image extension's `attrs.alignment` to a paragraph alignment. */
function imageAlignmentFromAttrs(attrs: Record<string, any> | undefined): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (attrs?.alignment) {
    case "left":
      return AlignmentType.LEFT;
    case "right":
      return AlignmentType.RIGHT;
    default:
      return AlignmentType.CENTER;
  }
}

async function imageNodeToRun(node: TiptapNode, state: ConvertState): Promise<ImageRun | null> {
  const src = extractImageSrc(node);
  if (!src) {
    // This used to fail 100% silently (not even a console warning) — now it
    // surfaces, since a missing src is usually a sign the image node uses a
    // non-standard attrs key this converter doesn't know to check yet.
    reportImageIssue(
      state,
      "(no src found)",
      new Error(
        `Image node has no resolvable URL — checked attrs: ${IMAGE_SRC_ATTR_KEYS.join(", ")}. ` +
          `If your image extension stores the URL under a different attr, add it via the ` +
          `(currently fixed) list or open an issue / adjust extractImageSrc().`
      )
    );
    return null;
  }
  const resolver = state.options.resolveImage ?? defaultResolveImage;
  let resolved: ResolvedImage;
  try {
    resolved = await resolver(src);
  } catch (err) {
    // Degrade gracefully by default: emit nothing rather than throwing the
    // whole conversion away for one bad image. Callers can hook onImageError
    // to surface this in their UI instead of relying on the console.
    reportImageIssue(state, src, err as Error);
    return null;
  }

  const maxWidth = state.options.maxImageWidthPx;
  let { width, height } = resolved;
  const explicitWidthPx = resolveExplicitWidthPx(node.attrs?.width, state.contentWidthTwips);
  if (explicitWidthPx) {
    // An explicit width (e.g. from a resizable-image extension) always wins
    // over the natural size, but is still capped to the page's content
    // width so a stray "500%" can't blow off the page.
    const pageContentWidthPx = state.contentWidthTwips / 15;
    const targetWidth = Math.min(explicitWidthPx, pageContentWidthPx);
    height = Math.round((height * targetWidth) / width);
    width = Math.round(targetWidth);
  } else if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  return new ImageRun({
    type: resolved.type,
    data: resolved.data,
    transformation: { width, height },
    altText: node.attrs?.alt
      ? { name: node.attrs.alt, description: node.attrs.alt, title: node.attrs.alt }
      : undefined,
  });
}

// ---------------------------------------------------------------------------
// Block content -> (Paragraph | Table)[]
// ---------------------------------------------------------------------------

interface ListContext {
  reference: string;
  level: number;
}

interface BlockOpts {
  listContext?: ListContext;
  /** Left-border levels (blockquote only draws the vertical rule). */
  quoteBorderDepth?: number;
  /** Cumulative left indent (twips) from blockquotes and/or toggle content. */
  extraIndentTwips?: number;
  /** Nesting depth for collapsible <details> summaries (drives w:outlineLvl). */
  toggleDepth?: number;
  /**
   * Default alignment/run styling inherited from an enclosing table cell's
   * per-cell attrs (e.g. a custom TableCell extension's `textAlign`,
   * `textColor`, `fontSize`). Explicit attrs/marks on the node itself
   * always win over these.
   */
  cellDefaultAlignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  cellDefaultRunProps?: Partial<IRunOptions>;
}

async function convertBlocks(
  nodes: TiptapNode[] | undefined,
  state: ConvertState,
  opts: BlockOpts = {}
): Promise<(Paragraph | Table)[]> {
  if (!nodes) return [];
  const out: (Paragraph | Table)[] = [];
  for (const node of nodes) {
    out.push(...(await convertBlockNode(node, state, opts)));
  }
  return out;
}

async function convertBlockNode(
  node: TiptapNode,
  state: ConvertState,
  opts: BlockOpts
): Promise<(Paragraph | Table)[]> {
  const quoteBorderDepth = opts.quoteBorderDepth ?? 0;
  const extraIndentTwips = opts.extraIndentTwips ?? 0;
  const type = canonicalNodeType(node.type, state);

  switch (type) {
    case "paragraph": {
      const children = await convertInline(node.content, state, opts.cellDefaultRunProps);
      return [
        new Paragraph({
          children: children.length ? children : [new TextRun("")],
          alignment: alignmentFromAttrs(node.attrs) ?? opts.cellDefaultAlignment,
          pageBreakBefore: node.attrs?.pageBreakBefore === true,
          spacing: lineHeightToSpacing(node.attrs?.lineHeight),
          numbering: opts.listContext
            ? { reference: opts.listContext.reference, level: opts.listContext.level }
            : undefined,
          indent: extraIndentTwips ? { left: extraIndentTwips } : undefined,
          border: quoteBorderDepth
            ? {
                left: { style: BorderStyle.SINGLE, size: 12, color: state.theme.quoteBorderColor, space: 8 },
              }
            : undefined,
        }),
      ];
    }

    case "heading": {
      const level: number = node.attrs?.level ?? 1;
      const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6,
      };
      const children = await convertInline(node.content, state, opts.cellDefaultRunProps);
      return [
        new Paragraph({
          heading: headingMap[level] ?? HeadingLevel.HEADING_1,
          alignment: alignmentFromAttrs(node.attrs) ?? opts.cellDefaultAlignment,
          pageBreakBefore: node.attrs?.pageBreakBefore === true,
          spacing: lineHeightToSpacing(node.attrs?.lineHeight),
          children: children.length ? children : [new TextRun("")],
        }),
      ];
    }

    case "bulletList":
    case "orderedList": {
      const isOrdered = type === "orderedList";
      const reference = nextNumberingReference(state, isOrdered ? "ordered" : "bullet");
      const start = isOrdered ? node.attrs?.start ?? 1 : 1;
      state.numberingConfigs.push({
        reference,
        levels: isOrdered ? buildOrderedLevels(start) : buildBulletLevels(),
      });
      const level = opts.listContext ? opts.listContext.level + 1 : 0;
      const items = await convertBlocks(node.content, state, {
        ...opts,
        listContext: { reference, level },
      });
      return items;
    }

    case "taskItem":
    case "listItem": {
      const result: (Paragraph | Table)[] = [];
      const contentNodes = node.content ?? [];
      let firstParagraphConsumed = false;
      const checked = type === "taskItem" ? Boolean(node.attrs?.checked) : undefined;

      for (const child of contentNodes) {
        if (!firstParagraphConsumed && canonicalNodeType(child.type, state) === "paragraph") {
          firstParagraphConsumed = true;
          const inlineChildren = await convertInline(child.content, state);
          const prefix = checked !== undefined ? [new TextRun(checked ? "\u2611 " : "\u2610 ")] : [];
          result.push(
            new Paragraph({
              children: [...prefix, ...(inlineChildren.length ? inlineChildren : [new TextRun("")])],
              alignment: alignmentFromAttrs(child.attrs),
              numbering: opts.listContext
                ? { reference: opts.listContext.reference, level: opts.listContext.level }
                : undefined,
            })
          );
        } else {
          // Nested lists / additional paragraphs inside the list item.
          result.push(...(await convertBlockNode(child, state, opts)));
        }
      }
      return result;
    }

    case "taskList": {
      // Treat like a bullet list but items render their own checkbox glyph.
      const reference = nextNumberingReference(state, "bullet");
      state.numberingConfigs.push({ reference, levels: buildBulletLevels() });
      const level = opts.listContext ? opts.listContext.level + 1 : 0;
      return convertBlocks(node.content, state, { ...opts, listContext: { reference, level } });
    }

    case "blockquote": {
      return convertBlocks(node.content, state, {
        ...opts,
        quoteBorderDepth: quoteBorderDepth + 1,
        extraIndentTwips: extraIndentTwips + convertInchesToTwip(0.5),
      });
    }

    case "details": {
      return convertDetails(node, state, opts);
    }


    case "codeBlock": {
      const text = (node.content ?? []).map((n) => n.text ?? "").join("");
      const lines = text.split("\n");
      const runs: ParagraphChild[] = [];
      lines.forEach((line, i) => {
        runs.push(
          new TextRun({
            text: line,
            font: state.theme.codeFont,
            size: halfPointsFromPt(9.6), // source CSS: `pre code { font-size: 0.8rem }` (0.8 * 12pt)
            break: i === 0 ? undefined : 1,
          })
        );
      });
      return [
        new Paragraph({
          children: runs.length ? runs : [new TextRun({ text: "", font: state.theme.codeFont })],
          // Source CSS gives `pre` a background + border-radius but no border —
          // docx paragraphs can't do rounded corners, so this is fill-only.
          shading: { type: ShadingType.CLEAR, fill: state.theme.codeBlockBg, color: "auto" },
          spacing: { before: 120, after: 120 },
        }),
      ];
    }

    case "horizontalRule": {
      return [
        new Paragraph({
          children: [new TextRun("")],
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: state.theme.hrColor, space: 1 },
          },
        }),
      ];
    }

    case "pageBreak": {
      // PageBreak must live inside a Paragraph.
      return [new Paragraph({ children: [new PageBreak()] })];
    }

    case "image": {
      const run = await imageNodeToRun(node, state);
      return [new Paragraph({ children: run ? [run] : [], alignment: imageAlignmentFromAttrs(node.attrs) })];
    }

    case "verticalAlign": {
      // A wrapping block node whose vertical alignment only really means
      // something inside a table cell — convertTable() special-cases it
      // there (unwrapping it and setting the cell's own verticalAlign).
      // Reached here, it's in normal document flow, where Word has no
      // equivalent to CSS vertical centering of a block — so just unwrap
      // and render its content normally.
      return convertBlocks(node.content, state, opts);
    }

    case "columnBlock": {
      // Two (or more) side-by-side "column" children, roughly a CSS grid
      // in the source editor. Word has no CSS-grid equivalent, but a
      // borderless single-row table with one column per child fakes a
      // side-by-side layout well.
      const columnNodes = (node.content ?? []).filter((n) => canonicalNodeType(n.type, state) === "column");
      if (columnNodes.length === 0) return [];

      const columnCount = columnNodes.length;
      const evenWidth = Math.floor(state.contentWidthTwips / columnCount);
      const cells: TableCell[] = [];
      for (const columnNode of columnNodes) {
        const cellChildren = await convertBlocks(columnNode.content, state, opts);
        cells.push(
          new TableCell({
            children: cellChildren.length ? cellChildren : [new Paragraph({ children: [] })],
            width: { size: evenWidth, type: WidthType.DXA },
          })
        );
      }
      return [
        new Table({
          rows: [new TableRow({ children: cells })],
          width: { size: evenWidth * columnCount, type: WidthType.DXA },
          columnWidths: new Array(columnCount).fill(evenWidth),
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
          },
        }),
      ];
    }

    case "column": {
      // Only reached if a "column" node somehow appears outside a
      // "columnBlock" — normally columnBlock consumes its children directly.
      return convertBlocks(node.content, state, opts);
    }

    case "table": {
      return [await convertTable(node, state)];
    }

    default: {
      // Unknown node type. If it looks like an image (has a resolvable URL
      // attr, and no block content of its own — images are leaf nodes),
      // treat it as one automatically. This covers custom/resizable image
      // extensions that use a node type name other than "image" (e.g.
      // "imageBlock", "resizableImage", "figure") without needing
      // nodeAliases configured for them.
      if (!node.content && extractImageSrc(node)) {
        const run = await imageNodeToRun(node, state);
        return [new Paragraph({ children: run ? [run] : [], alignment: imageAlignmentFromAttrs(node.attrs) })];
      }
      // Otherwise: try to render any inline text it might carry, then
      // recurse into children so we never silently drop content.
      if (node.text) {
        return [new Paragraph({ children: [new TextRun(node.text)] })];
      }
      if (node.content) {
        return convertBlocks(node.content, state, opts);
      }
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// Collapsible <details>/<summary> ("toggle") blocks
// ---------------------------------------------------------------------------
//
// Word has no native <details> equivalent, but any paragraph carrying
// w:outlineLvl gets a collapse/expand chevron in the editor (the same
// mechanism behind "collapsible headings"), and everything that follows
// at a *deeper* outline level collapses underneath it. We use that: the
// summary becomes a bold paragraph with an explicit outline level, and the
// content is indented and left un-leveled (i.e. plain body text), so it
// folds under the summary above it. Nested <details> get progressively
// deeper outline levels, so collapsing an outer toggle also hides any
// inner ones, matching real toggle-list semantics.
async function convertDetails(
  node: TiptapNode,
  state: ConvertState,
  opts: BlockOpts
): Promise<(Paragraph | Table)[]> {
  const children = node.content ?? [];
  const summaryNode = children.find((n) => canonicalNodeType(n.type, state) === "detailsSummary");
  const contentNode = children.find((n) => canonicalNodeType(n.type, state) === "detailsContent");

  const depth = opts.toggleDepth ?? 0;
  const isOpen = node.attrs?.open !== false; // Tiptap defaults details to open
  const arrow = isOpen ? "\u25BC" : "\u25B6";

  const summaryInline = summaryNode
    ? await convertInline(summaryNode.content, state, { bold: true })
    : [new TextRun({ text: "", bold: true })];

  const summaryParagraph = new Paragraph({
    outlineLevel: Math.min(depth, 8),
    indent: (opts.extraIndentTwips ?? 0) ? { left: opts.extraIndentTwips } : undefined,
    children: [new TextRun({ text: `${arrow} `, bold: true }), ...summaryInline],
  });

  const contentBlocks = contentNode
    ? await convertBlocks(contentNode.content, state, {
        ...opts,
        toggleDepth: depth + 1,
        extraIndentTwips: (opts.extraIndentTwips ?? 0) + convertInchesToTwip(0.3),
      })
    : [];

  return [summaryParagraph, ...contentBlocks];
}

// ---------------------------------------------------------------------------
// Tables (with colSpan / rowSpan support)
// ---------------------------------------------------------------------------

interface PendingCell {
  node: TiptapNode;
  colSpan: number;
  rowSpan: number;
}

async function convertTable(tableNode: TiptapNode, state: ConvertState): Promise<Table> {
  const rowNodes = (tableNode.content ?? []).filter((n) => n.type === "tableRow");

  // Determine column count from the widest row (accounting for colspan).
  let columnCount = 0;
  for (const row of rowNodes) {
    const count = (row.content ?? []).reduce((sum, cell) => sum + (cell.attrs?.colspan ?? 1), 0);
    columnCount = Math.max(columnCount, count);
  }
  columnCount = Math.max(columnCount, 1);

  // Column widths: prefer explicit colwidth (px) from the first row that has them.
  const colWidthsPx: number[] = new Array(columnCount).fill(0);
  for (const row of rowNodes) {
    let col = 0;
    for (const cell of row.content ?? []) {
      const span = cell.attrs?.colspan ?? 1;
      const widths: number[] | undefined = cell.attrs?.colwidth;
      if (widths) {
        for (let i = 0; i < span; i++) {
          if (widths[i]) colWidthsPx[col + i] = widths[i];
        }
      }
      col += span;
    }
  }
  const PX_TO_TWIP = 15; // 96px/in * 15 = 1440 twip/in
  const anyExplicit = colWidthsPx.some((w) => w > 0);
  let columnWidthsTwip: number[];
  if (anyExplicit) {
    const fallback = Math.round(state.contentWidthTwips / columnCount);
    columnWidthsTwip = colWidthsPx.map((w) => (w > 0 ? Math.round(w * PX_TO_TWIP) : fallback));
  } else {
    const even = Math.floor(state.contentWidthTwips / columnCount);
    columnWidthsTwip = new Array(columnCount).fill(even);
  }
  const tableWidthTwip = columnWidthsTwip.reduce((a, b) => a + b, 0);

  // `td, th { padding: 2px 5px }` → twips (15 twips per CSS px).
  const cellMargins = { top: 30, bottom: 30, left: 75, right: 75 };
  const tableBorder = { style: BorderStyle.SINGLE, size: 4, color: state.theme.tableBorderColor };

  // rowSpanCarry[col] = remaining rows (including current) this column is still merged for.
  const rowSpanCarry: number[] = new Array(columnCount).fill(0);
  const rows: TableRow[] = [];

  for (const rowNode of rowNodes) {
    const cellsInSource: PendingCell[] = (rowNode.content ?? [])
      .filter((n) => n.type === "tableCell" || n.type === "tableHeader")
      .map((n) => ({
        node: n,
        colSpan: n.attrs?.colspan ?? 1,
        rowSpan: n.attrs?.rowspan ?? 1,
      }));

    const tableCells: TableCell[] = [];
    let col = 0;
    let sourceIdx = 0;

    while (col < columnCount) {
      if (rowSpanCarry[col] > 0) {
        // This column is occupied by a vertical merge continuing from above.
        const width = columnWidthsTwip[col];
        tableCells.push(
          new TableCell({
            children: [new Paragraph({ children: [] })],
            verticalMerge: VerticalMergeType.CONTINUE,
            width: { size: width, type: WidthType.DXA },
            margins: cellMargins,
          })
        );
        rowSpanCarry[col] -= 1;
        col += 1;
        continue;
      }

      const pending = cellsInSource[sourceIdx];
      if (!pending) {
        // No more source cells for this row; pad remaining columns empty.
        tableCells.push(
          new TableCell({
            children: [new Paragraph({ children: [] })],
            width: { size: columnWidthsTwip[col], type: WidthType.DXA },
            margins: cellMargins,
          })
        );
        col += 1;
        continue;
      }
      sourceIdx += 1;

      const span = Math.min(pending.colSpan, columnCount - col);
      const width = columnWidthsTwip.slice(col, col + span).reduce((a, b) => a + b, 0);
      const isHeader = pending.node.type === "tableHeader";
      const bg = pending.node.attrs?.backgroundColor;

      // custom-table-cell.ts adds textColor/textAlign/fontSize per cell —
      // thread these down as defaults for any paragraph/run inside that
      // doesn't already specify its own (explicit marks/attrs still win).
      const cellDefaultAlignment = alignmentFromAttrs({ textAlign: pending.node.attrs?.textAlign });
      const cellRunProps: { -readonly [K in keyof IRunOptions]?: IRunOptions[K] } = {};
      if (pending.node.attrs?.textColor) cellRunProps.color = cleanHex(String(pending.node.attrs.textColor));
      const cellFontPt = cssSizeToPt(pending.node.attrs?.fontSize);
      if (cellFontPt) cellRunProps.size = halfPointsFromPt(cellFontPt);

      // A vertical-align wrapper extension often wraps the *entire* cell
      // content to center/bottom-align it — unwrap that one level and set
      // the cell's real vertical alignment instead of rendering it as a
      // nested block (which docx has no visual equivalent for anyway).
      let cellContent = pending.node.content ?? [];
      let verticalAlign: (typeof VerticalAlignTable)[keyof typeof VerticalAlignTable] | undefined;
      if (cellContent.length === 1 && canonicalNodeType(cellContent[0].type, state) === "verticalAlign") {
        const wrapper = cellContent[0];
        verticalAlign =
          wrapper.attrs?.alignment === "middle"
            ? VerticalAlignTable.CENTER
            : wrapper.attrs?.alignment === "bottom"
            ? VerticalAlignTable.BOTTOM
            : VerticalAlignTable.TOP;
        cellContent = wrapper.content ?? [];
      }

      const cellChildren = await convertBlocks(cellContent, state, {
        cellDefaultAlignment,
        cellDefaultRunProps: Object.keys(cellRunProps).length ? cellRunProps : undefined,
      });

      tableCells.push(
        new TableCell({
          children: cellChildren.length ? cellChildren : [new Paragraph({ children: [] })],
          width: { size: width, type: WidthType.DXA },
          columnSpan: span > 1 ? span : undefined,
          verticalMerge: pending.rowSpan > 1 ? VerticalMergeType.RESTART : undefined,
          verticalAlign,
          margins: cellMargins,
          shading: bg
            ? { type: ShadingType.CLEAR, fill: cleanHex(String(bg)), color: "auto" }
            : isHeader
            ? { type: ShadingType.CLEAR, fill: state.theme.tableHeaderBg, color: "auto" }
            : undefined,
        })
      );

      if (pending.rowSpan > 1) {
        for (let i = 0; i < span; i++) rowSpanCarry[col + i] = pending.rowSpan - 1;
      }
      col += span;
    }

    rows.push(new TableRow({ children: tableCells }));
  }

  return new Table({
    rows,
    width: { size: tableWidthTwip, type: WidthType.DXA },
    columnWidths: columnWidthsTwip,
    borders: {
      top: tableBorder,
      bottom: tableBorder,
      left: tableBorder,
      right: tableBorder,
      insideHorizontal: tableBorder,
      insideVertical: tableBorder,
    },
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const LETTER = { width: 12240, height: 15840 }; // DXA
const A4 = { width: 11906, height: 16838 }; // DXA

async function buildDocxDocument(doc: TiptapDocument, options: ConvertOptions): Promise<Document> {
  const marginInches = options.marginInches ?? 1;
  const marginTwip = convertInchesToTwip(marginInches);
  const pageSize = options.pageSize === "A4" ? A4 : LETTER;
  const contentWidthTwips = pageSize.width - marginTwip * 2;

  const state: ConvertState = {
    options: {
      defaultFont: options.defaultFont ?? "Calibri",
      defaultFontSizePt: options.defaultFontSizePt ?? 11,
      maxImageWidthPx: options.maxImageWidthPx ?? DEFAULT_MAX_IMAGE_WIDTH_PX,
      ...options,
    },
    theme: { ...DEFAULT_THEME, ...options.theme },
    numberingConfigs: [],
    numberingCounter: 0,
    contentWidthTwips,
  };

  const body = await convertBlocks(doc.content, state, {});

  const { headingSizesPt, headingSpacingTwips } = state.theme;
  const headingStyle = (id: string, name: string, sizePt: number, spacing?: { before: number; after: number }) => ({
    id,
    name,
    basedOn: "Normal",
    next: "Normal",
    quickFormat: true,
    run: {
      // Source CSS doesn't set a heading color, so this intentionally
      // overrides Word's default blue Heading styles back to plain text.
      bold: true,
      color: "000000",
      size: halfPointsFromPt(sizePt),
      font: state.options.defaultFont,
    },
    paragraph: spacing ? { spacing: { before: spacing.before, after: spacing.after } } : undefined,
  });

  return new Document({
    numbering: state.numberingConfigs.length ? { config: state.numberingConfigs } : undefined,
    styles: {
      default: {
        document: {
          run: {
            font: state.options.defaultFont,
            size: halfPointsFromPt(state.options.defaultFontSizePt),
          },
        },
      },
      paragraphStyles: [
        // Source CSS: h1, h2 { margin: 1rem 0 } — h3-6 have no explicit
        // margin override, so they fall back to Word's own defaults.
        headingStyle("Heading1", "Heading 1", headingSizesPt.h1, headingSpacingTwips),
        headingStyle("Heading2", "Heading 2", headingSizesPt.h2, headingSpacingTwips),
        headingStyle("Heading3", "Heading 3", headingSizesPt.h3),
        headingStyle("Heading4", "Heading 4", headingSizesPt.h4),
        headingStyle("Heading5", "Heading 5", headingSizesPt.h5),
        headingStyle("Heading6", "Heading 6", headingSizesPt.h6),
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              // docx-js swaps width/height internally for landscape, so we
              // always pass the *portrait* dimensions here.
              width: pageSize.width,
              height: pageSize.height,
              orientation:
                options.orientation === "landscape" ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: {
              top: marginTwip,
              bottom: marginTwip,
              left: marginTwip,
              right: marginTwip,
            },
          },
        },
        children: body,
      },
    ],
  });
}

/**
 * Converts Tiptap JSON into a real .docx file, returned as a browser `Blob`
 * — ready to hand to `URL.createObjectURL` or a `<a download>` link. This is
 * the entry point for frontend-only usage (no Node, no server round-trip).
 */
export async function tiptapToDocx(doc: TiptapDocument, options: ConvertOptions = {}): Promise<Blob> {
  const docxDocument = await buildDocxDocument(doc, options);
  return Packer.toBlob(docxDocument);
}

/**
 * Convenience one-liner for the browser: converts and immediately triggers
 * a file download via a throwaway <a> element + object URL.
 *
 *   await downloadDocx(tiptapJson, "my-document.docx");
 */
export async function downloadDocx(
  doc: TiptapDocument,
  filename: string = "document.docx",
  options: ConvertOptions = {}
): Promise<void> {
  const blob = await tiptapToDocx(doc, options);
  const url = URL.createObjectURL(blob);
  try {
    const link = window.document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  } finally {
    // Give the download a tick to start before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export default tiptapToDocx;