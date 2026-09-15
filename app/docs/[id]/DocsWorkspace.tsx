'use client'

import React, { RefObject, useEffect, useRef } from 'react'
import Editor from './Editor'
import Toolbar from '@/components/Toolbar'
import Toolbar2 from '@/components/Toolbar2'
import Ruler from '@/components/Ruler'
import TableBubbleMenu from '@/components/extensions/TableBubbleMenu'
import Toolbar3 from '@/components/Toolbar3'
import { useEditorStore } from '@/store/useEditorStore'
import { cn } from '@/lib/utils'
import TextBubbleMenu from '@/components/extensions/TextBubbleMenu'
import ColumnBubbleMenu from '@/components/extensions/ColumnBubbleMenu'
import type { CollabUser } from '@/lib/auth/user'
import BubbleMenu from '@tiptap/extension-bubble-menu'
import BubbleMenuContent from '@/components/extensions/BubbleMenuContent'

interface DocsWorkspaceProps {
  user: CollabUser;
  documentId: string;
  documentTitle?: string;
}

const DocsWorkspace = ({ user, documentId, documentTitle }: DocsWorkspaceProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { editor, enableTableBubble, enableRuler, enableToolbar, enableTextBubble, setDocumentName } = useEditorStore();

  useEffect(() => {
    if (documentTitle) setDocumentName(documentTitle);
  }, [documentTitle, setDocumentName]);

  const isBlockEmpty = () => {
    if (!editor) return true;
    const { $from } = editor.state.selection;
    const parent = $from.parent;
    
    if (parent.type.name === "paragraph" || parent.type.name === "heading") {
      return parent.textContent.trim() === "";
    }
    return true;
  };

  return (
    <div ref={containerRef}  className='bg-[#F9FBFD]'>
      <div
        id="docs-toolbar"
        className={cn(
          'flex flex-col w-full sticky top-0 left-0 z-20 bg-[#F9FBFD] print:hidden',
          (!enableToolbar && !enableRuler) && 'pb-3 border-b border-gray-200'
        )}
      >
        {/* <Toolbar3 /> */}
        <Toolbar2 />
        {/* <Toolbar /> */}

        {enableRuler && <Ruler />}
      </div>

      <div className='mb-8 document-workspace'>

        <BubbleMenuContent />

        <Editor user={user} documentId={documentId} />
      </div>
    </div>
  )
}

export default DocsWorkspace
