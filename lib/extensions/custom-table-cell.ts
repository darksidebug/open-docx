import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { mergeAttributes } from '@tiptap/core'

export interface TableCellOptions {
  HTMLAttributes: Record<string, any>;
}

export type BorderStyleValue = 'none' | 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset';

export interface CellBorderSide {
  width?: string;   // e.g. '1px', '2px'
  style?: BorderStyleValue;
  color?: string;   // e.g. '#ced3d8'
}

// Shared side-targeting type for both border and padding controls -- "top"/
// "right"/"bottom"/"left" individually, an array of sides, or "all" of them.
export type CellSideKey = 'top' | 'right' | 'bottom' | 'left';
export type CellSideSelector = CellSideKey | CellSideKey[] | 'all';
/** @deprecated kept as an alias -- use CellSideKey */
export type BorderSideKey = CellSideKey;
/** @deprecated kept as an alias -- use CellSideSelector */
export type BorderSideSelector = CellSideSelector;

const ALL_SIDES: CellSideKey[] = ['top', 'right', 'bottom', 'left'];

function resolveSides(selector: CellSideSelector): CellSideKey[] {
  if (selector === 'all') return ALL_SIDES;
  return Array.isArray(selector) ? selector : [selector];
}

/** Attr key for a given side's padding, e.g. 'top' -> 'paddingTop'. */
function paddingAttrKey(side: CellSideKey): 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft' {
  return (`padding${side.charAt(0).toUpperCase()}${side.slice(1)}`) as any;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customTableCell: {
      /** Set background color for the selected table cell/header */
      setCellBackgroundColor: (color: string) => ReturnType;
      /** Set text color for the selected table cell/header */
      setCellTextColor: (color: string) => ReturnType;
      /** Set padding on one, several, or all sides independently (e.g. setCellPadding('top', '12px'), or setCellPadding('all', '8px') for every side at once) */
      setCellPadding: (sides: CellSideSelector, value: string) => ReturnType;
      /** Revert the given side(s)' padding to the table's own default (removes the override entirely) */
      unsetCellPadding: (sides: CellSideSelector) => ReturnType;
      /**
       * Merge border properties (width/style/color) onto one, several, or
       * all sides. Only the fields you pass are changed — e.g. calling
       * setCellBorder('all', { color: '#ff0000' }) recolors every side's
       * border without touching whatever width/style was already set.
       */
      setCellBorder: (sides: BorderSideSelector, border: CellBorderSide) => ReturnType;
      /** Convenience wrapper: set only the width for the given side(s). */
      setCellBorderWidth: (sides: BorderSideSelector, width: string) => ReturnType;
      /** Convenience wrapper: set only the style (solid/dashed/...) for the given side(s). */
      setCellBorderStyle: (sides: BorderSideSelector, style: BorderStyleValue) => ReturnType;
      /** Convenience wrapper: set only the color for the given side(s). */
      setCellBorderColor: (sides: BorderSideSelector, color: string) => ReturnType;
      /** Explicitly remove the border on the given side(s) — wins over the table's default border, doesn't just fall back to it. */
      removeCellBorder: (sides: BorderSideSelector) => ReturnType;
      /** Revert the given side(s) to the table's own default border (removes the override entirely, unlike removeCellBorder). */
      resetCellBorder: (sides: BorderSideSelector) => ReturnType;
    };
  }
}

/** Composes one side's CellBorderSide into a CSS border-<side> shorthand value. */
function borderSideToCss(border: CellBorderSide | null | undefined): string | null {
  if (!border) return null;
  if (border.style === 'none') return 'none';
  const width = border.width || '1px';
  const style = border.style || 'solid';
  const color = border.color || 'currentColor';
  return `${width} ${style} ${color}`;
}

/** Reads a side's border back out of a live DOM element (browser CSSOM normalizes shorthand into these longhands). */
function readBorderSideFromElement(element: HTMLElement, side: BorderSideKey): CellBorderSide | null {
  const cap = side.charAt(0).toUpperCase() + side.slice(1);
  const styleProp = (element.style as any)[`border${cap}Style`] as string | undefined;
  const widthProp = (element.style as any)[`border${cap}Width`] as string | undefined;
  const colorProp = (element.style as any)[`border${cap}Color`] as string | undefined;

  if (styleProp) {
    return {
      style: (styleProp as BorderStyleValue) || undefined,
      width: widthProp || undefined,
      color: colorProp || undefined,
    };
  }

  // Fallback for non-browser HTML sources (e.g. imported/generated markup)
  // where a combined data attribute was written instead of relying on the
  // browser having parsed a shorthand `border-top: ...` into longhands.
  const raw = element.getAttribute(`data-border-${side}`);
  if (!raw) return null;
  if (raw === 'none') return { style: 'none' };
  const [width, style, ...colorParts] = raw.split(' ');
  return { width, style: style as BorderStyleValue, color: colorParts.join(' ') || undefined };
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
  // --- Per-side cell padding ------------------------------------------------
  // Each side independently null (inherit the table's default, e.g.
  // `td, th { padding: 2px 5px }`) or an explicit CSS length ("12px").
  paddingTop: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.paddingTop || element.getAttribute('data-padding-top') || null,
    renderHTML: (attributes: any) => {
      if (!attributes.paddingTop) return {}
      return { 'data-padding-top': attributes.paddingTop, style: `padding-top: ${attributes.paddingTop}` }
    },
  },
  paddingRight: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.paddingRight || element.getAttribute('data-padding-right') || null,
    renderHTML: (attributes: any) => {
      if (!attributes.paddingRight) return {}
      return { 'data-padding-right': attributes.paddingRight, style: `padding-right: ${attributes.paddingRight}` }
    },
  },
  paddingBottom: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.paddingBottom || element.getAttribute('data-padding-bottom') || null,
    renderHTML: (attributes: any) => {
      if (!attributes.paddingBottom) return {}
      return { 'data-padding-bottom': attributes.paddingBottom, style: `padding-bottom: ${attributes.paddingBottom}` }
    },
  },
  paddingLeft: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.paddingLeft || element.getAttribute('data-padding-left') || null,
    renderHTML: (attributes: any) => {
      if (!attributes.paddingLeft) return {}
      return { 'data-padding-left': attributes.paddingLeft, style: `padding-left: ${attributes.paddingLeft}` }
    },
  },
  // --- Per-side borders ----------------------------------------------------
  // Each side is independently null (inherit the table's default border),
  // an explicit CellBorderSide (width/style/color, any subset), or
  // { style: 'none' } to force no border on that side regardless of the
  // table's default.
  borderTop: {
    default: null as CellBorderSide | null,
    parseHTML: (element: HTMLElement) => readBorderSideFromElement(element, 'top'),
    renderHTML: (attributes: any) => {
      const css = borderSideToCss(attributes.borderTop);
      if (!css) return {}
      return { 'data-border-top': css, style: `border-top: ${css}` };
    },
  },
  borderRight: {
    default: null as CellBorderSide | null,
    parseHTML: (element: HTMLElement) => readBorderSideFromElement(element, 'right'),
    renderHTML: (attributes: any) => {
      const css = borderSideToCss(attributes.borderRight);
      if (!css) return {}
      return { 'data-border-right': css, style: `border-right: ${css}` };
    },
  },
  borderBottom: {
    default: null as CellBorderSide | null,
    parseHTML: (element: HTMLElement) => readBorderSideFromElement(element, 'bottom'),
    renderHTML: (attributes: any) => {
      const css = borderSideToCss(attributes.borderBottom);
      if (!css) return {}
      return { 'data-border-bottom': css, style: `border-bottom: ${css}` };
    },
  },
  borderLeft: {
    default: null as CellBorderSide | null,
    parseHTML: (element: HTMLElement) => readBorderSideFromElement(element, 'left'),
    renderHTML: (attributes: any) => {
      const css = borderSideToCss(attributes.borderLeft);
      if (!css) return {}
      return { 'data-border-left': css, style: `border-left: ${css}` };
    },
  },
}

/** Attr key for a given border side, e.g. 'top' -> 'borderTop'. */
function sideAttrKey(side: BorderSideKey): 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft' {
  return (`border${side.charAt(0).toUpperCase()}${side.slice(1)}`) as any;
}

/**
 * Shared implementation for setCellBorder/setCellBorderWidth/etc, used by
 * both CustomTableCell and CustomTableHeader — merges the given partial
 * border update onto whichever side(s) are targeted, cell by cell, via
 * ProseMirror's own selection-aware table commands (updateAttributes only
 * touches the currently selected cell; a table-wide selection spanning
 * multiple cells is handled by Tiptap's table extension internally the
 * same way setCellAttribute already does for the other shared attrs).
 */
function applyBorderToSides(commands: any, sides: BorderSideSelector, partial: CellBorderSide, currentGetter: (key: string) => CellBorderSide | null) {
  let ran = true;
  for (const side of resolveSides(sides)) {
    const key = sideAttrKey(side);
    const existing = currentGetter(key) || {};
    const merged: CellBorderSide = { ...existing, ...partial };
    ran = commands.setCellAttribute(key, merged) && ran;
  }
  return ran;
}

const borderCommands = (extension: any) => ({
  setCellPadding:
    (sides: CellSideSelector, value: string) =>
    ({ commands }: any) => {
      let ran = true;
      for (const side of resolveSides(sides)) {
        ran = commands.setCellAttribute(paddingAttrKey(side), value) && ran;
      }
      return ran;
    },

  unsetCellPadding:
    (sides: CellSideSelector) =>
    ({ commands }: any) => {
      let ran = true;
      for (const side of resolveSides(sides)) {
        ran = commands.setCellAttribute(paddingAttrKey(side), null) && ran;
      }
      return ran;
    },

  setCellBorder:
    (sides: BorderSideSelector, border: CellBorderSide) =>
    ({ commands, editor }: any) => {
      const attrs = editor.getAttributes(extension.name);
      return applyBorderToSides(commands, sides, border, (key) => attrs[key]);
    },

  setCellBorderWidth:
    (sides: BorderSideSelector, width: string) =>
    ({ commands, editor }: any) => {
      const attrs = editor.getAttributes(extension.name);
      return applyBorderToSides(commands, sides, { width }, (key) => attrs[key]);
    },

  setCellBorderStyle:
    (sides: BorderSideSelector, style: BorderStyleValue) =>
    ({ commands, editor }: any) => {
      const attrs = editor.getAttributes(extension.name);
      return applyBorderToSides(commands, sides, { style }, (key) => attrs[key]);
    },

  setCellBorderColor:
    (sides: BorderSideSelector, color: string) =>
    ({ commands, editor }: any) => {
      const attrs = editor.getAttributes(extension.name);
      return applyBorderToSides(commands, sides, { color }, (key) => attrs[key]);
    },

  removeCellBorder:
    (sides: BorderSideSelector) =>
    ({ commands }: any) => {
      let ran = true;
      for (const side of resolveSides(sides)) {
        ran = commands.setCellAttribute(sideAttrKey(side), { style: 'none' }) && ran;
      }
      return ran;
    },

  resetCellBorder:
    (sides: BorderSideSelector) =>
    ({ commands }: any) => {
      let ran = true;
      for (const side of resolveSides(sides)) {
        ran = commands.setCellAttribute(sideAttrKey(side), null) && ran;
      }
      return ran;
    },
})

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

      ...borderCommands(this),
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

      ...borderCommands(this),
    };
  },
});