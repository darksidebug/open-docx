import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { CustomImageExtension } from '@/lib/extensions/image-resize';
import { FontFamily, TextStyle, FontSize } from '@tiptap/extension-text-style';
import { CustomTableCell, CustomTableHeader } from '@/lib/extensions/custom-table-cell';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextAlign from '@tiptap/extension-text-align';
import { Details, DetailsSummary, DetailsContent } from '@/lib/extensions/details-extension';
import { Column, ColumnBlock, columnPlaceholderText } from '@/lib/extensions/column-block';
import { PasteDefaultFont } from '@/lib/extensions/paste-default-font';
import { Placeholder } from '@tiptap/extensions';
import { LineHeightExtension } from '@/lib/extensions/line-height';
import { PageBreak } from '@/lib/extensions/page-break';
import { VerticalAlign } from '@/lib/extensions/vertical-align';
import { ESignature } from '@/lib/extensions/esignature';

/**
 * The full set of content extensions shared by every Tiptap instance in the
 * app — the live collaborative editor (app/docs/[id]/Editor.tsx) and the
 * read-only viewer (app/docs/[id]/view/DocumentViewer.tsx). Kept in one place
 * so the two never drift apart and render content differently.
 *
 * Collaboration-specific extensions (Collaboration, CollaborationCaret) are
 * NOT included here — only the live editor needs those, configured with its
 * own Yjs document/provider.
 */
export function getBaseExtensions({ undoRedo = true }: { undoRedo?: boolean } = {}) {
  return [
    StarterKit.configure({
      codeBlock: {
        enableTabIndentation: true,
        HTMLAttributes: {
          style: 'font-family: "JetBrains Mono", monospace;',
        },
      },
      // StarterKit's `undoRedo` option only accepts `false` or an options
      // object — `undefined` (i.e. omitting the key) is how you keep its
      // default history enabled, there's no literal `true`.
      ...(undoRedo ? {} : { undoRedo: false }),
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
    TaskItem.configure({
      nested: true,
    }),
    TableKit.configure({
      table: { resizable: true },
    }),
    CustomTableCell,
    CustomTableHeader,
    Details.configure({
      persist: true,
      HTMLAttributes: {
        class: 'details',
      },
    }),
    DetailsSummary,
    DetailsContent,
    Placeholder.configure({
      includeChildren: true,
      showOnlyCurrent: false,
      placeholder: ({ node, pos, editor }) => {
        if (node?.type?.name === 'detailsSummary') {
          return 'Summary';
        }

        const columnText = columnPlaceholderText(node, pos, editor);
        if (columnText) return columnText;

        return '';
      },
    }),
    Column,
    ColumnBlock,
    ESignature,
  ];
}
