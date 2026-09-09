/**
 * tiptapToPdf.ts
 * ----------------------------------------------------------------------------
 * Converts a Tiptap / ProseMirror JSON document into a real, working .pdf
 * file using pdfmake — entirely in the browser, no server round-trip.
 *
 * Sibling to tiptapToDocx.ts: same node/mark coverage and theme system,
 * adapted to pdfmake's declarative content-tree model.
 *
 * ----------------------------------------------------------------------------
 */

import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import courierFont from "pdfmake/build/standard-fonts/Courier";
import helveticaFont from "pdfmake/build/standard-fonts/Helvetica";
import timesFont from "pdfmake/build/standard-fonts/Times";

import type {
  Content,
  ContentImage,
  ContentTable,
  ContentText,
  CustomTableLayout,
  Style,
  Table,
  TableCell,
  TDocumentDefinitions,
  TFontContainer,
} from "pdfmake/interfaces";

// ---------------------------------------------------------------------------
// Font registration
// ---------------------------------------------------------------------------

let fontsRegistered = false;

/**
 * Registers pdfmake fonts exactly once per session.
 */
function ensureFontsRegistered(
  customFonts?: TFontContainer[]
): void {
  if (!fontsRegistered) {
    pdfMake.addVirtualFileSystem(
      pdfFonts as unknown as Record<string, string>
    );

    pdfMake.addFontContainer(
      courierFont as unknown as TFontContainer
    );

    pdfMake.addFontContainer(
      helveticaFont as unknown as TFontContainer
    );

    pdfMake.addFontContainer(
      timesFont as unknown as TFontContainer
    );

    fontsRegistered = true;
  }

  for (const container of customFonts ?? []) {
    pdfMake.addFontContainer(container);
  }
}

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
  /**
   * Raw bytes for png/jpg or a raw SVG string for svg.
   */
  data: Uint8Array | string;

  width: number;
  height: number;

  type: "png" | "jpg" | "svg";
}

export interface ConvertOptions {
  /**
   * "LETTER" (US) or "A4".
   * Default: "A4".
   */
  pageSize?: "LETTER" | "A4";

  orientation?: "portrait" | "landscape";

  /**
   * Page margins in inches on all sides.
   * Default: 1.
   */
  marginInches?: number;

  /**
   * Default: "Roboto".
   */
  defaultFont?: string;

  /**
   * Default: 11pt.
   */
  defaultFontSizePt?: number;

  /**
   * Extra embedded fonts beyond Roboto/Courier/Helvetica/Times.
   */
  customFonts?: TFontContainer[];

  resolveImage?: (
    src: string
  ) => Promise<ResolvedImage>;

  maxImageWidthPt?: number;

  onImageError?: (
    src: string,
    error: Error
  ) => void;

  nodeAliases?: Record<string, string>;

  markAliases?: Record<string, string>;

  theme?: Partial<DocxLikeTheme>;
}

/**
 * Named DocxLikeTheme to make clear this mirrors tiptapToDocx's theme shape.
 */
export interface DocxLikeTheme {
  linkColor: string;
  tableBorderColor: string;
  tableHeaderBg: string;
  codeFont: string;
  codeBlockBg: string;
  quoteBorderColor: string;
  hrColor: string;

  headingSizesPt: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
  };

  headingSpacingPt: {
    before: number;
    after: number;
  };

  tableMarginPt: {
    before: number;
    after: number;
  };
}

const DEFAULT_THEME: DocxLikeTheme = {
  linkColor: "#3B82F6",
  tableBorderColor: "#CED3D8",
  tableHeaderBg: "#F1F7FD",
  codeFont: "Courier",
  codeBlockBg: "#F5F8FD",
  quoteBorderColor: "#94A3B8",
  hrColor: "#D4DBE5",

  headingSizesPt: {
    h1: 16.8,
    h2: 14.4,
    h3: 13.2,
    h4: 12,
    h5: 12,
    h6: 12,
  },

  headingSpacingPt: {
    before: 12,
    after: 12,
  },

  tableMarginPt: {
    before: 18,
    after: 18,
  },
};

const DEFAULT_MARK_ALIASES: Record<string, string> = {
  inlineCode: "code",
  codeInline: "code",
};

const DEFAULT_NODE_ALIASES: Record<string, string> = {
  customImage: "image",
};

const DEFAULT_MAX_IMAGE_WIDTH_PT = 450;

// ---------------------------------------------------------------------------
// Conversion state
// ---------------------------------------------------------------------------

interface ConvertState {
  options: Required<
    Pick<
      ConvertOptions,
      "defaultFont" |
      "defaultFontSizePt" |
      "maxImageWidthPt"
    >
  > &
    ConvertOptions;

  theme: DocxLikeTheme;

  contentWidthPt: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function canonicalNodeType(
  type: string,
  state: ConvertState
): string {
  return (
    state.options.nodeAliases?.[type] ??
    DEFAULT_NODE_ALIASES[type] ??
    type
  );
}

function canonicalMarkType(
  type: string,
  state: ConvertState
): string {
  return (
    state.options.markAliases?.[type] ??
    DEFAULT_MARK_ALIASES[type] ??
    type
  );
}

function cleanHex(input: string): string {
  let hex = input.trim();

  if (hex.startsWith("#")) {
    hex = hex.slice(1);
  }

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

  if (named[hex.toLowerCase()]) {
    hex = named[hex.toLowerCase()];
  }

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return "#FFFF00";
  }

  return `#${hex.toUpperCase()}`;
}

/**
 * Parses CSS-ish size strings into points.
 */
function cssSizeToPt(
  value: unknown
): number | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const m = value
    .trim()
    .match(/^([\d.]+)\s*(px|pt|em|rem)?$/i);

  if (!m) {
    return undefined;
  }

  const num = parseFloat(m[1]);
  const unit = (m[2] || "pt").toLowerCase();

  if (unit === "pt") {
    return num;
  }

  if (unit === "px") {
    return num * 0.75;
  }

  if (unit === "em" || unit === "rem") {
    return num * 12;
  }

  return num;
}

/**
 * CSS line-height -> pdfmake lineHeight factor.
 */
function lineHeightToFactor(
  value: unknown,
  baseFontSizePt: number
): number | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const v = value.trim().toLowerCase();

  if (!v || v === "normal") {
    return undefined;
  }

  const percentMatch = v.match(/^([\d.]+)%$/);

  if (percentMatch) {
    return parseFloat(percentMatch[1]) / 100;
  }

  const unitlessMatch = v.match(/^([\d.]+)$/);

  if (unitlessMatch) {
    return parseFloat(unitlessMatch[1]);
  }

  const emMatch = v.match(/^([\d.]+)(em|rem)$/);

  if (emMatch) {
    return parseFloat(emMatch[1]);
  }

  const absoluteMatch = v.match(/^([\d.]+)(px|pt)$/);

  if (absoluteMatch) {
    const pt =
      absoluteMatch[2] === "px"
        ? parseFloat(absoluteMatch[1]) * 0.75
        : parseFloat(absoluteMatch[1]);

    return pt / baseFontSizePt;
  }

  return undefined;
}

/**
 * Reads text alignment from Tiptap node attributes.
 *
 * Tiptap documents may use:
 * - textAlign
 * - align
 * - alignment
 * - textAlignment
 */
function alignmentFromAttrs(
  attrs: Record<string, any> | undefined
): Style["alignment"] | undefined {
  const value =
    attrs?.textAlign ??
    attrs?.align ??
    attrs?.alignment ??
    attrs?.textAlignment;

  switch (value) {
    case "center":
      return "center";

    case "right":
      return "right";

    case "justify":
      return "justify";

    case "left":
      return "left";

    default:
      return undefined;
  }
}

function imageAlignmentFromAttrs(
  attrs: Record<string, any> | undefined
): Style["alignment"] {
  switch (attrs?.alignment) {
    case "left":
      return "left";

    case "right":
      return "right";

    default:
      return "center";
  }
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

function checkboxShape(
  checked: boolean
): Content {
  return {
    canvas: [
      {
        type: "rect",
        x: 1,
        y: 1,
        w: 9,
        h: 9,
        r: 1,
        lineWidth: 1,
        lineColor: "#555555",
        color: checked ? "#3B82F6" : undefined,
      },

      ...(checked
        ? [
            {
              type: "polyline" as const,
              lineWidth: 1.4,
              closePath: false,
              lineColor: "#FFFFFF",
              points: [
                { x: 2.7, y: 5.4 },
                { x: 4.3, y: 7.2 },
                { x: 7.6, y: 2.8 },
              ],
            },
          ]
        : []),
    ],
  };
}

function triangleShape(
  pointingDown: boolean
): Content {
  const points = pointingDown
    ? [
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        { x: 4, y: 7 },
      ]
    : [
        { x: 0, y: 0 },
        { x: 7, y: 4 },
        { x: 0, y: 8 },
      ];

  return {
    canvas: [
      {
        type: "polyline",
        closePath: true,
        color: "#333333",
        lineColor: "#333333",
        points,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Image resolution
// ---------------------------------------------------------------------------

function base64ToUint8Array(
  base64: string
): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function uint8ArrayToBase64(
  bytes: Uint8Array
): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }

  return btoa(binary);
}

async function fetchBytesFromUrl(
  src: string
): Promise<{
  bytes: Uint8Array;
  hintedMime?: string;
}> {
  const dataUrlMatch = src.match(
    /^data:([^;,]+)?(;base64)?,(.*)$/is
  );

  if (dataUrlMatch) {
    const [
      ,
      mime,
      isBase64,
      payload,
    ] = dataUrlMatch;

    const bytes = isBase64
      ? base64ToUint8Array(payload)
      : new TextEncoder().encode(
          decodeURIComponent(payload)
        );

    return {
      bytes,
      hintedMime: mime,
    };
  }

  if (/^(https?|blob):/i.test(src)) {
    if (typeof fetch !== "function") {
      throw new Error(
        `Cannot fetch image "${src}": no global fetch available. Pass a custom "resolveImage" option.`
      );
    }

    const res = await fetch(src);

    if (!res.ok) {
      throw new Error(
        `Failed to fetch image "${src}": HTTP ${res.status}`
      );
    }

    return {
      bytes: new Uint8Array(
        await res.arrayBuffer()
      ),
      hintedMime:
        res.headers.get("content-type") ||
        undefined,
    };
  }

  if (
    typeof window !== "undefined" &&
    window.location &&
    !/^[a-z][a-z0-9+.-]*:/i.test(src)
  ) {
    return fetchBytesFromUrl(
      new URL(
        src,
        window.location.href
      ).toString()
    );
  }

  throw new Error(
    `Cannot resolve image src "${src}". Only data:, blob:, http(s), and relative URLs are supported by the default resolver — pass a custom "resolveImage" option for anything else.`
  );
}

type SniffedFormat =
  | "png"
  | "jpg"
  | "gif"
  | "bmp"
  | "webp"
  | "svg"
  | "tiff"
  | "emf"
  | "wmf"
  | "heic"
  | "unknown";

const UNDECODABLE_IN_BROWSER: Partial<
  Record<SniffedFormat, string>
> = {
  tiff:
    "TIFF — very common on macOS clipboards when copying images out of Word/Preview/Pages",

  emf:
    "EMF (Windows Enhanced Metafile) — very common on Windows clipboards when copying out of Word",

  wmf:
    "WMF (Windows Metafile) — same family as EMF, same cause",

  heic:
    "HEIC/HEIF",
};

function sniffImageFormat(
  bytes: Uint8Array,
  hintedMime?: string
): SniffedFormat {
  const b = bytes;

  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47
  ) {
    return "png";
  }

  if (
    b.length >= 3 &&
    b[0] === 0xff &&
    b[1] === 0xd8 &&
    b[2] === 0xff
  ) {
    return "jpg";
  }

  if (
    b.length >= 6 &&
    b[0] === 0x47 &&
    b[1] === 0x49 &&
    b[2] === 0x46
  ) {
    return "gif";
  }

  if (
    b.length >= 2 &&
    b[0] === 0x42 &&
    b[1] === 0x4d
  ) {
    return "bmp";
  }

  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "webp";
  }

  if (
    b.length >= 4 &&
    (
      (
        b[0] === 0x49 &&
        b[1] === 0x49 &&
        b[2] === 0x2a &&
        b[3] === 0x00
      ) ||
      (
        b[0] === 0x4d &&
        b[1] === 0x4d &&
        b[2] === 0x00 &&
        b[3] === 0x2a
      )
    )
  ) {
    return "tiff";
  }

  if (
    b.length >= 4 &&
    (
      (
        b[0] === 0x01 &&
        b[1] === 0x00 &&
        b[2] === 0x09 &&
        b[3] === 0x00
      ) ||
      (
        b[0] === 0xd7 &&
        b[1] === 0xcd &&
        b[2] === 0xc6 &&
        b[3] === 0x9a
      )
    )
  ) {
    return "wmf";
  }

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

  if (
    b.length >= 12 &&
    b[4] === 0x66 &&
    b[5] === 0x74 &&
    b[6] === 0x79 &&
    b[7] === 0x70
  ) {
    const brand = new TextDecoder(
      "ascii"
    ).decode(
      b.slice(8, 12)
    );

    if (
      /^(heic|heix|hevc|hevx|mif1|msf1|heim|heis|hevm|hevs)$/i.test(
        brand
      )
    ) {
      return "heic";
    }
  }

  const head = new TextDecoder(
    "utf-8",
    { fatal: false }
  )
    .decode(b.slice(0, 300))
    .trimStart();

  if (
    head.startsWith("<?xml") ||
    head.startsWith("<svg") ||
    /^<svg[\s>]/.test(head)
  ) {
    return "svg";
  }

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

function readImageDimensions(
  bytes: Uint8Array,
  type: "png" | "jpg"
): {
  width: number;
  height: number;
} {
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  );

  try {
    if (type === "png") {
      return {
        width: view.getUint32(16, false),
        height: view.getUint32(20, false),
      };
    }

    let offset = 2;

    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        break;
      }

      const marker = bytes[offset + 1];

      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return {
          width: view.getUint16(
            offset + 7,
            false
          ),
          height: view.getUint16(
            offset + 5,
            false
          ),
        };
      }

      offset +=
        2 +
        view.getUint16(
          offset + 2,
          false
        );
    }
  } catch {
    // Fall through.
  }

  return {
    width: 300,
    height: 200,
  };
}

async function rasterizeToPng(
  bytes: Uint8Array,
  hintedMime: string | undefined
): Promise<{
  data: Uint8Array;
  width: number;
  height: number;
}> {
  if (
    typeof Image === "undefined" ||
    typeof document === "undefined"
  ) {
    throw new Error(
      "This image format needs canvas-based conversion, which requires a browser environment. Pass a custom \"resolveImage\" option to convert it yourself in this environment."
    );
  }

  const mime =
    hintedMime &&
    /^image\//i.test(hintedMime)
      ? hintedMime
      : "image/png";

  const dataUrl =
    `data:${mime};base64,` +
    uint8ArrayToBase64(bytes);

  const img =
    await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const el = new Image();

        el.onload = () => resolve(el);

        el.onerror = () =>
          reject(
            new Error(
              "Browser could not decode this image for conversion."
            )
          );

        el.src = dataUrl;
      }
    );

  const canvas =
    document.createElement("canvas");

  canvas.width =
    img.naturalWidth ||
    img.width ||
    300;

  canvas.height =
    img.naturalHeight ||
    img.height ||
    200;

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "2D canvas context unavailable for image conversion."
    );
  }

  ctx.drawImage(
    img,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const pngDataUrl =
    canvas.toDataURL("image/png");

  const data =
    base64ToUint8Array(
      pngDataUrl.slice(
        pngDataUrl.indexOf(",") + 1
      )
    );

  return {
    data,
    width: canvas.width,
    height: canvas.height,
  };
}

async function defaultResolveImage(
  src: string
): Promise<ResolvedImage> {
  const {
    bytes,
    hintedMime,
  } =
    await fetchBytesFromUrl(src);

  const format =
    sniffImageFormat(
      bytes,
      hintedMime
    );

  if (
    format === "png" ||
    format === "jpg"
  ) {
    const dims =
      readImageDimensions(
        bytes,
        format
      );

    return {
      data: bytes,
      width: dims.width,
      height: dims.height,
      type: format,
    };
  }

  if (format === "svg") {
    const svgText =
      new TextDecoder(
        "utf-8",
        { fatal: false }
      ).decode(bytes);

    const wMatch =
      svgText.match(
        /width\s*=\s*["']?([\d.]+)/i
      );

    const hMatch =
      svgText.match(
        /height\s*=\s*["']?([\d.]+)/i
      );

    return {
      data: svgText,
      width: wMatch
        ? parseFloat(wMatch[1])
        : 300,
      height: hMatch
        ? parseFloat(hMatch[1])
        : 200,
      type: "svg",
    };
  }

  const undecodableReason =
    UNDECODABLE_IN_BROWSER[format];

  if (undecodableReason) {
    throw new Error(
      `This image is ${undecodableReason}. No browser can decode this format via <img>/canvas, so it can't be auto-converted. This usually means the paste/upload handler grabbed the OS clipboard's native format instead of a web-friendly one. Fix at the source: prefer "image/png" when reading the clipboard. Otherwise, pass a custom "resolveImage" that runs this through a real conversion library first.`
    );
  }

  const raster =
    await rasterizeToPng(
      bytes,
      hintedMime
    );

  return {
    data: raster.data,
    width: raster.width,
    height: raster.height,
    type: "png",
  };
}

// ---------------------------------------------------------------------------
// Marks -> pdfmake styles
// ---------------------------------------------------------------------------

const PDFMAKE_FONTS =
  new Set([
    "Roboto",
    "Courier",
    "Helvetica",
    "Times",
  ]);

function resolvePdfFont(
  fontFamily: unknown,
  fallback: string
): string {
  if (
    typeof fontFamily !== "string" ||
    !fontFamily.trim()
  ) {
    return fallback;
  }

  const family =
    fontFamily
      .split(",")[0]
      .trim()
      .replace(
        /^['"]|['"]$/g,
        ""
      );

  return PDFMAKE_FONTS.has(family)
    ? family
    : fallback;
}

function marksToStyle(
  marks: TiptapMark[] | undefined,
  state: ConvertState
): Style {
  const style: Style = {};

  if (!marks) {
    return style;
  }

  const decorations: string[] = [];

  for (const mark of marks) {
    switch (
      canonicalMarkType(
        mark.type,
        state
      )
    ) {
      case "bold":
        style.bold = true;
        break;

      case "italic":
        style.italics = true;
        break;

      case "underline":
        decorations.push("underline");
        break;

      case "strike":
        decorations.push("lineThrough");
        break;

      case "subscript":
        style.sub = true;
        break;

      case "superscript":
        style.sup = true;
        break;

      case "code":
        style.font =
          state.theme.codeFont;
        break;

      case "highlight": {
        const color =
          mark.attrs?.color
            ? cleanHex(
                String(
                  mark.attrs.color
                )
              )
            : "#FFFF00";

        style.background = color;
        break;
      }

      case "textStyle": {
        if (mark.attrs?.color) {
          style.color = cleanHex(
            String(
              mark.attrs.color
            )
          );
        }

        if (
          mark.attrs?.fontFamily
        ) {
          style.font =
            resolvePdfFont(
              mark.attrs.fontFamily,
              state.options.defaultFont
            );
        }

        const pt =
          cssSizeToPt(
            mark.attrs?.fontSize
          );

        if (pt) {
          style.fontSize = pt;
        }

        break;
      }

      default:
        break;
    }
  }

  if (decorations.length) {
    style.decoration =
      decorations as Style["decoration"];
  }

  return style;
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

const IMAGE_SRC_ATTR_KEYS = [
  "src",
  "url",
  "href",
  "path",
];

function extractImageSrc(
  node: TiptapNode
): string | undefined {
  for (
    const key of IMAGE_SRC_ATTR_KEYS
  ) {
    const value =
      node.attrs?.[key];

    if (
      typeof value === "string" &&
      value.length > 0
    ) {
      return value;
    }
  }

  return undefined;
}

function resolveExplicitWidthPt(
  width: unknown,
  contentWidthPt: number
): number | undefined {
  if (typeof width === "number") {
    return width > 0
      ? width
      : undefined;
  }

  if (typeof width !== "string") {
    return undefined;
  }

  const v = width.trim();

  const percentMatch =
    v.match(
      /^(\d+(?:\.\d+)?)%$/
    );

  if (percentMatch) {
    const pct =
      parseFloat(
        percentMatch[1]
      );

    if (pct >= 100) {
      return undefined;
    }

    return Math.round(
      (pct / 100) *
        contentWidthPt
    );
  }

  const pxMatch =
    v.match(
      /^(\d+(?:\.\d+)?)(px)?$/
    );

  if (pxMatch) {
    return Math.round(
      parseFloat(
        pxMatch[1]
      ) * 0.75
    );
  }

  return undefined;
}

function reportImageIssue(
  state: ConvertState,
  src: string,
  error: Error
): void {
  if (
    state.options.onImageError
  ) {
    state.options.onImageError(
      src,
      error
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `[tiptapToPdf] Skipping image (${src.slice(
        0,
        60
      )}): ${error.message}`
    );
  }
}

async function imageNodeToContent(
  node: TiptapNode,
  state: ConvertState
): Promise<
  | ContentImage
  | (Content & {
      svg: string;
    })
  | null
> {
  const src =
    extractImageSrc(node);

  if (!src) {
    reportImageIssue(
      state,
      "(no src found)",
      new Error(
        `Image node has no resolvable URL — checked attrs: ${IMAGE_SRC_ATTR_KEYS.join(
          ", "
        )}.`
      )
    );

    return null;
  }

  const resolver =
    state.options.resolveImage ??
    defaultResolveImage;

  let resolved: ResolvedImage;

  try {
    resolved =
      await resolver(src);
  } catch (err) {
    reportImageIssue(
      state,
      src,
      err as Error
    );

    return null;
  }

  const maxWidth =
    state.options
      .maxImageWidthPt;

  const explicitWidth =
    resolveExplicitWidthPt(
      node.attrs?.width,
      state.contentWidthPt
    );

  let width = explicitWidth
    ? Math.min(
        explicitWidth,
        state.contentWidthPt
      )
    : Math.min(
        resolved.width * 0.75,
        maxWidth
      );

  if (!Number.isFinite(width) || width <= 0) {
    width = Math.min(
      maxWidth,
      state.contentWidthPt
    );
  }

  const nativeWidthPt =
    resolved.width * 0.75;

  const nativeHeightPt =
    resolved.height * 0.75;

  const height = Math.round(
    (nativeHeightPt * width) /
      (nativeWidthPt || 1)
  );

  const alignment =
    imageAlignmentFromAttrs(
      node.attrs
    );

  if (resolved.type === "svg") {
    return {
      svg: resolved.data as string,
      width,
      height,
      alignment,
    };
  }

  const base64 =
    typeof resolved.data === "string"
      ? resolved.data
      : uint8ArrayToBase64(
          resolved.data
        );

  return {
    image:
      `data:image/${resolved.type};base64,${base64}`,
    width,
    height,
    alignment,
  };
}

// ---------------------------------------------------------------------------
// Inline conversion
// ---------------------------------------------------------------------------

async function convertInline(
  nodes: TiptapNode[] | undefined,
  state: ConvertState,
  extraStyle: Style = {}
): Promise<Content[]> {
  if (!nodes) {
    return [];
  }

  const out: Content[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      const marks =
        node.marks || [];

      const linkMark =
        marks.find(
          (m) =>
            canonicalMarkType(
              m.type,
              state
            ) === "link"
        );

      const style: Style = {
        ...extraStyle,
        ...marksToStyle(
          marks.filter(
            (m) =>
              canonicalMarkType(
                m.type,
                state
              ) !== "link"
          ),
          state
        ),
      };

      const textContent:
        ContentText = {
        text:
          node.text ?? "",
        ...style,
      };

      if (
        linkMark?.attrs?.href
      ) {
        textContent.link =
          String(
            linkMark.attrs.href
          );

        textContent.color =
          textContent.color ??
          state.theme.linkColor;

        textContent.decoration =
          textContent.decoration ??
          "underline";
      }

      out.push(textContent);
    } else if (
      node.type === "hardBreak"
    ) {
      const isPageBreak =
        node.attrs?.pageBreak ===
          true ||
        node.attrs?.type ===
          "page";

      out.push(
        isPageBreak
          ? {
              text: "",
              pageBreak: "after",
            }
          : {
              text: "\n",
              ...extraStyle,
            }
      );
    } else if (
      node.type === "image"
    ) {
      const img =
        await imageNodeToContent(
          node,
          state
        );

      if (img) {
        out.push(img);
      }
    } else if (
      !node.content &&
      extractImageSrc(node)
    ) {
      const img =
        await imageNodeToContent(
          node,
          state
        );

      if (img) {
        out.push(img);
      }
    } else if (
      node.content
    ) {
      out.push(
        ...(
          await convertInline(
            node.content,
            state,
            extraStyle
          )
        )
      );
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Block conversion
// ---------------------------------------------------------------------------

interface BlockOpts {
  extraIndentPt?: number;
  inBlockquote?: boolean;
  taskListDepth?: number;
  toggleDepth?: number;

  cellDefaultAlignment?:
    Style["alignment"];

  cellDefaultStyle?: Style;
}

async function convertBlocks(
  nodes: TiptapNode[] | undefined,
  state: ConvertState,
  opts: BlockOpts = {}
): Promise<Content[]> {
  if (!nodes) {
    return [];
  }

  const out: Content[] = [];

  for (const node of nodes) {
    out.push(
      ...(
        await convertBlockNode(
          node,
          state,
          opts
        )
      )
    );
  }

  return out;
}

/**
 * Splits inline nodes wherever a page-break hardBreak occurs.
 */
function splitInlineOnPageBreaks(
  nodes: TiptapNode[] | undefined
): TiptapNode[][] {
  if (!nodes) {
    return [[]];
  }

  const segments: TiptapNode[][] = [[]];

  for (const node of nodes) {
    const isPageBreak =
      node.type === "hardBreak" &&
      (
        node.attrs?.pageBreak ===
          true ||
        node.attrs?.type ===
          "page"
      );

    if (isPageBreak) {
      segments.push([]);
    } else {
      segments[
        segments.length - 1
      ].push(node);
    }
  }

  return segments;
}

async function convertBlockNode(
  node: TiptapNode,
  state: ConvertState,
  opts: BlockOpts
): Promise<Content[]> {
  const type =
    canonicalNodeType(
      node.type,
      state
    );

  const extraIndentPt =
    opts.extraIndentPt ?? 0;

  switch (type) {
    // -----------------------------------------------------------------------
    // Paragraph
    // -----------------------------------------------------------------------

    case "paragraph": {
      const segments =
        splitInlineOnPageBreaks(
          node.content
        );

      const lineHeight =
        lineHeightToFactor(
          node.attrs?.lineHeight,
          state.options
            .defaultFontSizePt
        );

      const blocks: Content[] =
        [];

      for (
        let i = 0;
        i < segments.length;
        i++
      ) {
        const children =
          await convertInline(
            segments[i],
            state,
            opts.cellDefaultStyle
          );

        const alignment =
          alignmentFromAttrs(
            node.attrs
          ) ??
          opts.cellDefaultAlignment;

        const content:
          ContentText = {
          text:
            children.length
              ? children
              : "",

          alignment,

          lineHeight,

          margin: extraIndentPt
            ? [
                extraIndentPt,
                2,
                0,
                2,
              ]
            : [
                0,
                2,
                0,
                2,
              ],
        };

        if (
          i === 0 &&
          node.attrs
            ?.pageBreakBefore ===
            true
        ) {
          content.pageBreak =
            "before";
        }

        if (i > 0) {
          content.pageBreak =
            "before";
        }

        blocks.push(
          wrapWithBlockquoteBar(
            content,
            opts,
            state
          )
        );
      }

      return blocks;
    }

    // -----------------------------------------------------------------------
    // Heading
    // -----------------------------------------------------------------------

    case "heading": {
      const level: number =
        node.attrs?.level ?? 1;

      const safeLevel =
        Math.min(
          Math.max(level, 1),
          6
        );

      const styleId =
        `Heading${safeLevel}`;

      const children =
        await convertInline(
          node.content,
          state
        );

      /**
       * IMPORTANT:
       *
       * Alignment belongs directly to the
       * pdfmake text/content object.
       *
       * Example generated object:
       *
       * {
       *   text: [...],
       *   style: "Heading2",
       *   alignment: "center"
       * }
       *
       * This allows:
       * paragraph -> left
       * heading   -> center
       * paragraph -> right
       *
       * even when all of them are inside
       * a columnBlock.
       */
      const alignment =
        alignmentFromAttrs(
          node.attrs
        );

      const content:
        ContentText = {
        text:
          children.length
            ? children
            : "",

        style: styleId,

        ...(alignment
          ? { alignment }
          : {}),
      };

      if (
        node.attrs
          ?.pageBreakBefore ===
        true
      ) {
        content.pageBreak =
          "before";
      }

      return [content];
    }

    // -----------------------------------------------------------------------
    // Lists
    // -----------------------------------------------------------------------

    case "bulletList":
    case "orderedList": {
      const items =
        await Promise.all(
          (
            node.content ?? []
          ).map(
            (child) =>
              convertBlockNode(
                child,
                state,
                {
                  ...opts,
                  extraIndentPt: 0,
                }
              )
          )
        );

      const flatItems =
        items.map(
          (blocks) =>
            blocks.length === 1
              ? blocks[0]
              : {
                  stack: blocks,
                }
        );

      if (
        type ===
        "orderedList"
      ) {
        return [
          {
            ol: flatItems as any,
            start:
              node.attrs
                ?.start ?? 1,
            margin: [
              extraIndentPt,
              0,
              0,
              0,
            ],
          },
        ];
      }

      return [
        {
          ul: flatItems as any,
          margin: [
            extraIndentPt,
            0,
            0,
            0,
          ],
        },
      ];
    }

    // -----------------------------------------------------------------------
    // List items
    // -----------------------------------------------------------------------

    case "taskItem":
    case "listItem": {
      const contentNodes =
        node.content ?? [];

      const isTask =
        type === "taskItem";

      const checked = isTask
        ? Boolean(
            node.attrs
              ?.checked
          )
        : undefined;

      const result: Content[] =
        [];

      let firstParagraphConsumed =
        false;

      for (
        const child of contentNodes
      ) {
        if (
          !firstParagraphConsumed &&
          canonicalNodeType(
            child.type,
            state
          ) === "paragraph"
        ) {
          firstParagraphConsumed =
            true;

          const inline =
            await convertInline(
              child.content,
              state
            );

          const textLine:
            Content = {
            text: inline.length
              ? inline
              : [{ text: "" }],

            alignment:
              alignmentFromAttrs(
                child.attrs
              ),
          };

          result.push(
            checked !== undefined
              ? {
                  columns: [
                    {
                      width: 12,
                      stack: [
                        checkboxShape(
                          checked
                        ),
                      ],
                      margin: [
                        0,
                        2,
                        0,
                        0,
                      ],
                    },

                    {
                      width: "*",
                      ...textLine,
                    },
                  ],

                  columnGap: 4,
                }
              : textLine
          );
        } else {
          result.push(
            ...(
              await convertBlockNode(
                child,
                state,
                opts
              )
            )
          );
        }
      }

      return result;
    }

    // -----------------------------------------------------------------------
    // Task list
    // -----------------------------------------------------------------------

    case "taskList": {
      const items =
        await Promise.all(
          (
            node.content ?? []
          ).map(
            (child) =>
              convertBlockNode(
                child,
                state,
                {
                  ...opts,
                  taskListDepth:
                    (opts.taskListDepth ??
                      0) + 1,
                }
              )
          )
        );

      const flatItems =
        items.map(
          (blocks) =>
            blocks.length === 1
              ? blocks[0]
              : {
                  stack: blocks,
                }
        );

      return [
        {
          ul: flatItems as any,
          type: "none",
          margin: [
            12,
            0,
            0,
            0,
          ],
        },
      ];
    }

    // -----------------------------------------------------------------------
    // Blockquote
    // -----------------------------------------------------------------------

    case "blockquote": {
      return convertBlocks(
        node.content,
        state,
        {
          ...opts,
          inBlockquote: true,
          extraIndentPt:
            extraIndentPt + 12,
        }
      );
    }

    // -----------------------------------------------------------------------
    // Details
    // -----------------------------------------------------------------------

    case "details": {
      return convertDetails(
        node,
        state,
        opts
      );
    }

    // -----------------------------------------------------------------------
    // Code block
    // -----------------------------------------------------------------------

    case "codeBlock": {
      const text =
        (
          node.content ?? []
        )
          .map(
            (n) =>
              n.text ?? ""
          )
          .join("");

      return [
        {
          text,
          font:
            state.theme.codeFont,
          fontSize: 9.6,
          background:
            state.theme.codeBlockBg,
          margin: [
            0,
            6,
            0,
            6,
          ],
          preserveLeadingSpaces:
            true,
        },
      ];
    }

    // -----------------------------------------------------------------------
    // Horizontal rule
    // -----------------------------------------------------------------------

    case "horizontalRule": {
      return [
        {
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 0,
              x2:
                state.contentWidthPt,
              y2: 0,
              lineWidth: 0.75,
              lineColor:
                state.theme.hrColor,
            },
          ],

          margin: [
            0,
            6,
            0,
            6,
          ],
        },
      ];
    }

    // -----------------------------------------------------------------------
    // Page break
    // -----------------------------------------------------------------------

    case "pageBreak": {
      return [
        {
          text: "",
          pageBreak: "before",
        },
      ];
    }

    // -----------------------------------------------------------------------
    // Image
    // -----------------------------------------------------------------------

    case "image": {
      const img =
        await imageNodeToContent(
          node,
          state
        );

      return img
        ? [img]
        : [];
    }

    // -----------------------------------------------------------------------
    // Vertical alignment
    // -----------------------------------------------------------------------

    case "verticalAlign": {
      return convertBlocks(
        node.content,
        state,
        opts
      );
    }

    // -----------------------------------------------------------------------
    // Column block
    // -----------------------------------------------------------------------

    case "columnBlock": {
      /**
       * pdfmake has native columns.
       *
       * Always wrap each column in a stack.
       *
       * This is important because each column can contain
       * multiple independent block-level nodes:
       *
       * column
       *   paragraph
       *   heading
       *   paragraph
       *
       * The heading can therefore retain:
       *
       * alignment: "center"
       *
       * independently of surrounding paragraphs.
       */
      const columnNodes =
        (
          node.content ?? []
        ).filter(
          (n) =>
            canonicalNodeType(
              n.type,
              state
            ) === "column"
        );

      const columns =
        await Promise.all(
          columnNodes.map(
            async (col) => {
              const blocks =
                await convertBlocks(
                  col.content,
                  state,
                  opts
                );

              return {
                width: "*",

                stack:
                  blocks.length
                    ? blocks
                    : [
                        {
                          text: "",
                        },
                      ],
              };
            }
          )
        );

      return [
        {
          columns,
          columnGap: 24,
        },
      ];
    }

    // -----------------------------------------------------------------------
    // Column
    // -----------------------------------------------------------------------

    case "column": {
      return convertBlocks(
        node.content,
        state,
        opts
      );
    }

    // -----------------------------------------------------------------------
    // Table
    // -----------------------------------------------------------------------

    case "table": {
      return [
        await convertTable(
          node,
          state
        ),
      ];
    }

    // -----------------------------------------------------------------------
    // Fallback
    // -----------------------------------------------------------------------

    default: {
      if (
        !node.content &&
        extractImageSrc(node)
      ) {
        const img =
          await imageNodeToContent(
            node,
            state
          );

        return img
          ? [img]
          : [];
      }

      if (node.text) {
        return [
          {
            text: node.text,
          },
        ];
      }

      if (node.content) {
        return convertBlocks(
          node.content,
          state,
          opts
        );
      }

      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// Blockquote visual wrapper
// ---------------------------------------------------------------------------

function wrapWithBlockquoteBar(
  content: Content,
  opts: BlockOpts,
  state: ConvertState
): Content {
  if (!opts.inBlockquote) {
    return content;
  }

  return {
    table: {
      widths: [
        3,
        "*",
      ],

      body: [
        [
          {
            text: "",
            fillColor:
              state.theme
                .quoteBorderColor,
          },

          content,
        ],
      ],
    },

    layout: {
      hLineWidth: () => 0,

      vLineWidth: () => 0,

      paddingLeft: (
        i: number
      ) =>
        i === 0
          ? 0
          : 8,

      paddingRight: () => 0,

      paddingTop: () => 0,

      paddingBottom: () => 0,
    },

    margin: [
      0,
      2,
      0,
      2,
    ],
  } as unknown as Content;
}

// ---------------------------------------------------------------------------
// Details / toggle
// ---------------------------------------------------------------------------

async function convertDetails(
  node: TiptapNode,
  state: ConvertState,
  opts: BlockOpts
): Promise<Content[]> {
  const children =
    node.content ?? [];

  const summaryNode =
    children.find(
      (n) =>
        canonicalNodeType(
          n.type,
          state
        ) ===
        "detailsSummary"
    );

  const contentNode =
    children.find(
      (n) =>
        canonicalNodeType(
          n.type,
          state
        ) ===
        "detailsContent"
    );

  const depth =
    opts.toggleDepth ?? 0;

  const isOpen =
    node.attrs?.open !== false;

  const summaryInline =
    summaryNode
      ? await convertInline(
          summaryNode.content,
          state,
          {
            bold: true,
          }
        )
      : [{ text: "" }];

  const summary: Content = {
    columns: [
      {
        width: 10,
        stack: [
          triangleShape(
            isOpen
          ),
        ],
        margin: [
          0,
          3,
          0,
          0,
        ],
      },

      {
        width: "*",
        text: summaryInline,
        bold: true,
      },
    ],

    columnGap: 4,

    margin: [
      opts.extraIndentPt ??
        0,
      depth === 0
        ? 6
        : 2,
      0,
      2,
    ],
  };

  const contentBlocks =
    contentNode
      ? await convertBlocks(
          contentNode.content,
          state,
          {
            ...opts,
            toggleDepth:
              depth + 1,
            extraIndentPt:
              (opts.extraIndentPt ??
                0) + 14,
          }
        )
      : [];

  return [
    summary,
    ...contentBlocks,
  ];
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

interface PendingCell {
  node: TiptapNode;
  colSpan: number;
  rowSpan: number;
}

async function convertTable(
  tableNode: TiptapNode,
  state: ConvertState
): Promise<ContentTable> {
  const rowNodes =
    (
      tableNode.content ?? []
    ).filter(
      (n) =>
        n.type ===
        "tableRow"
    );

  let columnCount = 0;

  for (
    const row of rowNodes
  ) {
    const count =
      (
        row.content ?? []
      ).reduce(
        (sum, cell) =>
          sum +
          (
            cell.attrs
              ?.colspan ?? 1
          ),
        0
      );

    columnCount =
      Math.max(
        columnCount,
        count
      );
  }

  columnCount =
    Math.max(
      columnCount,
      1
    );

  const colWidthsPx:
    number[] =
    new Array(
      columnCount
    ).fill(0);

  for (
    const row of rowNodes
  ) {
    let col = 0;

    for (
      const cell of
        row.content ?? []
    ) {
      const span =
        cell.attrs
          ?.colspan ?? 1;

      const widths:
        number[] | undefined =
        cell.attrs
          ?.colwidth;

      if (widths) {
        for (
          let i = 0;
          i < span;
          i++
        ) {
          if (
            widths[i]
          ) {
            colWidthsPx[
              col + i
            ] =
              widths[i];
          }
        }
      }

      col += span;
    }
  }

  const anyExplicit =
    colWidthsPx.some(
      (w) => w > 0
    );

  const columnWidthsPt:
    (number | "*")[] =
    anyExplicit
      ? colWidthsPx.map(
          (w) =>
            w > 0
              ? Math.round(
                  w * 0.75
                )
              : "*"
        )
      : new Array(
          columnCount
        ).fill("*");

  const rowSpanCarry:
    number[] =
    new Array(
      columnCount
    ).fill(0);

  const body:
    TableCell[][] = [];

  for (
    const rowNode of rowNodes
  ) {
    const cellsInSource:
      PendingCell[] =
      (
        rowNode.content ?? []
      )
        .filter(
          (n) =>
            n.type ===
              "tableCell" ||
            n.type ===
              "tableHeader"
        )
        .map(
          (n) => ({
            node: n,

            colSpan:
              n.attrs
                ?.colspan ?? 1,

            rowSpan:
              n.attrs
                ?.rowspan ?? 1,
          })
        );

    const rowCells:
      TableCell[] = [];

    let col = 0;
    let sourceIdx = 0;

    while (
      col < columnCount
    ) {
      if (
        rowSpanCarry[col] >
        0
      ) {
        rowCells.push({});
        rowSpanCarry[col] -= 1;
        col += 1;
        continue;
      }

      const pending =
        cellsInSource[
          sourceIdx
        ];

      if (!pending) {
        rowCells.push({
          text: "",
        });

        col += 1;
        continue;
      }

      sourceIdx += 1;

      const span =
        Math.min(
          pending.colSpan,
          columnCount - col
        );

      const isHeader =
        pending.node.type ===
        "tableHeader";

      const bg =
        pending.node.attrs
          ?.backgroundColor;

      /**
       * Cell-level alignment.
       *
       * This provides the default alignment
       * for paragraphs contained by the cell.
       */
      const cellDefaultAlignment =
        alignmentFromAttrs(
          pending.node.attrs
        );

      const cellDefaultStyle:
        Style = {};

      if (
        pending.node.attrs
          ?.textColor
      ) {
        cellDefaultStyle.color =
          cleanHex(
            String(
              pending.node.attrs
                .textColor
            )
          );
      }

      const cellFontPt =
        cssSizeToPt(
          pending.node.attrs
            ?.fontSize
        );

      if (cellFontPt) {
        cellDefaultStyle.fontSize =
          cellFontPt;
      }

      let cellContent =
        pending.node.content ??
        [];

      let verticalAlignment:
        | "top"
        | "middle"
        | "bottom"
        | undefined;

      if (
        cellContent.length ===
          1 &&
        canonicalNodeType(
          cellContent[0].type,
          state
        ) ===
          "verticalAlign"
      ) {
        const wrapper =
          cellContent[0];

        verticalAlignment =
          wrapper.attrs
            ?.alignment ===
          "middle"
            ? "middle"
            : wrapper.attrs
                ?.alignment ===
              "bottom"
            ? "bottom"
            : "top";

        cellContent =
          wrapper.content ??
          [];
      }

      const cellBlocks =
        await convertBlocks(
          cellContent,
          state,
          {
            cellDefaultAlignment,

            cellDefaultStyle:
              Object.keys(
                cellDefaultStyle
              ).length
                ? cellDefaultStyle
                : undefined,
          }
        );

      /**
       * IMPORTANT:
       *
       * Alignment is applied directly to the
       * pdfmake table cell.
       *
       * This makes table headers such as:
       *
       * textAlign: "center"
       *
       * render centered even when their
       * paragraph itself does not explicitly
       * contain textAlign.
       */
      rowCells.push({
        stack:
          cellBlocks.length
            ? cellBlocks
            : [
                {
                  text: "",
                },
              ],

        alignment:
          cellDefaultAlignment,

        colSpan:
          span > 1
            ? span
            : undefined,

        rowSpan:
          pending.rowSpan > 1
            ? pending.rowSpan
            : undefined,

        verticalAlignment,

        fillColor: bg
          ? cleanHex(
              String(bg)
            )
          : isHeader
          ? state.theme
              .tableHeaderBg
          : undefined,
      } as TableCell);

      if (
        pending.rowSpan > 1
      ) {
        for (
          let i = 0;
          i < span;
          i++
        ) {
          rowSpanCarry[
            col + i
          ] =
            pending.rowSpan -
            1;
        }
      }

      col += span;
    }

    body.push(rowCells);
  }

  const border =
    state.theme
      .tableBorderColor;

  const layout:
    CustomTableLayout = {
    hLineWidth: () => 0.75,

    vLineWidth: () => 0.75,

    hLineColor: () =>
      border,

    vLineColor: () =>
      border,

    paddingLeft: () => 4,

    paddingRight: () => 4,

    paddingTop: () => 2,

    paddingBottom: () => 2,
  };

  const {
    before,
    after,
  } =
    state.theme
      .tableMarginPt;

  return {
    table: {
      widths:
        columnWidthsPt as any,

      body:
        body as any,
    },

    layout,

    margin: [
      0,
      before,
      0,
      after,
    ],
  };
}

// ---------------------------------------------------------------------------
// Page configuration
// ---------------------------------------------------------------------------

const PAGE_SIZES_PT = {
  LETTER: {
    width: 612,
    height: 792,
  },

  A4: {
    width: 595.28,
    height: 841.89,
  },
};

function createConvertState(
  options: ConvertOptions
): ConvertState {
  const page =
    PAGE_SIZES_PT[
      options.pageSize ===
      "LETTER"
        ? "LETTER"
        : "A4"
    ];

  const marginPt =
    (options.marginInches ??
      0.5) * 72;

  const isLandscape =
    options.orientation ===
    "landscape";

  const pageWidth =
    isLandscape
      ? page.height
      : page.width;

  const pageHeight =
    isLandscape
      ? page.width
      : page.height;

  const contentWidthPt =
    pageWidth -
    marginPt * 2;

  /**
   * Keep the calculated page dimensions
   * on the state so conversion logic uses
   * exactly the same dimensions as pdfmake.
   */
  void pageHeight;

  return {
    options: {
      defaultFont:
        options.defaultFont ??
        "Roboto",

      defaultFontSizePt:
        options.defaultFontSizePt ??
        11,

      maxImageWidthPt:
        options.maxImageWidthPt ??
        DEFAULT_MAX_IMAGE_WIDTH_PT,

      ...options,
    },

    theme: {
      ...DEFAULT_THEME,
      ...options.theme,
    },

    contentWidthPt,
  };
}

function buildDocDefinition(
  doc: TiptapDocument,
  options: ConvertOptions
): TDocumentDefinitions {
  const state =
    createConvertState(
      options
    );

  const page =
    PAGE_SIZES_PT[
      options.pageSize ===
      "LETTER"
        ? "LETTER"
        : "A4"
    ];

  const marginPt =
    (options.marginInches ??
      0.5) * 72;

  const isLandscape =
    options.orientation ===
    "landscape";

  const pageSize =
    isLandscape
      ? {
          width:
            page.height,
          height:
            page.width,
        }
      : page;

  /**
   * doc is intentionally accepted here because the content
   * is populated asynchronously by tiptapToPdf/downloadPdf.
   */
  void doc;

  return {
    pageSize: {
      width:
        pageSize.width,
      height:
        pageSize.height,
    },

    pageMargins: [
      marginPt,
      marginPt,
      marginPt,
      marginPt,
    ],

    defaultStyle: {
      font:
        state.options
          .defaultFont,

      fontSize:
        state.options
          .defaultFontSizePt,
    },

    styles: {
      Heading1: {
        fontSize:
          state.theme
            .headingSizesPt
            .h1,

        bold: true,

        margin: [
          0,
          state.theme
            .headingSpacingPt
            .before,
          0,
          state.theme
            .headingSpacingPt
            .after,
        ],
      },

      Heading2: {
        fontSize:
          state.theme
            .headingSizesPt
            .h2,

        bold: true,

        margin: [
          0,
          state.theme
            .headingSpacingPt
            .before,
          0,
          state.theme
            .headingSpacingPt
            .after,
        ],
      },

      Heading3: {
        fontSize:
          state.theme
            .headingSizesPt
            .h3,

        bold: true,

        margin: [
          0,
          6,
          0,
          6,
        ],
      },

      Heading4: {
        fontSize:
          state.theme
            .headingSizesPt
            .h4,

        bold: true,

        margin: [
          0,
          6,
          0,
          6,
        ],
      },

      Heading5: {
        fontSize:
          state.theme
            .headingSizesPt
            .h5,

        bold: true,

        margin: [
          0,
          6,
          0,
          6,
        ],
      },

      Heading6: {
        fontSize:
          state.theme
            .headingSizesPt
            .h6,

        bold: true,

        margin: [
          0,
          6,
          0,
          6,
        ],
      },
    },

    content: [],
  };
}

// ---------------------------------------------------------------------------
// Main PDF conversion
// ---------------------------------------------------------------------------

/**
 * Converts Tiptap JSON into a browser Blob containing a PDF.
 */
export async function tiptapToPdf(
  doc: TiptapDocument,
  options: ConvertOptions = {}
): Promise<Blob> {
  ensureFontsRegistered(
    options.customFonts
  );

  const docDefinition =
    buildDocDefinition(
      doc,
      options
    );

  const state =
    createConvertState(
      options
    );

  docDefinition.content =
    await convertBlocks(
      doc.content,
      state,
      {}
    );

  return new Promise(
    (resolve, reject) => {
      try {
        const pdfDoc =
          pdfMake.createPdf(
            docDefinition
          );

        pdfDoc
          .getBlob()
          .then(resolve)
          .catch(reject);
      } catch (err) {
        reject(err);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

/**
 * Converts and immediately triggers a browser download.
 */
export async function downloadPdf(
  doc: TiptapDocument,
  filename = "document.pdf",
  options: ConvertOptions = {}
): Promise<void> {
  ensureFontsRegistered(
    options.customFonts
  );

  const docDefinition =
    buildDocDefinition(
      doc,
      options
    );

  const state =
    createConvertState(
      options
    );

  docDefinition.content =
    await convertBlocks(
      doc.content,
      state,
      {}
    );

  const pdfDoc =
    pdfMake.createPdf(
      docDefinition
    );

  const finalFilename =
    filename.endsWith(".pdf")
      ? filename
      : `${filename}.pdf`;

  await pdfDoc.download(
    finalFilename
  );
}

export default tiptapToPdf;