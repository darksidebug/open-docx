'use client'

import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Copy,
  Scissors,
  Clipboard,
  Paintbrush,
  AArrowUp,
  AArrowDown,
  CaseSensitive,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Superscript,
  Subscript,
  Highlighter,
  Baseline,
  Eraser,
  List,
  ListOrdered,
  ListTree,
  IndentDecrease,
  IndentIncrease,
  BetweenVerticalStart,
  Pilcrow,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  PaintBucket,
  Square,
  Link as LinkIcon,
  MessageSquare,
  Image as ImageIcon,
  Table as TableIcon,
  CheckSquare,
  Redo2,
  Undo2,
  Printer,
  Pipette,
  PaintRoller,
  ListChevronsUpDownIcon,
  ListTodo,
  Code,
  Quote,
  Minus,
  SquareCenterlineDashedVertical,
  ListCollapse,
  Columns2,
  SquareDashedTopSolid,
  AlignStartVertical,
  X,
  ToolCase,
  Ruler,
  Bubbles,
  BetweenVerticalEnd,
  RotateCwSquare,
  PencilRuler
} from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import Dropdown from './ui/customs/Dropdown';
import FontFamily from './ui/toolbars/FontFamily';
import ToolbarMenu from './ToolbarMenu';
import FontSize from './ui/toolbars/FontSize';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 36, 48, 72, 96];

const TYPOGRAPHIES = [
  {
    label: 'Heading 1',
    value: 1
  },
  {
    label: 'Heading 2',
    value: 2
  },
  {
    label: 'Heading 3',
    value: 3
  },
  {
    label: 'Heading 4',
    value: 4
  },
  {
    label: 'Heading 5',
    value: 5
  },
  {
    label: 'Paragraph',
    value: 0
  }
];

const Toolbar = () => {
  const {
    editor,
    formatBuffer,
    handleCopyFormat,
    handlePasteFormat,
    clearCurrentBlockText,
    enableImageBubble,
    setEnableImageBubble,
    enableTableBubble,
    setEnableTableBubble,
    enableRuler,
    setEnableRuler,
    enableToolbar,
    setEnableToolbar,
    enableTextBubble,
    setEnableTextBubble
  } = useEditorStore();

  const handleSetFontSize = useDebounce((size: string) => {
    editor?.chain()?.focus()?.setFontSize(`${size?.toString()?.trim()}px`)?.run()
  }, 300);

  if (!editor) {
    return null;
  }

  // Helper for font size stepping
  const changeFontSizeStep = (delta: number) => {
    const currentSize = editor.getAttributes('textStyle').fontSize || '16px';
    const numericSize = parseInt(currentSize, 10);
    const newSize = Math.max(8, numericSize + delta);
    editor?.chain()?.focus()?.setFontSize(`${newSize}px`).run();
  };

  // Helper for changing text cases
  const applyCaseChange = (caseType: string) => {
    const { from, to } = editor?.state?.selection;
    const selectedText = editor?.state?.doc?.textBetween(from, to, ' ');
    if (!selectedText) return;

    let transformedText = selectedText;
    switch (caseType) {
      case 'lowercase':
        transformedText = selectedText?.toLowerCase();
        break;
      case 'uppercase':
        transformedText = selectedText?.toUpperCase();
        break;
      case 'capitalize':
        transformedText = selectedText?.replace(/\b\w/g, (char) => char.toUpperCase());
        break;
      case 'toggle':
        transformedText = selectedText
          .split('')
          .map((char) => (char === char?.toUpperCase() ? char?.toLowerCase() : char?.toUpperCase()))
          .join('');
        break;
      case 'sentence':
      default:
        transformedText = selectedText?.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g, (c) => c?.toUpperCase());
        break;
    }

    editor?.chain()?.focus()?.insertContentAt({ from, to }, transformedText).run();
  };

  const handleImageAdd = () => {
    const url = window.prompt('Enter image URL');
    if (url) {
      editor?.chain()?.focus()?.setImage({ src: url }).run();
    }
  };

  const handleLinkAdd = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor?.chain()?.focus()?.extendMarkRange('link')?.unsetLink()?.run();
      return;
    }
    editor?.chain()?.focus()?.extendMarkRange('link')?.setLink({ href: url })?.run();
  };

  const getCurrentValue = () => {
    if (!editor) return 0;

    // Get the level attribute if a heading is currently selected
    const headingLevel = editor.getAttributes('heading')?.level;
    if (headingLevel) {
      return headingLevel.toString();
    }

    return 0;
  };

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
    <div className='px-4 mt-2 print:hidden'>
      <ToolbarMenu />
      <div className="flex flex-wrap items-center gap-1 p-1.5 mt-2 bg-[#f0f4f9] dark:bg-zinc-900 rounded-lg border border-[#f0f4f8] dark:border-zinc-800 text-zinc-700 dark:text-zinc-200">
        {/* SECTION 1: Clipboard & Format Painter */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => document.execCommand('copy')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => document.execCommand('copy')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => document.execCommand('print')}
              className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Print"
            >
              <Printer className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => document.execCommand('copy')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Copy (Ctrl+C)"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => document.execCommand('cut')}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Cut (Ctrl+X)"
            >
              <Scissors className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={async () => {
                const text = await navigator.clipboard.readText();
                editor.chain().focus().insertContent(text).run();
              }}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Paste (Ctrl+V)"
            >
              <Clipboard className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="w-px h-14.5 relative -top-px mx-2 border-l border-[#d3d3d3] dark:bg-zinc-700" />

        {/* SECTION 2: Typography, Size & Styles */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <FontFamily />

            <FontSize
              value={editor?.getAttributes('textStyle')?.fontSize?.replace('px', '') || '13'}
              onChange={handleSetFontSize}
              items={FONT_SIZES}
              className='w-12'
              title='Font Size'
            />

            <button
              type="button"
              onClick={() => changeFontSizeStep(1)}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Increase Font Size"
            >
              <AArrowUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => changeFontSizeStep(-1)}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Decrease Font Size"
            >
              <AArrowDown className="size-4" />
            </button>
          </div>

          <div className="flex items-center gap-x-1.5">
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleBold()?.run()}
              className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleItalic()?.run()}
              className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleUnderline()?.run()}
              className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('underline') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleStrike()?.run()}
              className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('strike') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleSuperscript()?.run()}
              className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('superscript') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Superscript"
            >
              <Superscript className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleSubscript()?.run()}
              className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('subscript') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Subscript"
            >
              <Subscript className="w-4 h-4" />
            </button>
            <div className="relative group">
              <button type="button" className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800" title="Change Case">
                <CaseSensitive className="size-4.5" />
              </button>
              <div className="absolute left-0 top-full text-[13px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-20 min-w-32.5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => applyCaseChange('sentence')}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Sentence case
                </button>
                <button
                  type="button"
                  onClick={() => applyCaseChange('lowercase')}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  lowercase
                </button>
                <button
                  type="button"
                  onClick={() => applyCaseChange('uppercase')}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  UPPERCASE
                </button>
                <button
                  type="button"
                  onClick={() => applyCaseChange('capitalize')}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Capitalize Words
                </button>
                <button
                  type="button"
                  onClick={() => applyCaseChange('toggle')}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  tOGGLE cASE
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => editor.chain()?.focus()?.setHorizontalRule()?.run()}
              className={`px-1.25 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('horizontalRule') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Add Line"
            >
              <Minus className="size-4" />
            </button>
          </div>
        </div>

        <div className="w-px h-14.5 relative -top-px mx-2 border-l border-[#d3d3d3] dark:bg-zinc-700" />

        {/* SECTION 3: Lists, Indentation & Alignment */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.75">
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleBulletList()?.run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('bulletList') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Bullet List"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleOrderedList().run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('orderedList') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Numbered List"
            >
              <ListOrdered className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleTaskList().run()}
              className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Task List"
            >
              <ListTodo className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.sinkListItem('listItem')?.run()}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Increase Indent"
            >
              <IndentIncrease className="size-4" />
              {/* TODO: add support on paragraph and heading */}
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.liftListItem('listItem')?.run()}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Decrease Indent"
            >
              <IndentDecrease className="size-4" />
              {/* TODO: add support on paragraph and heading */}
            </button>
            <div className="relative group">
              <button type="button" className="py-1.25 px-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800" title="Line Spacing">
                <ListChevronsUpDownIcon className="w-4 h-4" />
              </button>
              <div className="absolute left-0 top-full min-w-37.5 text-[13px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-20 overflow-hidden">
                {['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'].map((spacing) => (
                  <button
                    key={spacing}
                    type="button"
                    onClick={() => editor?.chain()?.focus()?.setLineHeight(spacing)?.run()}
                    className="px-3 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    {spacing}
                  </button>
                ))}
                <div className="h-px border-t border-zinc-100 dark:border-zinc-700" />
                <button
                  type="button"
                  onClick={() => editor?.chain()?.focus()?.unsetLineHeight()?.run()}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  Reset text spacing
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyFormat}
              className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                formatBuffer ? "bg-zinc-200 dark:bg-zinc-800 text-blue-500" : ""
              }`}
              title="Copy Format"
            >
              <Pipette className="size-4" />
            </button>
  
            <button
              type="button"
              onClick={handlePasteFormat}
              disabled={!formatBuffer}
              className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:hover:bg-transparent ${
                !formatBuffer ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
              title="Paste Format"
            >
              <PaintRoller className="size-4" />
            </button>
            <label className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Highlight Color">
              <Highlighter className="size-4" />
              <input
                type="color"
                className="sr-only"
                onChange={(e) => editor?.chain()?.focus()?.toggleHighlight({ color: e.target.value })?.run()}
              />
            </label>
            <label className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Font Color">
              <Baseline className="size-4" />
              <input
                type="color"
                className="sr-only"
                onChange={(e) => editor?.chain()?.focus()?.setColor(e.target.value)?.run()}
              />
            </label>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleCodeBlock()?.run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('codeBlock') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Code Block"
            >
              <Code className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleBlockquote()?.run()}
              className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('blockquote') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Blockquote"
            >
              <Quote className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="w-px h-14.5 relative -top-px mx-2 border-l border-[#d3d3d3] dark:bg-zinc-700" />

        {/* SECTION 4: Headings, Links & Media */}
        <div className="flex flex-col gap-1.5">
          <div className='flex items-center gap-x-2'>
            <Dropdown
              value={getCurrentValue()}
              onChange={(item: Record<string, any>) => {
                const level = parseInt(item.value, 10);
                if (level === 0) {
                  editor?.chain()?.focus()?.setParagraph()?.run();
                } else {
                  editor?.chain()?.focus()?.unsetAllMarks()?.run();
                  editor?.chain()?.focus()
                    ?.toggleHeading({ level: level as any })
                    ?.run();
                }
              }}
              items={TYPOGRAPHIES}
              className='w-30'
              title="Styles / Headings"
            />
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.setTextAlign('left')?.run()}
              className={`py-1 px-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                ((editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) || 'left') === 'left'
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400'
                  : ''
              }`}
              title="Align Left"
            >
              <AlignLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.setTextAlign('center')?.run()}
              className={`py-1 px-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                (editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) === 'center'
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400'
                  : ''
              }`}
              title="Align Center"
            >
              <AlignCenter className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.setTextAlign('right')?.run()}
              className={`py-1 px-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                (editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) === 'right'
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400'
                  : ''
              }`}
              title="Align Right"
            >
              <AlignRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.setTextAlign('justify')?.run()}
              className={`py-1 px-1.25 ml-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                (editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) === 'justify'
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400'
                  : ''
              }`}
              title="Justify"
            >
              <AlignJustify className="size-4" />
            </button>
            <button
              onClick={clearCurrentBlockText}
              className='w-full flex items-center gap-x-2 text-left px-1.25 py-1 rounded hover:bg-zinc-200 cursor-pointer'
              title='Remove Text'
            >
              <X className='size-4' />
            </button>
          </div>
          

          <div className="flex items-center gap-1.75">
            <button
              type="button"
              onClick={() => editor?.commands.setPageBreak()}
              className={`px-1.5 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800`}
              title="Insert Page Break"
            >
              <SquareCenterlineDashedVertical className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.setDetails()?.run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('details') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Details"
            >
              <ListCollapse className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().insertColumns().run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('columnBlock') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Two Column Layout"
            >
              <Columns2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true })?.run()}
              className="px-1.5 py-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center gap-1 text-xs"
              title="Insert Table (3x3)"
            >
              <TableIcon className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => editor.chain().focus().splitCell().run()}
              className="p-1.25 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-40"
              title="Cell Border"
            >
              <SquareDashedTopSolid className='size-4' />
            </button>

            <div className="relative group">
              <button
                disabled={!editor?.isActive('table')}
                type="button"
                className="p-1.5 rounded hover:bg-zinc-200 disabled:hover:bg-transparent dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Vertical Align"
              >
                <AlignStartVertical className="size-3.75" />
              </button>
              {editor?.isActive('table') && (
                <div className="absolute left-0 top-full text-[13px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-20 min-w-32.5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setVerticalAlign('top').run()
                    }} 
                    className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700">Align Top</button>
                  <button type="button" onClick={() => editor.chain().focus().setVerticalAlign('middle').run()} className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700">Align Middle</button>
                  <button type="button" onClick={() => editor.chain().focus().setVerticalAlign('bottom').run()} className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700">Align Bottom</button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleLinkAdd}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('link') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Insert Hyperlink"
            >
              <LinkIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleImageAdd}
              className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Insert Image"
            >
              <ImageIcon className="size-4" />
            </button>
  
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.unsetAllMarks()?.clearNodes()?.run()}
              className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Clear Formatting"
            >
              <Eraser className="size-4" />
            </button>
          </div>
        </div>

        <div className="w-px h-14.5 relative -top-px mx-2 border-l border-[#d3d3d3] dark:bg-zinc-700" />

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-items-center gap-1.5">
            <button
              onClick={() => setEnableImageBubble(!enableImageBubble)}
              className={cn(
                'relative px-1.5 py-1.25 rounded hover:bg-zinc-200 cursor-pointer',
                // enableImageBubble ? 'text-blue-500' : ''
              )}
              title={!enableImageBubble ? 'Show Image Bubble' : 'Hide Image Bubble'}
            >
              <RotateCwSquare className='size-4' />
            </button>
            <button
              onClick={() => setEnableTableBubble(!enableTableBubble)}
              className={cn(
                'relative px-1.5 py-1.25 rounded hover:bg-zinc-200 cursor-pointer',
                // enableTableBubble ? 'text-blue-500' : ''
              )}
              title={!enableTableBubble ? 'Show Table Bubble' : 'Hide Table Bubble'}
            >
              <BetweenVerticalEnd className='size-4' />
            </button>
            <button
              onClick={() => setEnableTextBubble(!enableTextBubble)}
              className={cn(
                'relative px-1.5 py-1.25 rounded hover:bg-zinc-200 cursor-pointer',
                // enableTextBubble ? 'text-blue-500' : ''
              )}
              title={!enableTextBubble ? 'Show Text Bubble' : 'Hide Text Bubble'}
            >
              <Bubbles className='size-4' />
            </button>
          </div>
          <div className='flex items-center gap-1.5'>
            <button
              onClick={() => setEnableRuler(!enableRuler)}
              className={cn(
                'relative px-1.5 py-1.25 rounded hover:bg-zinc-200 cursor-pointer',
                // enableRuler ? 'text-blue-500' : ''
              )}
              title={!enableRuler ? 'Show Ruler' : 'Hide Ruler'}
            >
              <Ruler className='size-4' />
            </button>
            <button
              onClick={() => setEnableToolbar(!enableToolbar)}
              className={cn(
                'relative px-1.5 py-1.25 rounded hover:bg-zinc-200 cursor-pointer',
                // enableToolbar ? 'text-blue-500' : ''
              )}
              title={!enableToolbar ? 'Show Toolbar' : 'Hide Toolbar'}
            >
              <ToolCase className='size-4' />
            </button>

            <button
              onClick={() => setEnableToolbar(!enableToolbar)}
              className={cn(
                'relative px-1.5 py-1.25 rounded hover:bg-zinc-200 cursor-pointer',
              )}
              title="Change Toolbar Display"
            >
              <PencilRuler className='size-4' />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;