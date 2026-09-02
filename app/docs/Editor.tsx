'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image'
import ImageResize from 'tiptap-extension-resize-image'
import { CustomImageExtension } from '@/lib/extensions/image-resize'
import { useEditorStore } from '@/store/useEditorStore';

const Editor = () => {
  const { setEditor } = useEditorStore();
  
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
        class: 'focus:outline-none print:border-0 bg-white rounded-sm border border-[#C7C7C7] flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 cursor-text',
      }
    },
    extensions: [
      StarterKit,
      // Image,
      CustomImageExtension,
      // ImageResize.configure({
      //   inline: true,
      //   icons: {
      //     alignLeft: '<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>',
      //     alignCenter: '<svg xmlns="http://www.w3.org/2000/svg" ...>...</svg>',
      //   },
      // }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TableKit.configure({
        table: { resizable: true },
      }),
    ],
    content: `
        <table>
          <tbody>
            <tr>
              <th>Name</th>
              <th colspan="3">Description</th>
            </tr>
            <tr>
              <td>Cyndi Lauper</td>
              <td>Singer</td>
              <td>Songwriter</td>
              <td>Actress</td>
            </tr>
          </tbody>
        </table>
      `,
    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
  })

  return (
    <div className="h-screen size-full overflow-x-auto bg-[#F9FBFD] px-4 print:p-0 print:bg-white print:overflow-auto">
      <div className="mx-auto min-w-max flex justify-center w-204 py-4 print:py-0 print:w-full print:min-w-0">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default Editor
