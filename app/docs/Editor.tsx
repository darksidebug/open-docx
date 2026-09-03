'use client';

import React, { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit';
import { CustomImageExtension } from '@/lib/extensions/image-resize'
import { FontFamily, TextStyle, FontSize } from '@tiptap/extension-text-style';
import { CustomTableCell, CustomTableHeader } from '@/lib/extensions/custom-table-cell';
import { useEditorStore } from '@/store/useEditorStore';
import Highlight from '@tiptap/extension-highlight'
import Color from '@tiptap/extension-color'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import TextAlign from '@tiptap/extension-text-align'
import TableBubbleMenu from '@/components/extensions/TableBubbleMenu';
import CodeBlock from '@tiptap/extension-code-block'
import { Details, DetailsSummary, DetailsContent } from '@/lib/extensions/details-extension'
import { Column, ColumnBlock, columnPlaceholderText } from '@/lib/extensions/column-block';
import { PasteDefaultFont } from '@/lib/extensions/paste-default-font';
import { Placeholder } from '@tiptap/extensions'

const Editor = () => {
  const { setEditor } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    onCreate({ editor }) {
      setEditor(editor);
    },
    onDestroy() {
      setEditor(null);
    },
    onUpdate({ editor }) {
      setEditor(editor)
    },
    onSelectionUpdate({ editor }) {
      setEditor(editor)
    },
    onTransaction({ editor }) {
      setEditor(editor)
    },
    onFocus({ editor }) {
      setEditor(editor)
    },
    onBlur({ editor }) {
      setEditor(editor)
    },
    onContentError({ editor }) {
      setEditor(editor)
    },
    editorProps: {
      attributes: {
        style: 'padding-left: 56px; padding-right: 56px;',
        class: 'focus:outline-none print:border-0 bg-white rounded-sm border border-gray-200 flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 text-[14px] cursor-text',
      }
    },
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Superscript,
      Subscript,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      PasteDefaultFont.configure({
        fontFamily: 'Google Sans',
        fontSize: '14px',
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
      CodeBlock.configure({
        enableTabIndentation: true,
      }),
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
        placeholder: ({ node, pos, editor }) => {
          if (node?.type?.name === 'detailsSummary') {
            return 'Summary'
          }

          const columnText = columnPlaceholderText(node, pos, editor)
          if (columnText) return columnText

          return '';
        },
      }),
      Column,
      ColumnBlock,
    ],
    content: '',
    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
  })

  return (
    <div className="h-screen size-full overflow-x-auto bg-[#F9FBFD] px-4 print:p-0 print:bg-white print:overflow-auto">
      <div ref={containerRef} className="mx-auto min-w-max flex justify-center w-204 py-4 print:py-0 print:w-full print:min-w-0">
        <TableBubbleMenu editor={editor!} containerRef={containerRef} />
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default Editor
