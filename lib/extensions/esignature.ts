import { Node, ReactNodeViewRenderer } from "@tiptap/react";
import ESignatureViewer from "@/components/extensions/ESignatureViewer";

export interface ESignatureOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    eSignature: {
      /** Inserts a free-floating, draggable signature field at a default position. */
      setESignature: () => ReturnType;
    };
  }
}

/**
 * A signature field that floats freely over the page instead of sitting in
 * the normal text flow — the user drags it wherever it needs to go, then
 * draws their signature into it. Position/size (`x`, `y`, `width`, `height`)
 * are plain pixel offsets from the page's top-left corner, the same
 * coordinate space export-to-docx.ts / export-to-pdf.ts already use for
 * other page-relative measurements (see eSignatureNodeTo* in each).
 */
export const ESignature = Node.create<ESignatureOptions>({
  name: "eSignature",

  group: "block",

  atom: true,

  // Positioning is handled by the NodeView's own pointer-drag logic, not
  // ProseMirror's node-reordering drag (which would move it in the document
  // instead of moving it visually).
  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      x: {
        default: 40,
        parseHTML: (element) => Number(element.getAttribute("data-x")) || 40,
        renderHTML: (attributes) => ({ "data-x": attributes.x }),
      },
      y: {
        default: 40,
        parseHTML: (element) => Number(element.getAttribute("data-y")) || 40,
        renderHTML: (attributes) => ({ "data-y": attributes.y }),
      },
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
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-src"),
        renderHTML: (attributes) => (attributes.src ? { "data-src": attributes.src } : {}),
      },
      signedBy: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-signed-by"),
        renderHTML: (attributes) => (attributes.signedBy ? { "data-signed-by": attributes.signedBy } : {}),
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

  renderHTML({ HTMLAttributes, node }) {
    const { x, y, width, height, src } = node.attrs;
    return [
      "div",
      {
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
        "data-type": "e-signature",
        style: `position: absolute; left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px;`,
      },
      ...(src ? [["img", { src, alt: "Signature", style: "width: 100%; height: 100%; object-fit: contain;" }]] : []),
    ];
  },

  addCommands() {
    return {
      setESignature:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { x: 40, y: 40, width: 220, height: 90 },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ESignatureViewer);
  },
});

export default ESignature;
