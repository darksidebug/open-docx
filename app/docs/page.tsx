'use client'

import React, { useRef } from 'react'
import Editor from './Editor'
import Toolbar from '@/components/Toolbar'
import Toolbar2 from '@/components/Toolbar2'
import Ruler from '@/components/Ruler'
import TableBubbleMenu from '@/components/extensions/TableBubbleMenu'
import Toolbar3 from '@/components/Toolbar3'

const page = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef}  className='bg-[#F9FBFD]'>
      <div className='flex flex-col w-full sticky top-0 left-0 z-20 bg-[#F9FBFD] print:hidden'>
        {/* <Toolbar3 /> */}
        <Toolbar2 />
        {/* <Toolbar /> */}
        <Ruler />
      </div>

      <div className='document-workspace'>
        <TableBubbleMenu containerRef={containerRef} />
        <Editor />
      </div>
    </div>
  )
}

export default page
