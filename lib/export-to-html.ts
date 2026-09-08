/**
 * tiptapToHtml.ts
 * ----------------------------------------------------------------------------
 * Exports Tiptap content as a standalone, self-styled .html file — openable
 * directly in a browser, with no dependency on your app's CSS being loaded.
 *
 * Two entry points:
 *   - downloadHtml(editor)              — from a live editor instance
 *   - downloadTiptapJsonAsHtml(json, extensions) — from JSON alone (headless,
 *     no editor instance needed — mirrors tiptapToDocx/tiptapToPdf's API)
 *
 * Browser-only, same as tiptapToDocx.ts / tiptapToPdf.ts — generateHTML from
 * "@tiptap/html" requires a real DOM (it serializes via ProseMirror's
 * DOMSerializer under the hood). There's a separate "@tiptap/html/server"
 * entry for Node, but that's out of scope here since everything else in
 * this project is frontend-only by design.
 * ----------------------------------------------------------------------------
 */

import type { AnyExtension, Editor, JSONContent } from "@tiptap/core";

export interface HtmlExportOptions {
  /** Document <title>. Defaults to "Document". */
  title?: string;
  /** Extra CSS appended after the base .tiptap stylesheet (e.g. print rules, overrides). */
  extraCss?: string;
  /** Max content width in the exported page. Defaults to "800px". */
  maxWidth?: string;
}

/**
 * Downloads the live editor's current content as a standalone .html file.
 * Uses editor.getHTML() — no extensions array needed, since the editor
 * instance already knows how to serialize itself.
 */
export function downloadHtml(editor: Editor, filename: string = "document.html", options: HtmlExportOptions = {}): void {
  const html = buildStandaloneHtml(editor.getHTML(), options);
  triggerHtmlDownload(html, filename);
}

/**
 * Same output as downloadHtml, but from raw Tiptap JSON with no live editor
 * instance — for parity with tiptapToDocx/tiptapToPdf, which also take JSON
 * directly. Needs the same extensions array your editor uses: generateHTML
 * calls each node/mark's own renderHTML, which only exists on its extension.
 */
/**
 * Dynamically imports "@tiptap/html" (rather than a static top-level
 * import) specifically so bundlers never need to resolve it during
 * server-side rendering. That package has conditional exports: resolved
 * in a Node context (which Next.js does even for "use client" components,
 * to produce the SSR pass), it pulls in a *different* server implementation
 * that needs "happy-dom" — a dependency you never installed because you
 * never intended to use that path. A dynamic import code-splits this into
 * a separate chunk that's only ever loaded in the browser, so that Node
 * resolution never happens for it at all.
 */
async function loadGenerateHTML() {
  const mod = await import("@tiptap/html");
  return mod.generateHTML;
}

export async function tiptapJsonToStandaloneHtml(
  json: JSONContent,
  extensions: AnyExtension[],
  options: HtmlExportOptions = {}
): Promise<string> {
  const generateHTML = await loadGenerateHTML();
  const html = generateHTML(json, extensions);
  return buildStandaloneHtml(html, options);
}

export async function downloadTiptapJsonAsHtml(
  json: JSONContent,
  extensions: AnyExtension[],
  filename: string = "document.html",
  options: HtmlExportOptions = {}
): Promise<void> {
  const html = await tiptapJsonToStandaloneHtml(json, extensions, options);
  triggerHtmlDownload(html, filename);
}

function buildStandaloneHtml(bodyHtml: string, options: HtmlExportOptions): string {
  const title = escapeHtml(options.title ?? "Document");
  const maxWidth = options.maxWidth ?? "800px";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
${TIPTAP_STYLESHEET}

/* Standalone-page chrome (not part of the editor's own .tiptap styles) */
:root { --chart-2: #94a3b8; }
body {
  margin: 0;
  padding: 2.5rem 1.5rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1f2937;
  background: #f8fafc;
}
.tiptap {
  max-width: ${maxWidth};
  margin: 0 auto;
  background: #fff;
  padding: 2.5rem 3rem;
  overflow-x: visible;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  min-height: 1054px;
  width: 816px;
  font-size: 13px;
  cursor: text;
}

@media print {
  body { padding: 0; background: #fff; }
  .tiptap { box-shadow: none; border-radius: 0; padding: 0; max-width: none; }
  .container {
    padding-top: 0;
    padding-bottom: 0;
    width: 100%;
    min-width: 0;
  }
}

.container {
  margin-left: auto;
  margin-right: auto;
  min-width: max-content;
  display: flex;
  justify-content: center;
  width: 51rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

${options.extraCss ?? ""}
</style>
</head>
<body>
<div class='container'>
<div class="tiptap">
${bodyHtml}
</div>
</div>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function triggerHtmlDownload(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".html") ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// The actual .tiptap stylesheet (verbatim from the app's global.css), so the
// exported file renders identically to the live editor and is fully
// self-contained — no dependency on the app's CSS being reachable later.
// ---------------------------------------------------------------------------
const TIPTAP_STYLESHEET = `
.tiptap {
  position: relative;
}

.tiptap :first-child {
  margin-top: 0;
}

/* List styles */
.tiptap ul,
.tiptap ol {
  padding: 0 1rem;
}

.tiptap ul li {
  list-style-type: disc;
}

.tiptap ul li p {
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}

.tiptap ol li {
  list-style-type: decimal;
}

.tiptap ol li p {
  margin-top: 0.25em;
  margin-bottom: 0.25em;
}

/* Task list specific styles */
.tiptap ul[data-type='taskList'] {
  list-style: none;
  margin: 0.5rem 0;
  padding: 0;
}

.tiptap ul[data-type='taskList'] li {
  align-items: flex-start;
  display: flex;
}

.tiptap ul[data-type='taskList'] li > label {
  position: relative;
  top: 0.125rem;
  flex: 0 0 auto;
  margin-right: 0.5rem;
  user-select: none;
}

.tiptap ul[data-type='taskList'] li > div {
  flex: 1 1 auto;
}

.tiptap ul[data-type='taskList'] input[type='checkbox'] {
  cursor: pointer;
}

.tiptap ul[data-type='taskList'] ul[data-type='taskList'] {
  margin: 0;
}

/* Heading styles */
.tiptap h1,
.tiptap h2,
.tiptap h3,
.tiptap h4,
.tiptap h5,
.tiptap h6 {
  line-height: 1.1;
  text-wrap: pretty;
}

.tiptap h1,
.tiptap h2 {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.tiptap h1 { font-size: 1.4rem; }
.tiptap h2 { font-size: 1.2rem; }
.tiptap h3 { font-size: 1.1rem; }
.tiptap h4,
.tiptap h5,
.tiptap h6 { font-size: 1rem; }

.tiptap table {
  border-collapse: collapse;
  margin: 0;
  overflow: hidden;
  table-layout: fixed;
  width: 100%;
}

.tiptap table tr {
  position: relative;
}

.tiptap table td,
.tiptap table th {
  border: 1px solid #ced3d8;
  box-sizing: border-box;
  min-width: 1em;
  padding: 2px 5px;
  position: relative;
  vertical-align: top;
}

.tiptap table td > *,
.tiptap table th > * {
  margin-bottom: 0;
}

.tiptap table td > .vertical-align-box,
.tiptap table th > .vertical-align-box {
  position: absolute;
  inset: 0;
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  box-sizing: border-box;
  padding: 2px 5px;
}

.tiptap table .vertical-align-box.vertical-align-top { justify-content: flex-start !important; }
.tiptap table .vertical-align-box.vertical-align-middle { justify-content: center !important; }
.tiptap table .vertical-align-box.vertical-align-bottom { justify-content: flex-end !important; }

.tiptap table th {
  background-color: #f1f7fd;
  font-weight: normal;
  text-align: left;
}

.tiptap table td > ul[data-type='taskList'] {
  list-style: none;
  margin: 0.2rem 0 !important;
  padding: 0;
}

.tiptap table .selectedCell {
  position: relative;
  border: 1px solid #3b82f6 !important;
  outline: none;
}

.tiptap table .selectedCell::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(59, 130, 246, 0.08);
  pointer-events: none;
  z-index: 1;
}

.tiptap table .column-resize-handle {
  background-color: var(--chart-2);
  bottom: -2px;
  pointer-events: none;
  position: absolute;
  right: -2px;
  top: 0;
  width: 4px;
  z-index: 10;
}

.tiptap.resize-cursor {
  cursor: ew-resize;
  cursor: col-resize;
}

.tiptap .tableWrapper {
  margin: 1.5rem 0;
  overflow-x: auto;
}

.tiptap pre,
.tiptap code {
  font-family: "JetBrains Mono", monospace;
}

.tiptap pre {
  background: #f5f8fd;
  border-radius: 0.3rem;
  margin: 0.5rem 0;
  padding: 0.6rem 0.9rem;
}

.tiptap pre code {
  background: none;
  color: inherit;
  font-size: 0.8rem;
  padding: 0;
}

/* Link styles */
.tiptap a {
  color: #3b82f6;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.tiptap a:hover {
  color: #1d4ed8;
}

.tiptap blockquote {
  border-left: 3px solid var(--chart-2);
  margin: 1.5rem 0;
  padding-left: 1rem;
}

/* Remove default browser disclosure triangle */
.tiptap details summary::-webkit-details-marker {
  display: none !important;
}

.tiptap details {
  font-size: inherit;
  border: 1px solid #ced3d8;
  border-radius: 6px;
  padding: 0.4rem 0.5rem;
  margin: 1rem 0;
}

.tiptap details > summary {
  list-style: none;
  font-weight: normal;
  display: flex;
  align-items: center;
  position: relative;
  padding-left: 1.5rem;
  user-select: none;
}

.tiptap details > summary span,
.tiptap details > summary span > * {
  font-size: inherit;
}

.tiptap details > summary:focus {
  outline: none;
  border: none;
}

.tiptap details > summary:focus-visible {
  outline: none;
}

.tiptap details > summary:active {
  outline: none;
  border: none;
}

/* Custom CSS Arrow Icon */
.tiptap details > summary::before {
  content: '';
  position: absolute;
  left: 5px;
  width: 6px;
  height: 6px;
  cursor: pointer;
  border-right: 2px solid #64748b;
  border-bottom: 2px solid #64748b;
  transform: rotate(-45deg);
  transition: transform 0.2s ease-in-out;
}

/* Rotate arrow when open */
.tiptap details[open] > summary::before {
  transform: rotate(45deg);
}

.tiptap .details-content {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  border-top: 1px solid #d4dbe5;
}

.tiptap .column-block {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin: 0.5em 0;
}

.tiptap .column {
  min-width: 0;
}

.tiptap .column > *:last-child {
  margin-bottom: 0;
}

.tiptap hr {
  border: none;
  border-top: 1px solid #d4dbe5;
  cursor: pointer;
  margin: 1rem 0;
}

.tiptap hr.ProseMirror-selectednode {
  border-top: 1px solid #d4dbe5;
}

.tiptap .spell-error {
  text-decoration: underline wavy red;
}

.tiptap .page-break {
  border-top: 2px dashed #cbd5e1;
  margin: 30px -25mm;
  padding: 10px 0;
  text-align: center;
  position: relative;
  page-break-after: always;
}

.tiptap .page-break::after {
  content: 'Page Break';
  background: #f1f5f9;
  padding: 2px 10px;
  font-size: 11px;
  color: #64748b;
  border-radius: 4px;
  font-family: 'Google Sans', Roboto, Arial, Helvetica, sans-serif;
  border: 1px solid #e2e8f0;
}

@media print {
  .tiptap .page-break { border-top: 0 !important; }
  .tiptap .page-break::after { display: none; }
}

.tiptap .vertical-align-box {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  box-sizing: border-box;
}

.tiptap .vertical-align-box.vertical-align-top { justify-content: flex-start !important; }
.tiptap .vertical-align-box.vertical-align-middle { justify-content: center !important; }
.tiptap .vertical-align-box.vertical-align-bottom { justify-content: baseline !important; }

/*
 * Custom resizable-image extension's alignment fix (export-only).
 *
 * That extension's own renderHTML only emits a data-alignment marker
 * attribute — the actual centering/right-alignment only ever happens live,
 * applied imperatively by its React node view (ImageResizeViewer). A bare
 * getHTML()/generateHTML() call never runs that node view at all, so
 * without these rules every exported image silently falls back to the
 * browser's default (left). These attribute selectors give the existing
 * marker attribute real visual meaning in the exported file, without
 * touching the extension itself.
 */
.tiptap img[data-alignment='left'] { display: block; margin: 0 auto 0 0; }
.tiptap img[data-alignment='center'] { display: block; margin: 0 auto; }
.tiptap img[data-alignment='right'] { display: block; margin: 0 0 0 auto; }
`;

export default downloadHtml;