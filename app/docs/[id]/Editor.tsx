'use client';

import React, { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react'
import { useEditorStore } from '@/store/useEditorStore';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { COLLAB_WS_URL } from '@/lib/collab/constants';
import { getBaseExtensions } from '@/lib/editor/base-extensions';
import type { CollabUser } from '@/lib/auth/user';

const Editor = ({ user, documentId }: { user: CollabUser; documentId: string }) => {
  const { setEditor, setCollabProvider } = useEditorStore();

  const spellChecker = () => {};

  const ydoc = useMemo(() => new Y.Doc(), []);

  const provider = useMemo(
    () =>
      new HocuspocusProvider({
        url: COLLAB_WS_URL,
        name: documentId,
        document: ydoc,
      }),
    [ydoc, documentId],
  );

  useEffect(() => {
    setCollabProvider(provider);
    return () => {
      setCollabProvider(null);
      provider.destroy();
      ydoc.destroy();
    };
  }, [provider, ydoc, setCollabProvider]);

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
        class: 'overflow-x-visible focus:outline-none print:border-0 bg-white border border-gray-200 flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 text-[13px] cursor-text',
      }
    },
    extensions: [
      // Undo/redo here is handled by the Collaboration extension's Yjs-aware
      // history instead, so the shared StarterKit config disables its own.
      ...getBaseExtensions({ undoRedo: false }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCaret.configure({
        provider,
        user: {
          name: user.displayName,
          color: user.color,
        },
      }),
    ],
    // No `content` here: the Collaboration extension loads content from the Yjs document instead.
    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
  })

  return (
    <div className="size-full bg-[#F9FBFD] px-4 print:p-0 print:bg-white print:overflow-auto">
      <div className="mx-auto min-w-max flex justify-center w-204 py-4 print:py-0 print:w-full print:min-w-0">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default Editor
