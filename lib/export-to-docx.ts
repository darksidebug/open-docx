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
   * Maps non-standard node type names to the canonical ones this converter
   * understands (e.g. if your schema calls it "toggle" / "toggleSummary" /
   * "toggleContent" instead of "details" / "detailsSummary" / "detailsContent").
   */
  nodeAliases?: Record<string, string>;
  /** Same idea as nodeAliases, but for mark types (e.g. { inlineCode: "code" }). */
  markAliases?: Record<string, string>;
}

const DEFAULT_MARK_ALIASES: Record<string, string> = {
  inlineCode: "code",
  codeInline: "code",
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

function canonicalNodeType(type: string, state: ConvertState): string {
  return state.options.nodeAliases?.[type] ?? type;
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
// ---------------------------------------------------------------------------

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function defaultResolveImage(src: string): Promise<ResolvedImage> {
  const dataUrlMatch = src.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/i);
  if (dataUrlMatch) {
    const ext = dataUrlMatch[1].toLowerCase();
    const type = (ext === "jpeg" ? "jpg" : ext) as ResolvedImage["type"];
    const data = base64ToUint8Array(dataUrlMatch[2]);
    const dims = readImageDimensions(data, type);
    return { data, width: dims.width, height: dims.height, type };
  }

  if (/^https?:\/\//i.test(src)) {
    if (typeof fetch !== "function") {
      throw new Error(
        `Cannot fetch remote image "${src}": no global fetch available. ` +
          `Pass a custom "resolveImage" option to handle remote images in this environment.`
      );
    }
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch image "${src}": HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    const data = new Uint8Array(arrayBuf);
    const contentType: string = res.headers.get("content-type") || "";
    let type: ResolvedImage["type"] = "png";
    if (/jpeg|jpg/i.test(contentType) || /\.jpe?g($|\?)/i.test(src)) type = "jpg";
    else if (/gif/i.test(contentType) || /\.gif($|\?)/i.test(src)) type = "gif";
    else if (/bmp/i.test(contentType) || /\.bmp($|\?)/i.test(src)) type = "bmp";
    const dims = readImageDimensions(data, type);
    return { data, width: dims.width, height: dims.height, type };
  }

  throw new Error(
    `Cannot resolve image src "${src}". Only data: URLs and http(s) URLs are supported ` +
      `by the default resolver — pass a custom "resolveImage" option for anything else.`
  );
}

/** Minimal PNG/JPEG/GIF/BMP dimension sniffers, built on DataView (no Node Buffer). */
function readImageDimensions(
  bytes: Uint8Array,
  type: ResolvedImage["type"]
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
        opts.font = "Consolas";
        opts.shading = { type: ShadingType.CLEAR, fill: "F0F0F0", color: "auto" };
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
                color: runOptions.color ?? "0563C1",
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
    } else if (node.content) {
      children.push(...(await convertInline(node.content, state, extraRunOptions)));
    }
  }
  return children;
}

async function imageNodeToRun(node: TiptapNode, state: ConvertState): Promise<ImageRun | null> {
  const src: string | undefined = node.attrs?.src;
  if (!src) return null;
  const resolver = state.options.resolveImage ?? defaultResolveImage;
  let resolved: ResolvedImage;
  try {
    resolved = await resolver(src);
  } catch (err) {
    // Degrade gracefully: emit nothing rather than throwing the whole conversion away.
    // eslint-disable-next-line no-console
    console.warn(`[tiptapToDocx] Skipping image: ${(err as Error).message}`);
    return null;
  }

  const maxWidth = state.options.maxImageWidthPx;
  let { width, height } = resolved;
  if (width > maxWidth) {
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
      const children = await convertInline(node.content, state);
      return [
        new Paragraph({
          children: children.length ? children : [new TextRun("")],
          alignment: alignmentFromAttrs(node.attrs),
          pageBreakBefore: node.attrs?.pageBreakBefore === true,
          numbering: opts.listContext
            ? { reference: opts.listContext.reference, level: opts.listContext.level }
            : undefined,
          indent: extraIndentTwips ? { left: extraIndentTwips } : undefined,
          border: quoteBorderDepth
            ? {
                left: { style: BorderStyle.SINGLE, size: 12, color: "CCCCCC", space: 8 },
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
      const children = await convertInline(node.content, state);
      return [
        new Paragraph({
          heading: headingMap[level] ?? HeadingLevel.HEADING_1,
          alignment: alignmentFromAttrs(node.attrs),
          pageBreakBefore: node.attrs?.pageBreakBefore === true,
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
            font: "Consolas",
            size: halfPointsFromPt(state.options.defaultFontSizePt - 1),
            break: i === 0 ? undefined : 1,
          })
        );
      });
      return [
        new Paragraph({
          children: runs.length ? runs : [new TextRun({ text: "", font: "Consolas" })],
          shading: { type: ShadingType.CLEAR, fill: "F5F5F5", color: "auto" },
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 },
            left: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 },
            right: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 4 },
          },
          spacing: { before: 120, after: 120 },
        }),
      ];
    }

    case "horizontalRule": {
      return [
        new Paragraph({
          children: [new TextRun("")],
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 },
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
      return [new Paragraph({ children: run ? [run] : [], alignment: AlignmentType.CENTER })];
    }

    case "table": {
      return [await convertTable(node, state)];
    }

    default: {
      // Unknown node: try to render any inline text it might carry, then
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

      const cellChildren = await convertBlocks(pending.node.content, state, {});

      tableCells.push(
        new TableCell({
          children: cellChildren.length ? cellChildren : [new Paragraph({ children: [] })],
          width: { size: width, type: WidthType.DXA },
          columnSpan: span > 1 ? span : undefined,
          verticalMerge: pending.rowSpan > 1 ? VerticalMergeType.RESTART : undefined,
          shading: bg
            ? { type: ShadingType.CLEAR, fill: cleanHex(String(bg)), color: "auto" }
            : isHeader
            ? { type: ShadingType.CLEAR, fill: "EEEEEE", color: "auto" }
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
    numberingConfigs: [],
    numberingCounter: 0,
    contentWidthTwips,
  };

  const body = await convertBlocks(doc.content, state, {});

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