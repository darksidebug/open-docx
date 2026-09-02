'use client'

import { useState, useEffect, useRef } from 'react'
import { type Editor } from '@tiptap/react';
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
  Minus
} from 'lucide-react';

export default function TableBubbleMenu({ editor, containerRef }: { editor: Editor; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
        const { from } = editor.state.selection
        const coords = editor.view.coordsAtPos(from)
        const containerRect = containerRef.current?.getBoundingClientRect()

        if (!containerRect) return

        // Calculate position relative to the editor container
        const top = coords.top - 45 // Position slightly above selection
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

  if (!editor || !isVisible || !position) return null

  return (
    <div
      ref={menuRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="absolute z-50 flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-lg p-1 text-xs -translate-x-1/2"
    >
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-40"
        title="Add Column"
      >
        <Columns2 className='size-4' />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300"
        title="Add Row"
      >
        <BetweenVerticalStart className='size-4 rotate-90' />
      </button>

      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

      {/* Merging Cells */}
      <div className='flex items-center gap-1'>
        <button
          type="button"
          onClick={() => editor.chain().focus().mergeCells().run()}
          disabled={!editor.can().mergeCells()}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-40"
          title="Merge Selected Cells"
        >
          <TableCellsMergeIcon className='size-4' />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().splitCell().run()}
          disabled={!editor.can().splitCell()}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-40"
          title="Undo Merge (Split Cell)"
        >
          <TableCellsSplit className='size-4' />
        </button>
      </div>

      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

      {/* Text and Fill Color */}
      <div className="flex items-center gap-1">
        <label className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Background Color">
          <PaintBucket className='size-4' />
          <input
            type="color"
            onChange={(e) => editor.chain().focus().setCellAttribute('backgroundColor', e.target.value).run()}
            className="sr-only"
          />
        </label>

        <label className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Highlight Color">
          <Highlighter className="w-4 h-4" />
          <input
            type="color"
            className="sr-only"
            onChange={(e) => editor?.chain()?.focus()?.setHighlight({ color: e.target.value })?.run()}
          />
        </label>

        <label className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Font Color">
          <Baseline className="w-4 h-4" />
          <input
            type="color"
            className="sr-only"
            onChange={(e) => editor?.chain()?.focus()?.setColor(e.target.value)?.run()}
          />
        </label>
      </div>

      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-40"
        title="Remove column"
      >
        <XLineTop className='size-3.75' />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-40"
        title="Remove row"
      >
        <ListX className='size-4' />
      </button>

      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="p-1 hover:bg-red-500 dark:hover:bg-red-500 rounded text-red-400 hover:text-white dark:text-zinc-300 disabled:opacity-40"
        title="Remove Table"
      >
        <Trash2 className='size-4' />
      </button>
    </div>
  )
}