'use client'

import { useEditorStore } from '@/store/useEditorStore'
import {
  BetweenVerticalEnd,
  Bubbles,
  Clipboard,
  Copy,
  Download,
  File,
  Folder,
  Highlighter,
  PaintRoller,
  Pencil,
  PencilRuler,
  Pipette,
  Printer,
  Redo2,
  RotateCwSquare,
  Ruler,
  Scissors,
  SquareDashed,
  ToolCase,
  Trash2,
  TypeOutline,
  Undo2,
  X,
  Image as ImageIcon,
  Table,
  SquareCenterlineDashedVertical,
  Minus,
  Code,
  Quote,
  Columns2,
  ListCollapse,
  LinkIcon,
  Bold,
  AlignJustify,
  ListChevronsUpDownIcon,
  Italic,
  AlignLeft,
  Baseline,
  Eraser,
  IndentIncrease,
  Subscript,
  Superscript,
  List,
  Strikethrough,
  Underline
} from 'lucide-react'
import Image from 'next/image'
import { useContext, useState } from 'react'
import { ActiveMarks } from './Toolbar2'
import { cn } from '@/lib/utils'

const ToolbarMenu = () => {
  const {
    editor,
    handleCopyFormat,
    handlePasteFormat,
    formatBuffer,
    clearCurrentBlockText,
    selectCurrentText,
    enableImageBubble,
    setEnableImageBubble,
    enableTableBubble,
    setEnableTableBubble,
    enableTextBubble,
    setEnableTextBubble,
    enableRuler,
    setEnableRuler,
    enableToolbar,
    setEnableToolbar
  } = useEditorStore();

  if (!editor) return null;

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
    <div className='flex items-center'>
      <div className='h-12 w-12'>
        <Image
          src='/logo/docx.png'
          alt='logo'
          height={120}
          width={120}
        />
      </div>
      <div className=''>
        <div className="ml-2 text-lg">Untitled document</div>
        <div className="flex items-center gap-0.5 text-[13px]">
          <div className='relative group'>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>File</button>
            <div className='hidden group-hover:flex absolute top-full flex-col gap-y-0.5 z-20 min-w-60 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
              {/* <label className='block p-1'>
                Upload
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleDocxUpload}
                />
              </label> */}
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
              >
                <File className='size-3.75' />
                New
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Folder className='size-3.75' />
                Open
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Copy className='size-3.75' />
                Make a copy
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Pencil className='size-3.75' />
                Rename
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Download className='size-3.75' />
                Download
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Printer className='size-3.75' />
                Print
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-red-50 hover:text-red-600 cursor-pointer'
              >
                <Trash2 className='size-3.75' />
                Move to trash
              </button>
            </div>
          </div>
          <div className='relative group'>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>Edit</button>
            <div className='hidden group-hover:flex absolute top-full flex-col gap-y-0.5 z-20 min-w-70 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
              <button
                onClick={() => document.execCommand('undo')}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
              >
                <Undo2 className='size-3.75' />
                Undo
              </button>
              <button
                onClick={() => document.execCommand('redo')}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Redo2 className='size-3.75' />
                Redo
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={() => document.execCommand('cut')}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Scissors className='size-3.75' />
                Cut
              </button>
              <button
                onClick={() => document.execCommand('copy')}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Copy className='size-3.75' />
                Copy
              </button>
              <button
                onClick={async () => {
                  const text = await navigator.clipboard.readText();
                  console.log(text)
                  editor.chain().focus().insertContent(text).run();
                }}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Clipboard className='size-3.75' />
                Paste
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <label
                className="w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer"
              >
                <Highlighter className="size-3.75" />
                Highlight
                <input
                  type="color"
                  className="sr-only"
                  onChange={(e) => editor?.chain()?.focus()?.toggleHighlight({ color: e.target.value })?.run()}
                />
              </label>
              <label
                className="w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer"
              >
                <Baseline className="size-4" />
                Font color
                <input
                  type="color"
                  className="sr-only"
                  onChange={(e) => editor?.chain()?.focus()?.setColor(e.target.value)?.run()}
                />
              </label>
              <button
                onClick={handleCopyFormat}
                className={cn(
                  'w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer',
                  formatBuffer ? "bg-gray-100 text-blue-500" : ""
                )}
              >
                <Pipette className='size-3.75' />
                Copy format
              </button>
              <button
                onClick={handlePasteFormat}
                disabled={!formatBuffer}
                className={cn(
                  'w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100',
                  !formatBuffer ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                )}
              >
                <PaintRoller className='size-3.75' />
                Paste format
              </button>
              <button
                onClick={selectCurrentText}
                disabled={isBlockEmpty()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:cursor-not-allowed'
              >
                <SquareDashed className='size-3.75' />
                Select all
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={clearCurrentBlockText}
                disabled={isBlockEmpty()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 hover:text-red-600 cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:cursor-not-allowed'
              >
                <X className='size-3.75' />
                Remove text
              </button>
              <button
                onClick={() => editor.commands.clearContent()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-red-50 hover:text-red-600 cursor-pointer'
              >
                <Trash2 className='size-3.75' />
                Delete page content
              </button>
            </div>
          </div>
          <div className='relative group'>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>View</button>
            <div className='hidden group-hover:flex absolute top-full flex-col gap-y-0.5 z-20 min-w-60 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
              <button
                onClick={() => setEnableImageBubble(!enableImageBubble)}
                className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
              >
                <RotateCwSquare className='size-3.75' />
                Image bubble
                <span className={cn(
                    'absolute right-4 size-1.5 rounded-full bg-blue-500',
                    enableImageBubble ? 'bg-blue-500' : 'bg-gray-400'
                  )}
                />
              </button>
              <button
                onClick={() => setEnableTableBubble(!enableTableBubble)}
                className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <BetweenVerticalEnd className='size-3.75' />
                Table bubble
                <span className={cn(
                    'absolute right-4 size-1.5 rounded-full bg-blue-500',
                    enableTableBubble ? 'bg-blue-500' : 'bg-gray-400'
                  )}
                />
              </button>
              <button
                onClick={() => setEnableTextBubble(!enableTextBubble)}
                className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Bubbles className='size-3.75' />
                Text bubble
                <span className={cn(
                    'absolute right-4 size-1.5 rounded-full bg-blue-500',
                    enableTextBubble ? 'bg-blue-500' : 'bg-gray-400'
                  )}
                />
              </button>
              <button
                onClick={() => setEnableRuler(!enableRuler)}
                className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Ruler className='size-3.75' />
                Show ruler
                <span className={cn(
                    'absolute right-4 size-1.5 rounded-full bg-blue-500',
                    enableRuler ? 'bg-blue-500' : 'bg-gray-400'
                  )}
                />
              </button>
              <button
                onClick={() => setEnableToolbar(!enableToolbar)}
                className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <ToolCase className='size-3.75' />
                Show toolbar
                <span className={cn(
                    'absolute right-4 size-1.5 rounded-full bg-blue-500',
                    enableToolbar ? 'bg-blue-500' : 'bg-gray-400'
                  )}
                />
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              {/* TODO: add option for toolbar display: compact, minimal, fluid */}
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-gray-100 cursor-pointer'
              >
                <PencilRuler className='size-3.75' />
                Toolbar display
              </button>
            </div>
          </div>
          <div className='relative group'>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>Insert</button>
            <div className='hidden group-hover:flex absolute top-full flex-col gap-y-0.5 z-20 min-w-70 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
              >
                <ImageIcon className='size-3.75' />
                Image
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true })?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Table className='size-3.75' />
                Table
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <LinkIcon className='size-3.75' />
                Hyperlink
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.toggleBlockquote()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Quote className='size-3.75' />
                Block quote
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.toggleCodeBlock()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Code className='size-3.75' />
                Code block
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.setDetails()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <ListCollapse className='size-3.75' />
                Detail view
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={() => editor?.chain()?.focus()?.unsetSubscript()?.toggleSuperscript()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Superscript className='size-3.75' />
                Superscript
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.unsetSuperscript()?.toggleSubscript()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Subscript className='size-3.75' />
                Subscript
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={() => editor.chain().focus().insertColumns().run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Columns2 className='size-3.75' />
                Column
              </button>
              <button
                onClick={() => editor.chain()?.focus()?.setHorizontalRule()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Minus className='size-3.75' />
                Line
              </button>
              <button
                onClick={() => editor?.commands.setPageBreak()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-gray-100 cursor-pointer'
              >
                <SquareCenterlineDashedVertical className='size-3.75' />
                Page break
              </button>
            </div>
          </div>
          <div className='relative group'>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>Format</button>
            <div className='hidden group-hover:flex absolute top-full flex-col gap-y-0.5 z-20 min-w-70 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
              >
                <Bold className='size-3.75' />
                Bold text
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Italic className='size-3.75' />
                Italic
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Underline className='size-3.75' />
                Underline
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Strikethrough className='size-3.75' />
                Strikethrough
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <AlignJustify className='size-3.75' />
                Paragraph styles
                {/* TODO: add options */}
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <ListChevronsUpDownIcon className='size-3.75' />
                Line spacing
                {/* TODO: add options */}
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <List className='size-3.75' />
                Bullet and numbering
                {/* TODO: add optiions */}
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <AlignLeft className='size-3.75' />
                Text alignment
                {/* TODO: add options */}
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Baseline className='size-3.75' />
                Color
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <IndentIncrease className='size-3.75' />
                Indentation
                {/* TODO: add option */}
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Table className='size-3.75' />
                Table
                {/* TODO: add option */}
              </button>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <ImageIcon className='size-3.75' />
                Image
                {/* TODO: add option */}
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-gray-100 cursor-pointer'
              >
                <Eraser className='size-3.75' />
                Clear formatting
              </button>
            </div>
          </div>
          <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>Help</button>
        </div>
      </div>
    </div>
  )
}

export default ToolbarMenu
