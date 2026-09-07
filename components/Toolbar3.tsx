'use client'

import React, { useContext, useEffect, useState } from 'react';
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
  CheckLine,
  ListCheck,
  IndentDecrease,
  IndentIncrease,
  BetweenVerticalStart,
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
  Redo2,
  Undo2,
  PaintRoller,
  Pipette,
  Trash2,
  Code,
  Quote,
  ListCollapse,
  Columns2,
  Minus,
  Printer,
  SpellCheck,
  SeparatorHorizontal,
  FoldVertical,
  Split,
  SquareCenterlineDashedVertical,
  SquareDashedTopSolid,
  AlignStartVertical,
  File,
  Folder,
  Pencil,
  Download,
  X,
  SquareDashed,
  ToggleLeft,
  Ruler,
  ToolCase,
  ToggleRight,
  Bubbles,
  RotateCwSquare,
  BetweenVerticalEnd,
  ListChevronsUpDownIcon,
  PencilRuler,
  ListTodo
} from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import Dropdown from './ui/customs/Dropdown';
import FontFamily from './ui/toolbars/FontFamily';
import Image from 'next/image';
import FontSize from './ui/toolbars/FontSize';
import { useDebounce } from '@/hooks/useDebounce';
import { DocxParser } from '@/lib/docx/docx-parser';
import ToolbarMenu from './ToolbarMenu';

interface ToolbarProps {
  editor: Editor | null;
}

export type ActiveMarks = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  fontFamily?: string;
  textColor?: string;
  highlightColor?: string;
}

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

const Toolbar3 = () => {
  const {
    editor,
    handleCopyFormat,
    handlePasteFormat,
    formatBuffer,
    changeFontSizeStep,
    applyCaseChange
  } = useEditorStore();

  const handleSetFontSize = useDebounce((size: string) => {
    editor?.chain()?.focus()?.setFontSize(`${size?.toString()?.trim()}px`)?.run()
  }, 300);

  if (!editor) {
    return null;
  }

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

  async function handleDocxUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    const docxParser = new DocxParser();
    const result = await docxParser.parse(file);

    editor.commands.setContent(result.html);
  }

  return (
    <div className='px-4 mt-2 print:hidden'>
      <ToolbarMenu />
      <div className="flex items-center justify-between bg-[#f0f4f9] dark:bg-zinc-900 rounded-lg mt-2 border border-[#f0f4f8] dark:border-zinc-800 text-zinc-700 dark:text-zinc-200">
        <div className="flex flex-wrap items-center gap-1 p-1.5 ">
          <button
            type="button"
            onClick={() => document.execCommand('undo')}
            className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Undo"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => document.execCommand('redo')}
            className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Redo"
          >
            <Redo2 className="size-4" />
          </button>

          <FontFamily />

          <FontSize
            value={editor?.getAttributes('textStyle')?.fontSize?.replace('px', '') || '13'}
            onChange={handleSetFontSize}
            items={FONT_SIZES}
            className='w-12'
            title='Font Size'
          />

          <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

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

          <div className="relative group">
            <button type="button" className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800" title="Change Case">
              <CaseSensitive className="size-4" />
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

          <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleBold()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleItalic()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleUnderline()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('underline') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Underline (Ctrl+U)"
          >
            <Underline className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleStrike()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('strike') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Strikethrough"
          >
            <Strikethrough className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor?.chain()?.focus()?.unsetSubscript()?.toggleSuperscript()?.run();
            }}
            className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('superscript') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Superscript"
          >
            <Superscript className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.unsetSuperscript()?.toggleSubscript()?.run()}
            className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('subscript') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Subscript"
          >
            <Subscript className="size-4" />
          </button>

          <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

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

          <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

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
            <button type="button" className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800" title="Line Spacing">
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

          <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.setTextAlign('left')?.run()}
            className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
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
            className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
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
            className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
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
            className={`p-1.25 ml-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
              (editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) === 'justify'
                ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400'
                : ''
            }`}
            title="Justify"
          >
            <AlignJustify className="size-4" />
          </button>

          <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

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
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Clear Formatting"
          >
            <Eraser className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Toolbar3;
