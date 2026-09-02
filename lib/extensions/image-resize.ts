import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import ImageComponent from "@/components/extensions/ImageResizeViewer";

export interface ImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customImage: {
      /**
       * Insert an image with optional attributes
       */
      setImage: (options: { src: string; alt?: string; title?: string; width?: string; alignment?: string }) => ReturnType;
      /**
       * Set width for the selected image
       */
      setImageWidth: (width: string) => ReturnType;
      /**
       * Set alignment for the selected image
       */
      setImageAlignment: (alignment: 'left' | 'center' | 'right') => ReturnType;
    };
  }
}

export const CustomImageExtension = Node.create<ImageOptions>({
  name: "customImage",

  group: "block",

  draggable: true,

  isolating: true,

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: "100%",
        parseHTML: (element) => element.getAttribute("data-width") || element.style.width || "100%",
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            "data-width": attributes.width,
            style: `width: ${attributes.width}`,
          };
        },
      },
      alignment: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-alignment") || "center",
        renderHTML: (attributes) => {
          if (!attributes.alignment) return {};
          return {
            "data-alignment": attributes.alignment,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },

      setImageWidth:
        (width: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { width });
        },

      setImageAlignment:
        (alignment: 'left' | 'center' | 'right') =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { alignment });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },
});