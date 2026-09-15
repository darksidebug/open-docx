import { Node, ReactNodeViewRenderer } from "@tiptap/react";
import ESignatureViewer from "@/components/extensions/ESignatureViewer";

export interface ESignatureOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    eSignature: {
      /** Inserts a signature field at the cursor position. */
      setESignature: () => ReturnType;
    };
  }
}

/**
 * A signature field, drawn or uploaded into place. Sits in the normal
 * document flow (sized by `width`/`height`, positioned by `alignment`) the
 * same way the resizable-image extension (lib/extensions/image-resize.ts)
 * does, rather than at a fixed pixel offset from the page's top-left corner.
 *
 * It used to be a free-floating overlay positioned via `x`/`y` page-pixel
 * coordinates. That broke down in real-time collaboration: two clients can
 * render the content above a fixed pixel offset at very slightly different
 * heights (font-loading timing, sync lag, even different browsers), so "40px
 * from the page top" doesn't land next to the same paragraph on every
 * screen. It also had no well-defined meaning across multiple exported pages
 * in export-to-docx.ts/export-to-pdf.ts, neither of which simulate
 * pagination. Anchoring it in the flow (like Word's or Google Docs' default
 * inline image/signature-line placement) fixes both: ProseMirror/Yjs already
 * guarantees every client agrees on flow position, and export just places it
 * as a normal paragraph like any other image.
 */
export const ESignature = Node.create<ESignatureOptions>({
  name: "eSignature",

  group: "block",

  // The signer's typed name is real editable ProseMirror content (rendered
  // through the NodeView's <NodeViewContent>, see ESignatureViewer.tsx)
  // rather than a plain string attribute, specifically so marks like bold
  // apply to it the same way they do anywhere else in the document — a
  // plain HTML <input>'s value can never carry rich formatting. That rules
  // out `atom: true` (atom nodes have no content) and `draggable: true`
  // (dragging a node with live editable text inside it fights with normal
  // text selection/editing).

  content: "inline*",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      width: {
        default: 220,
        parseHTML: (element) => Number(element.getAttribute("data-width")) || 220,
        renderHTML: (attributes) => ({ "data-width": attributes.width }),
      },
      height: {
        default: 90,
        parseHTML: (element) => Number(element.getAttribute("data-height")) || 90,
        renderHTML: (attributes) => ({ "data-height": attributes.height }),
      },
      alignment: {
        default: "left",
        parseHTML: (element) => element.getAttribute("data-alignment") || "left",
        renderHTML: (attributes) => ({ "data-alignment": attributes.alignment }),
      },
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-src"),
        renderHTML: (attributes) => (attributes.src ? { "data-src": attributes.src } : {}),
      },
      // Lets the drawn/uploaded image be nudged around within its own fixed
      // width/height box (e.g. when its aspect ratio doesn't match the
      // box's, object-fit: contain leaves slack space on one axis) — a plain
      // pixel offset from center, applied via CSS `object-position`. This is
      // purely a local, in-frame adjustment: unlike the old x/y attrs this
      // node used to have, it has no meaning outside this box, so it can't
      // drift out of sync with the surrounding document the way the removed
      // page-absolute positioning did.
      imageX: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute("data-image-x")) || 0,
        renderHTML: (attributes) => (attributes.imageX ? { "data-image-x": attributes.imageX } : {}),
      },
      imageY: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute("data-image-y")) || 0,
        renderHTML: (attributes) => (attributes.imageY ? { "data-image-y": attributes.imageY } : {}),
      },
      signedAt: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-signed-at"),
        renderHTML: (attributes) => (attributes.signedAt ? { "data-signed-at": attributes.signedAt } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="e-signature"]',
        // The node's actual (editable) content lives in the inner
        // [data-e-signature-name] div, not the outer div as a whole — the
        // image/caption around it are just static markup, not content.
        contentElement: (element) => (element as HTMLElement).querySelector("[data-e-signature-name]") ?? element,
      },
    ];
  },

  // A full signature block: the drawn/uploaded image, then the signer's
  // typed name (real editable content — see the `content` option above) on
  // an underlined line, then a fixed "Name and Signature" caption —
  // matching a standard printed signature block (Word's Insert > Signature
  // Line renders the same three-part layout).
  renderHTML({ HTMLAttributes, node }) {
    const { width, height, src, imageX, imageY } = node.attrs;
    const objectPosition = `calc(50% + ${imageX || 0}px) calc(50% + ${imageY || 0}px)`;
    return [
      "div",
      {
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
        "data-type": "e-signature",
        style: `width: ${width}px;`,
      },
      [
        "div",
        { style: `width: 100%; height: ${height}px; overflow: hidden;` },
        ...(src
          ? [["img", { src, alt: "Signature", style: `width: 100%; height: 100%; object-fit: contain; object-position: ${objectPosition};` }]]
          : []),
      ],
      [
        "div",
        { "data-e-signature-name": "", style: "border-bottom: 1px solid #6b7280; text-align: center; padding-bottom: 2px; min-height: 1.2em;" },
        0,
      ],
      ["div", { style: "text-align: center; font-size: 10px; color: #6b7280; margin-top: 2px;" }, "Name and Signature"],
    ];
  },

  addCommands() {
    return {
      setESignature:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { width: 220, height: 90 },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ESignatureViewer);
  },
});

export default ESignature;
