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

  atom: true,

  draggable: true,

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
      /** The signer's typed name, shown on the line under the signature image. */
      name: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-name"),
        renderHTML: (attributes) => (attributes.name ? { "data-name": attributes.name } : {}),
      },
      signedAt: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-signed-at"),
        renderHTML: (attributes) => (attributes.signedAt ? { "data-signed-at": attributes.signedAt } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="e-signature"]' }];
  },

  // A full signature block: the drawn/uploaded image, then the signer's
  // typed name on an underlined line, then a fixed "Name and Signature"
  // caption — matching a standard printed signature block (Word's
  // Insert > Signature Line renders the same three-part layout).
  renderHTML({ HTMLAttributes, node }) {
    const { width, height, src, name } = node.attrs;
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
        { style: `width: 100%; height: ${height}px;` },
        ...(src ? [["img", { src, alt: "Signature", style: "width: 100%; height: 100%; object-fit: contain;" }]] : []),
      ],
      [
        "div",
        { style: "border-bottom: 1px solid #6b7280; text-align: center; padding-bottom: 2px; min-height: 1.2em;" },
        name || "",
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
