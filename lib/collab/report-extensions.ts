import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { FontFamily, TextStyle, FontSize } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextAlign from '@tiptap/extension-text-align';
import { CustomImageExtension } from '@/lib/extensions/image-resize';
import { CustomTableCell, CustomTableHeader } from '@/lib/extensions/custom-table-cell';
import { Column, ColumnBlock } from '@/lib/extensions/column-block';
import { PasteDefaultFont } from '@/lib/extensions/paste-default-font';
import { LineHeightExtension } from '@/lib/extensions/line-height';
import { PageBreak } from '@/lib/extensions/page-break';
import { VerticalAlign } from '@/lib/extensions/vertical-align';

/**
 * Extensions used to turn the live Yjs document into Tiptap JSON/HTML for the
 * auto-saved reporting snapshot (see server/collab-server.ts). This schema
 * runs headless in Node (no browser), so it deliberately leaves out the
 * Details/expandable-section extension: that extension's renderHTML calls
 * the bare global `document.createElement` instead of the schema's own
 * document, which only resolves inside a real browser or live editor — in a
 * plain Node process it has no global `document` to find. Any details blocks
 * in a document are therefore omitted from the saved report until that
 * extension is made headless-safe.
 *
 * This list otherwise mirrors the live editor's extensions in
 * app/docs/[id]/Editor.tsx, minus Collaboration/CollaborationCaret
 * (irrelevant headless) and Placeholder (a decoration, not real content).
 */
export const REPORT_EXTENSIONS = [
  StarterKit.configure({
    codeBlock: {
      enableTabIndentation: true,
      HTMLAttributes: {
        style: 'font-family: "JetBrains Mono", monospace;',
      },
    },
    undoRedo: false,
  }),
  VerticalAlign,
  PageBreak,
  LineHeightExtension,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Superscript,
  Subscript,
  Highlight.configure({ multicolor: true }),
  FontFamily,
  PasteDefaultFont.configure({
    fontFamily: 'Google Sans',
    fontSize: '13px',
  }),
  TextStyle,
  Color,
  FontSize,
  CustomImageExtension,
  TaskList,
  TaskItem.configure({ nested: true }),
  TableKit.configure({
    table: { resizable: true },
  }),
  CustomTableCell,
  CustomTableHeader,
  Column,
  ColumnBlock,
];
