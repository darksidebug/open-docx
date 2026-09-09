'use client'

import { useState, useEffect, useRef } from 'react'
import { type Editor } from '@tiptap/react';
import { CellSelection } from '@tiptap/pm/tables';
import  {
  MoreVertical,
  TableCellsMergeIcon,
  TableCellsSplit,
  PaintBucket,
  Baseline,
  Plus,
  Trash,
  Trash2,
  BetweenVerticalStart,
  BetweenHorizontalEnd,
  BetweenVerticalEnd,
  PanelLeftOpen,
  PanelRightOpen,
  Columns2,
  Highlighter,
  ListX,
  XLineTop,
  Minus,
  Menu,
  SquareDashedTopSolid,
  AlignStartVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { cn } from '@/lib/utils';

export default function TableBubbleMenu({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null)
  const { editor, colorSet } = useEditorStore();

  useEffect(() => {
    if (!editor || !containerRef.current) return

    const updatePosition = () => {
      const isInTable =
        editor.isActive('table') ||
        editor.isActive('tableCell') ||
        editor.isActive('tableHeader')

      if (!isInTable) {
        setIsVisible(false)
        return
      }

      try {
        const { from, empty } = editor.state.selection

        setHasSelection(!empty);

        const coords = editor.view.coordsAtPos(from)
        const containerRect = containerRef.current?.getBoundingClientRect()

        if (!containerRect) return

        const top = coords.top - 40
        const left = coords.left

        setPosition({ top: Math.max(10, top), left: Math.max(10, left) })
        setIsVisible(true)
      } catch {
        setIsVisible(false)
      }
    }

    editor.on('selectionUpdate', updatePosition)
    editor.on('transaction', updatePosition)
    editor.on('focus', updatePosition)

    return () => {
      editor.off('selectionUpdate', updatePosition)
      editor.off('transaction', updatePosition)
      editor.off('focus', updatePosition)
    }
  }, [editor, containerRef])

  useEffect(() => {
    const clearPosition = () => {
      if (isVisible) {
        setIsVisible(false);
      }
    }

    window.addEventListener('scroll', clearPosition);

    return () => {
      window.removeEventListener('scroll', () => {});
    }
  }, [isVisible])

  if (!editor || !isVisible || !position) return null;
  // console.log(editor.isActive({ textAlign: 'left' }),
  //             editor.getAttributes('tableCell').textAlign)
  return (
    <div
      ref={menuRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="fixed z-19 flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-lg p-1 text-xs -translate-x-1/2 print:hidden"
    >

      <div className='relative group'>
        <button
          type="button"
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-40"
          title="Row and Column"
        >
          <MoreVertical className='size-4 rotate-90' />
        </button>
        <div className="absolute -left-2 top-full min-w-45 text-[12px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().addColumnBefore().run()
            }} 
            className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
          >
            Insert Column Left
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().addColumnAfter().run()
            }} 
            className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
          >
            Insert Column Right
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().addRowBefore().run()
            }} 
            className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
          >
            Insert Row Before
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().addRowAfter().run()
            }} 
            className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
          >
            Insert Row After
          </button>

          <div className="h-px w-full border-t border-gray-200 dark:bg-zinc-800" />

          <button
            type="button"
            onClick={() => {
              editor.chain().focus().deleteColumn().run()
            }} 
            className="px-3 py-1.25 text-left hover:bg-red-50 hover:text-red-600 dark:hover:bg-zinc-700 cursor-pointer"
          >
            Remove Column
          </button>
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().deleteRow().run()
            }} 
            className="px-3 py-1.25 text-left hover:bg-red-50 hover:text-red-600 dark:hover:bg-zinc-700 cursor-pointer"
          >
            Remove Row
          </button>
        </div>
      </div>

      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

      {/* Merging Cells */}
      <div className='flex items-center gap-1'>
        <button
          type="button"
          onClick={() => editor.chain().focus().mergeCells().run()}
          disabled={!editor.can().mergeCells()}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:cursor-not-allowed"
          title="Merge Selected Cells"
        >
          <TableCellsMergeIcon className='size-4' />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().splitCell().run()}
          disabled={!editor.can().splitCell()}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:cursor-not-allowed"
          title="Undo Merge (Split Cell)"
        >
          <TableCellsSplit className='size-4' />
        </button>
      </div>

      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

      <div className="relative group">
        <button
          disabled={!editor?.isActive('table')}
          type="button"
          className="p-1 rounded disabled:hover:bg-transparent dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Horizontal Align"
        >
          {(() => {
            if ((editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) === 'center') {
              return <AlignCenter className="size-4" />;
            }

            if ((editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) === 'right') {
              return <AlignRight className="size-4" />;
            }

            return <AlignLeft className="size-3.75" />;
          })()}
        </button>
        {editor?.isActive('table') && (
          <div className="absolute -left-2 top-full text-[13px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-20 min-w-32.5 overflow-hidden">
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.setTextAlign('left')?.run()} 
              className={cn(
                "px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer",
                ((editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) || 'left') === 'left'
                  ? 'text-blue-600'
                  : ''
              )}
            >
              Align Left
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.setTextAlign('center')?.run()}
              className={cn(
                "px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer",
                (editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) === 'center'
                  ? 'text-blue-600'
                  : ''
              )}
            >
              Align Center
            </button>
            <button
              type="button" 
              onClick={() => editor?.chain()?.focus()?.setTextAlign('right')?.run()} 
              className={cn(
                "px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer",
                (editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) === 'right'
                  ? 'text-blue-600'
                  : ''
              )}
            >
              Align Right
            </button>
          </div>
        )}
      </div>

      <div className="relative group">
        <button
          disabled={!editor?.isActive('table')}
          type="button"
          className="p-1 rounded hover:bg-zinc-200 disabled:hover:bg-transparent dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Vertical Align"
        >
          <AlignStartVertical className="size-3.75" />
        </button>
        {editor?.isActive('table') && (
          <div className="absolute -left-2 top-full text-[13px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-20 min-w-32.5 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().setVerticalAlign('top').run()
              }} 
              className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
            >
              Align Top
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setVerticalAlign('middle').run()}
              className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
            >
              Align Middle
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setVerticalAlign('bottom').run()}
              className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
            >
              Align Bottom
            </button>
          </div>
        )}
      </div>

      <div className='relative group'>
        <button className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Background Color">
          <PaintBucket className='size-4' />
        </button>
        <div className='hidden group-hover:block absolute -left-6 top-6 z-10 py-2.5 px-3 rounded-lg shadow-lg border border-gray-200 bg-white text-[13px]'>
          <div className='flex flex-col gap-y-0.75 p-1'>
            {colorSet.map((colors, index) => (
              <div
                key={index}
                className='flex items-center gap-x-0.75'
              >
                {colors.map(color => (
                  <button
                    key={color}
                    className='size-5 rounded-full border border-gray-300 cursor-pointer'
                    style={{
                      backgroundColor: `${color}`
                    }}
                    onClick={() => editor?.chain()?.focus()?.setCellAttribute('backgroundColor', color)?.run()}
                  />
                )).reverse()}
              </div>
            ))}
          </div>

          <div className='relative mt-3 pt-1 border-t border-gray-200'>
            <label
              className="w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer"
            >
              Custom Color
              <input
                type="color"
                className="sr-only absolute -left-58.75 -top-4 shadow-lg"
                onChange={(e) => editor?.chain()?.focus()?.setCellAttribute('backgroundColor', e.target.value)?.run()}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="p-1 hover:bg-red-500 dark:hover:bg-red-500 rounded text-red-400 hover:text-white dark:text-zinc-300 disabled:opacity-40 cursor-pointer"
        title="Remove Table"
      >
        <Trash2 className='size-4' />
      </button>
    </div>
  )
}