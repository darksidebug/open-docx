/**
 * importDocxToTiptap.ts
 * ----------------------------------------------------------------------------
 * Imports a .docx file into a Tiptap editor. Uses Mammoth (MIT,
 * https://github.com/mwilliamson/mammoth.js) to convert the .docx to clean
 * semantic HTML, then feeds that straight into `editor.commands.setContent()`
 * — the same mechanism that already parses pasted HTML, so it slots into
 * your existing schema/extensions with no new parsing logic of your own.
 *
 * Browser-only, dynamic-imported (same reasoning as tiptapToHtml.ts's
 * @tiptap/html handling): Mammoth's package.json swaps in browser-safe
 * internals via a "browser" field, but that's only honored by a bundler's
 * *client* compilation — Next.js's SSR pass resolves packages with plain
 * Node resolution, so a static top-level import risks pulling in the
 * Node-targeted internals during server rendering for no reason. A dynamic
 * import keeps this entirely out of the SSR path.
 *
 * Usage:
 *   import { importDocxFile } from "./importDocxToTiptap";
 *   const { html, messages } = await importDocxFile(file);
 *   editor.commands.setContent(html);
 * ----------------------------------------------------------------------------
 */

export interface ImportDocxOptions {
  /**
   * Extra Mammoth style-map rules, appended after the defaults below.
   * See https://github.com/mwilliamson/mammoth.js#writing-style-maps
   *
   * Defaults already applied:
   *   - "u => u"        Word underlining is ignored by Mammoth by default
   *                      (it's easily confused with links) — this restores it.
   *   - "strike => s"   Explicit, though this already matches Mammoth's own
   *                      default; kept here so it's visible/overridable.
   */
  styleMap?: string[];
  /** Set false to fully replace (not append to) Mammoth's built-in style map. */
  includeDefaultStyleMap?: boolean;
}

export interface ImportDocxResult {
  /** Semantic HTML, ready for editor.commands.setContent(html). */
  html: string;
  /** Warnings from the conversion (unrecognized styles, skipped images, etc.) — surface these, don't discard them silently. */
  messages: { type: string; message: string }[];
}

const DEFAULT_STYLE_MAP = ["u => u", "strike => s"];

/**
 * Converts a .docx File (e.g. from an <input type="file"> or a drop event)
 * into HTML suitable for editor.commands.setContent().
 */
export async function importDocxFile(file: File, options: ImportDocxOptions = {}): Promise<ImportDocxResult> {
  const arrayBuffer = await file.arrayBuffer();
  return importDocxArrayBuffer(arrayBuffer, options);
}

/** Same as importDocxFile, but from a raw ArrayBuffer (e.g. already fetched from your own backend). */
export async function importDocxArrayBuffer(arrayBuffer: ArrayBuffer, options: ImportDocxOptions = {}): Promise<ImportDocxResult> {
  const mammoth = await import("mammoth");
  const styleMap = [...DEFAULT_STYLE_MAP, ...(options.styleMap ?? [])];
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    { styleMap, includeDefaultStyleMap: options.includeDefaultStyleMap ?? true }
  );
  return { html: result.value, messages: result.messages as ImportDocxResult["messages"] };
}

export default importDocxFile;