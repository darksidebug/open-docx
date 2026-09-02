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
  Trash2
} from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import Dropdown from './ui/customs/Dropdown';
import FontFamily from './ui/toolbars/FontFamily';
import Image from 'next/image';
import FontSize from './ui/toolbars/FontSize';
import { useDebounce } from '@/hooks/useDebounce';

interface ToolbarProps {
  editor: Editor | null;
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

const Toolbar2 = () => {
  const { editor } = useEditorStore();

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

  console.log('object', editor.getAttributes('tableCell').textAlign)
  return (
    <div className='px-4 mt-2 font-medium'>
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
          <div className="ml-2 text-lg font-bold">Untitled document</div>
          <div className="flex items-center gap-0.5 text-[13px] font-medium">
            <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>File</button>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>Edit</button>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>View</button>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>Insert</button>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>Format</button>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200 cursor-pointer'>Help</button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between bg-[#f0f4f9] dark:bg-zinc-900 rounded-lg mt-2 border border-[#f0f4f8] dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium">
        <div className="flex flex-wrap items-center gap-1 p-1.5 ">
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

          <div className="w-px h-5 relative mx-1 bg-[#c4c7c5] dark:bg-zinc-700" />

          {/* TODO: fix the issue on undo - redo */}
          <button
            type="button"
            onClick={() => document.execCommand('undo')}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => document.execCommand('redo')}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 relative mx-2 bg-[#c4c7c5] dark:bg-zinc-700" />

          <FontFamily />

          <FontSize
            value={editor?.getAttributes('textStyle')?.fontSize?.replace('px', '') || FONT_SIZES[0]}
            onChange={handleSetFontSize}
            items={FONT_SIZES}
            className='w-12'
            title='Font Size'
          />

          <div className="w-px h-5 relative mx-2 bg-[#c4c7c5] dark:bg-zinc-700" />

          <Dropdown
            value={getCurrentValue()}
            onChange={(item: Record<string, any>) => {
              const level = parseInt(item.value, 10);
              if (level === 0) {
                editor?.chain()?.focus()?.setParagraph()?.run();
              } else {
                editor?.chain()?.focus()?.toggleHeading({ level: level as any })?.run();
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
            <AArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => changeFontSizeStep(-1)}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Decrease Font Size"
          >
            <AArrowDown className="w-4 h-4" />
          </button>

          <div className="relative group">
            <button type="button" className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800" title="Change Case">
              <CaseSensitive className="size-4" />
            </button>
            <div className="absolute left-0 top-full text-[13px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-20 min-w-32.5 overflow-hidden">
              <button type="button" onClick={() => applyCaseChange('sentence')} className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700">Sentence case</button>
              <button type="button" onClick={() => applyCaseChange('lowercase')} className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700">lowercase</button>
              <button type="button" onClick={() => applyCaseChange('uppercase')} className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700">UPPERCASE</button>
              <button type="button" onClick={() => applyCaseChange('capitalize')} className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700">Capitalize Words</button>
              <button type="button" onClick={() => applyCaseChange('toggle')} className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700">tOGGLE cASE</button>
            </div>
          </div>

          <div className="w-px h-5 relative mx-2 bg-[#c4c7c5] dark:bg-zinc-700" />

          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleBold()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleItalic()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleUnderline()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('underline') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleStrike()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('strike') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor?.chain()?.focus()?.unsetSubscript()?.toggleSuperscript()?.run();
            }}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('superscript') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Superscript"
          >
            <Superscript className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.unsetSuperscript()?.toggleSubscript()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('subscript') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Subscript"
          >
            <Subscript className="w-4 h-4" />
          </button>

          <div className="w-px h-5 relative mx-2 bg-[#c4c7c5] dark:bg-zinc-700" />

          <button
            type="button"
            className="py-1 px-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Shading"
          >
            <PaintBucket className="w-4 h-4" />
          </button>

          <button
            type="button"
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Format Painter"
          >
            <Pipette className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Paste Format"
          >
            <PaintRoller className="w-4 h-4" />
          </button>
          <label className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Highlight Color">
            <Highlighter className="w-4 h-4" />
            <input
              type="color"
              className="sr-only"
              onChange={(e) => editor?.chain()?.focus()?.toggleHighlight({ color: e.target.value })?.run()}
            />
          </label>
          <label className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Font Color">
            <Baseline className="w-4 h-4" />
            <input
              type="color"
              className="sr-only"
              onChange={(e) => editor?.chain()?.focus()?.setColor(e.target.value)?.run()}
            />
          </label>

          <div className="w-px h-5 relative mx-2 bg-[#c4c7c5] dark:bg-zinc-700" />

          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleBulletList()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('bulletList') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleOrderedList().run()}
            className={`py-1 px-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('orderedList') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleTaskList().run()}
            className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Task List"
          >
            <ListCheck className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.sinkListItem('listItem')?.run()}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Increase Indent"
          >
            <IndentIncrease className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.liftListItem('listItem')?.run()}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Decrease Indent"
          >
            <IndentDecrease className="w-4 h-4" />
          </button>

          <div className="relative group font-medium">
            <button type="button" className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800" title="Line Spacing">
              <BetweenVerticalStart className="w-4 h-4 rotate-90" />
            </button>
            <div className="absolute left-0 top-full min-w-37.5 text-[13px] font-medium hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg z-20 overflow-hidden">
              {['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'].map((spacing) => (
                <button
                  key={spacing}
                  type="button"
                  onClick={() => editor?.chain()?.focus()?.run()}
                  className="px-3 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  {spacing}
                </button>
              ))}
              <div className="h-px border-t border-zinc-100 dark:border-zinc-700" />
              <button
                type="button"
                onClick={() => editor?.chain()?.focus()?.run()}
                className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                Remove spacing
              </button>
            </div>
          </div>

          <div className="w-px h-5 relative mx-2 bg-[#c4c7c5] dark:bg-zinc-700" />

          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.setTextAlign('left')?.run()}
            className={`py-1 px-[4.5px] rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
              editor.isActive({ textAlign: 'left' }) ||
              editor.getAttributes('tableCell').textAlign === 'left'
                ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400'
                : ''
            }`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.setTextAlign('center')?.run()}
            className={`py-1 px-[4.5px] rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
              editor.isActive({ textAlign: 'center' }) || editor.getAttributes('tableCell').textAlign === 'center'
                ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400'
                : ''
            }`}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.setTextAlign('right')?.run()}
            className={`py-1 px-[4.5px] rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
              editor.isActive({ textAlign: 'right' }) || editor.getAttributes('tableCell').textAlign === 'right' 
                ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' 
                : ''
            }`}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.setTextAlign('justify')?.run()}
            className={`py-1 px-[4.5px] ml-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
              editor.isActive({ textAlign: 'justify' }) || editor.getAttributes('tableCell').textAlign === 'justify' 
                ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' 
                : ''
            }`}
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          <div className="w-px h-5 relative mx-2 bg-[#c4c7c5] dark:bg-zinc-700" />

          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true })?.run()}
            className="px-1.5 py-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center gap-1 text-xs"
            title="Insert Table (3x3)"
          >
            <TableIcon className="w-4 h-4" />
          </button>

          {/* <button
            type="button"
            className="py-1 px-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Borders"
          >
            <Square className="w-4 h-4" />
          </button>

          <div className="w-px h-5 relative mx-2 bg-[#c4c7c5] dark:bg-zinc-700" /> */}

          <button
            type="button"
            onClick={handleLinkAdd}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('link') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Insert Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleImageAdd}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Insert Custom Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-5 relative mx-2 bg-[#c4c7c5] dark:bg-zinc-700" />
          
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.unsetAllMarks()?.clearNodes()?.run()}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Clear Formatting"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().clearContent()?.run()}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Clear Content"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* <div className="w-px h-5 relative mx-2 bg-[#c4c7c5] dark:bg-zinc-700" />

          <button
            type="button"
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Add Comment"
          >
            <MessageSquare className="w-4 h-4" />
          </button> */}
        </div>
        <div className="flex items-center gap-2 px-2 mr-2 text-sm">
          {/* <Pencil className="w-3.5 h-3.5" />
          <span className="font-sans">Editing</span> */}
        </div>
      </div>
    </div>
  );
}

export default Toolbar2;
