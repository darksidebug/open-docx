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
  ListTodo,
  ChevronRight
} from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import Dropdown from './ui/customs/Dropdown';
import FontFamily from './ui/toolbars/FontFamily';
import Image from 'next/image';
import FontSize from './ui/toolbars/FontSize';
import { useDebounce } from '@/hooks/useDebounce';
import { DocxParser } from '@/lib/docx/docx-parser';
import ToolbarMenu from './ToolbarMenu';
import { tiptapToDocx, downloadDocx } from "@/lib/export-to-docx";
import { cn } from '@/lib/utils';

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

const Toolbar2 = () => {
  const {
    editor,
    handleCopyFormat,
    handlePasteFormat,
    formatBuffer,
    changeFontSizeStep,
    applyCaseChange,
    colorSet,
    enableToolbar,
    fontSizes,
    typographies
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

  const exportToDocx = async () => {
    await downloadDocx(editor.getJSON(), "document.docx");
  }

  function exportToDocx2(filename = "editor-debug.json") {
    if (!editor) return;
    const redact = (value: unknown): unknown => {
      if (typeof value === "string" && value.length > 150) {
        return `${value.slice(0, 60)}...[TRUNCATED — full length: ${value.length}]`;
      }
      if (Array.isArray(value)) return value.map(redact);
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redact(v)])
        );
      }
      return value;
    };

    const json = redact(editor.getJSON());
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

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
      {enableToolbar && (
        <div className="flex items-center justify-between bg-[#f0f4f9] dark:bg-zinc-900 rounded-lg mt-2 border border-[#f0f4f8] dark:border-zinc-800 text-zinc-700 dark:text-zinc-200">
          <div className="flex flex-wrap items-center gap-1 p-1.5 ">
            <button
              type="button"
              onClick={() => document.execCommand('copy')}
              className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Copy (Ctrl+C)"
            >
              <Copy className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => document.execCommand('cut')}
              className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Cut (Ctrl+X)"
            >
              <Scissors className="size-4" />
            </button>
            <button
              type="button"
              onClick={async () => {
                const text = await navigator.clipboard.readText();
                editor.chain().focus().insertContent(text).run();
              }}
              className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Paste (Ctrl+V)"
            >
              <Clipboard className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.undo()?.run()}
              className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Undo"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.redo()?.run()}
              className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Redo"
            >
              <Redo2 className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => document.execCommand('print')}
              className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Print"
            >
              <Printer className="size-3.75" />
            </button>

            {/* <button
              type="button"
              onClick={() => editor?.commands.checkSpelling()}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Spell Check"
            >
              <SpellCheck className="size-4" />
            </button> */}

            <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

            <FontFamily />

            <FontSize
              value={editor?.getAttributes('textStyle')?.fontSize?.replace('px', '') || '13'}
              onChange={handleSetFontSize}
              items={fontSizes}
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
              items={typographies}
              className='w-30'
              title="Styles / Headings"
            />

            <button
              type="button"
              onClick={() => changeFontSizeStep(1)}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Increase Font Size"
            >
              <AArrowUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => changeFontSizeStep(-1)}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
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
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Sentence case
                </button>
                <button
                  type="button"
                  onClick={() => applyCaseChange('lowercase')}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  lowercase
                </button>
                <button
                  type="button"
                  onClick={() => applyCaseChange('uppercase')}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  UPPERCASE
                </button>
                <button
                  type="button"
                  onClick={() => applyCaseChange('capitalize')}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Capitalize Words
                </button>
                <button
                  type="button"
                  onClick={() => applyCaseChange('toggle')}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  tOGGLE cASE
                </button>
              </div>
            </div>

            <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleBold()?.run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleItalic()?.run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleUnderline()?.run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor?.isActive('underline') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Underline (Ctrl+U)"
            >
              <Underline className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleStrike()?.run()}
              className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor?.isActive('strike') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Strikethrough"
            >
              <Strikethrough className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                editor?.chain()?.focus()?.unsetSubscript()?.toggleSuperscript()?.run();
              }}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor.isActive('superscript') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Superscript"
            >
              <Superscript className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.unsetSuperscript()?.toggleSubscript()?.run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor.isActive('subscript') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Subscript"
            >
              <Subscript className="size-4" />
            </button>

            <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

            <button
              type="button"
              onClick={handleCopyFormat}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${
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
            <div className='relative group/sub'>
              <button
                className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
                title="Highlight Color"
              >
                <Highlighter className="size-3.75" />
              </button>
              <div className='hidden group-hover/sub:block absolute -left-6 top-7 z-10 py-2.5 px-3 rounded-lg shadow-lg border border-gray-200 bg-white text-[13px]'>
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
                          onClick={() => editor?.chain()?.focus()?.toggleHighlight({ color })?.run()}
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
                      onChange={(e) => editor?.chain()?.focus()?.toggleHighlight({ color: e.target.value })?.run()}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className='relative group/sub'>
              <button
                className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
                title="Font Color"
              >
                <Baseline className="size-4" />
              </button>
              <div className='hidden group-hover/sub:block absolute -left-6 top-7 z-10 py-2.5 px-3 rounded-lg shadow-lg border border-gray-200 bg-white text-[13px]'>
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
                          onClick={() => editor?.chain()?.focus()?.setColor(color)?.run()}
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
                      onChange={(e) => editor?.chain()?.focus()?.setColor(e.target.value)?.run()}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleBulletList()?.run()}
              className={cn(
                'p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer',
                editor.isActive('bulletList') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''
              )}
              title="Bullet List"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleOrderedList().run()}
              className={cn(
                'p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer',
                editor.isActive('orderedList') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : '',
              )}
              title="Numbered List"
            >
              <ListOrdered className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleTaskList().run()}
              className={cn(
                'p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer',
                editor.isActive('taskList') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''
              )}
              title="Task List"
            >
              <ListTodo className="size-4" />
            </button>
            <button
              disabled={!(editor.isActive('bulletList') || editor.isActive('orderedList'))}
              type="button"
              onClick={() => editor?.chain()?.focus()?.sinkListItem('listItem')?.run()}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer disabled:hover:bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
              title="List Item Increase Indent"
            >
              <IndentIncrease className="size-4" />
            </button>
            <button
              disabled={!(editor.isActive('bulletList') || editor.isActive('orderedList'))}
              type="button"
              onClick={() => editor?.chain()?.focus()?.liftListItem('listItem')?.run()}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer disabled:hover:bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
              title="List Item Decrease Indent"
            >
              <IndentDecrease className="size-4" />
            </button>

            <div className="relative group">
              <button type="button" className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800r" title="Line Spacing">
                <ListChevronsUpDownIcon className="w-4 h-4" />
              </button>
              <div className="absolute left-0 top-full min-w-37.5 text-[13px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-20 overflow-hidden">
                {['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'].map((spacing) => (
                  <button
                    key={spacing}
                    type="button"
                    onClick={() => editor?.chain()?.focus()?.setLineHeight(spacing)?.run()}
                    className="px-3 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                  >
                    {spacing}
                  </button>
                ))}
                <div className="h-px border-t border-zinc-100 dark:border-zinc-700" />
                <button
                  type="button"
                  onClick={() => editor?.chain()?.focus()?.unsetLineHeight()?.run()}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
                >
                  Reset text spacing
                </button>
              </div>
            </div>

            <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.setTextAlign('left')?.run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${
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
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${
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
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${
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
              className={`p-1.25 ml-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${
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
              onClick={() => editor?.commands.setPageBreak()}
              className={`px-1.5 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer`}
              title="Insert Page Break"
            >
              <SquareCenterlineDashedVertical className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain()?.focus()?.setHorizontalRule()?.run()}
              className={`px-1.25 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor?.isActive('horizontalRule') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Add Line"
            >
              <Minus className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleCodeBlock()?.run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor?.isActive('codeBlock') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Code Block"
            >
              <Code className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.toggleBlockquote()?.run()}
              className={`p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor?.isActive('blockquote') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Blockquote"
            >
              <Quote className="size-3.5" />
            </button>
            {/* <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.setDetails()?.run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor?.isActive('details') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Details"
            >
              <ListCollapse className="size-4" />
            </button> */}

            {/* <button
              type="button"
              onClick={() => editor.chain().focus().insertColumns().run()}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor?.isActive('columnBlock') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Two Column Layout"
            >
              <Columns2 className="size-4" />
            </button> */}
            <div className='relative flex items-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800'>
              <button
                onClick={() => {
                  editor.chain().focus().insertColumnAfter().run()
                }}
                type="button"
                className="p-1.25 flex items-center gap-1 cursor-pointer"
                title='Add Column After'
              >
                <Columns2 className="size-4" />
              </button>
              <div className='relative group'>
                <button
                  className='flex items-center py-1 px-px pr-0.75'
                  title='Column Options'
                >
                  <ChevronRight className='relative size-3 rotate-90' />
                </button>
                <div className="absolute -left-6 top-5 min-w-45 p-0.5 text-[12px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20">
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().insertColumnBefore().run()
                    }}
                    className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700 rounded-tl-md rounded-tr-md"
                  >
                    Insert Column Before
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().insertColumnAfter().run()
                    }}
                    className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700"
                  >
                    Insert Column After
                  </button>
                </div>
              </div>
            </div>

            {/* <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" /> */}

            <div className='relative flex items-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800'>
              <button
                type="button"
                onClick={() => editor?.chain()?.focus()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true })?.run()}
                className="px-1.5 py-1 flex items-center gap-1 text-xs cursor-pointer"
                title="Insert Table (3x3)"
              >
                <TableIcon className="size-4" />
              </button>
              <div className='relative group'>
                <button className='flex items-center px-px pr-0.75'>
                  <ChevronRight className='size-3.5 rotate-90' />
                </button>
                <div className="absolute -left-16 top-full p-0.5 min-w-45 text-[12px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20">
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().addColumnBefore().run()
                    }}
                    className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700"
                  >
                    Insert Column Left
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().addColumnAfter().run()
                    }}
                    className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700"
                  >
                    Insert Column Right
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().addRowBefore().run()
                    }}
                    className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700"
                  >
                    Insert Row Before
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().addRowAfter().run()
                    }}
                    className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700"
                  >
                    Insert Row After
                  </button>

                  <div className="h-px w-full border-t border-gray-200 dark:bg-zinc-800" />

                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().deleteColumn().run()
                    }}
                    className="px-3 py-1.25 text-left hover:bg-red-50 hover:text-red-600 dark:hover:bg-zinc-700 cursor-pointer rounded"
                  >
                    Remove Column
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().deleteRow().run()
                    }}
                    className="px-3 py-1.25 text-left hover:bg-red-50 hover:text-red-600 dark:hover:bg-zinc-700 cursor-pointer rounded"
                  >
                    Remove Row
                  </button>
                </div>
              </div>
            </div>

            {/* <button
              type="button"
              onClick={() => editor.chain().focus().splitCell().run()}
              className="p-1.25 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-40"
              title="Cell Border"
            >
              <SquareDashedTopSolid className='size-4' />
            </button> */}

            {/* <div className="relative group">
              <button
                disabled={!editor?.isActive('table')}
                type="button"
                className="p-1.5 rounded hover:bg-zinc-200 disabled:hover:bg-transparent dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
            </div> */}

            <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

            <button
              type="button"
              onClick={handleLinkAdd}
              className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${editor?.isActive('link') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
              title="Insert Hyperlink"
            >
              <LinkIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleImageAdd}
              className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Insert Image"
            >
              <ImageIcon className="size-4" />
            </button>

            {/* <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" /> */}

            <button
              type="button"
              onClick={() => editor?.chain()?.focus()?.unsetAllMarks()?.clearNodes()?.run()}
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Clear Formatting"
            >
              <Eraser className="size-4" />
            </button>
            {/* <button
              type="button"
              onClick={() => editor?.chain().clearContent()?.run()}
              className="p-1.25 rounded hover:bg-red-500 dark:hover:bg-red-500 hover:text-white"
              title="Clear Content"
            >
              <Trash2 className="size-4" />
            </button> */}

            {/* <div className="w-px h-5 relative mx-2 border-l border-[#c4c7c5] dark:bg-zinc-700" />

            <button
              type="button"
              className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Add Comment"
            >
              <MessageSquare className="size-4" />
            </button> */}
          </div>
          <div className="flex items-center gap-2 px-2 mr-2 text-sm">
            {/* <Pencil className="w-3.5 h-3.5" />
            <span className="font-sans">Editing</span> */}
          </div>
        </div>
      )}
    </div>
  );
}

export default Toolbar2;
