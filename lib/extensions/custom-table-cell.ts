import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { mergeAttributes } from '@tiptap/core'

export interface TableCellOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customTableCell: {
      /**
       * Set background color for the selected table cell/header
       */
      setCellBackgroundColor: (color: string) => ReturnType;
      /**
       * Set text color for the selected table cell/header
       */
      setCellTextColor: (color: string) => ReturnType;
    };
  }
}

const sharedTableAttributes = {
  backgroundColor: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.backgroundColor || element.getAttribute('data-background-color'),
    renderHTML: (attributes: any) => {
      if (!attributes.backgroundColor) return {}
      return {
        'data-background-color': attributes.backgroundColor,
        style: `background-color: ${attributes.backgroundColor}`,
      }
    },
  },
  textColor: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.color || element.getAttribute('data-text-color'),
    renderHTML: (attributes: any) => {
      if (!attributes.textColor) return {}
      return {
        'data-text-color': attributes.textColor,
        style: `color: ${attributes.textColor}`,
      }
    },
  },
  textAlign: {
    default: 'left',
    parseHTML: (element: HTMLElement) => element.style.textAlign || element.getAttribute('data-text-align'),
    renderHTML: (attributes: any) => {
      if (!attributes.textAlign) return {}
      return {
        'data-text-align': attributes.textAlign,
        style: `text-align: ${attributes.textAlign}`,
      }
    },
  },
  fontSize: {
    default: 'left',
    parseHTML: (element: HTMLElement) => element.style.fontSize || element.getAttribute('data-font-size'),
    renderHTML: (attributes: any) => {
      if (!attributes.fontSize) return {}
      return {
        'data-font-size': attributes.fontSize,
        style: `font-size: ${attributes.fontSize}`,
      }
    },
  },
}

export const CustomTableCell = TableCell.extend<TableCellOptions>({
  name: "tableCell",

  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      ...sharedTableAttributes,
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["td", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setCellBackgroundColor:
        (color: string) =>
        ({ commands }) => {
          return commands.setCellAttribute('backgroundColor', color);
        },

      setCellTextColor:
        (color: string) =>
        ({ commands }) => {
          return commands.setCellAttribute('textColor', color);
        },

      // setFontSize:
      //   (fontSize: string) =>
      //   ({ commands }) => {
      //     return commands.setCellAttribute('fontSize', fontSize);
      //   }
    };
  },
});

export const CustomTableHeader = TableHeader.extend<TableCellOptions>({
  name: "tableHeader",

  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      ...sharedTableAttributes,
    };
  },

  renderHTML({ HTMLAttributes }) {
    return ["th", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setCellBackgroundColor:
        (color: string) =>
        ({ commands }) => {
          return commands.setCellAttribute('backgroundColor', color);
        },

      setCellTextColor:
        (color: string) =>
        ({ commands }) => {
          return commands.setCellAttribute('textColor', color);
        },

      // setFontSize:
      //   (fontSize: string) =>
      //   ({ commands }) => {
      //     return commands.setCellAttribute('fontSize', fontSize);
      //   }
    };
  },
});