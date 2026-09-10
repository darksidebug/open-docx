'use client'

import React, { RefObject, useRef } from 'react'
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

const page = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { editor, enableTableBubble, enableRuler, enableToolbar, enableTextBubble } = useEditorStore();

  return (
    <div ref={containerRef}  className='bg-[#F9FBFD]'>
      <div className={cn(
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

        {(() => {
          console.log(editor?.isActive('table'))
          if (enableTableBubble && editor?.isActive('table')) {
            return <TableBubbleMenu />
          }

          if (
            editor?.isActive('columnBlock') && !editor?.isActive('table') ||
            editor?.isActive('columnBlock') && !editor?.isActive('customImage')
          ) {
            return <ColumnBubbleMenu />
          }

          if (
            enableTextBubble && !editor?.isActive('columnBlock') ||
            enableTextBubble && !editor?.isActive('customImage') ||
            enableTextBubble && !editor?.isActive('table')
          ) {
            return <TextBubbleMenu />
          }

          return null;
        })()}

        <Editor />
      </div>
    </div>
  )
}

export default page
