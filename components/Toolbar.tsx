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
} from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';

interface ToolbarProps {
  editor: Editor | null;
}

const FONT_SIZES = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '26px', '28px', '30px', '36px', '48px', '72px', '96px'];
const FONT_FAMILIES = ['Arial', 'Calibri', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Inter'];

const Toolbar: React.FC<ToolbarProps> = () => {
  const { editor } = useEditorStore();

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

  return (
    <div className="flex flex-wrap items-center gap-1 p-1.5 bg-zinc-50 dark:bg-zinc-900 rounded-lg mt-2 mx-4 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm overflow-x-auto">
      {/* SECTION 1: Clipboard & Format Painter */}
      <div className="flex flex-col gap-1.5">
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
        </div>
        <div className="flex items-center gap-1.5">
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
          <button
            type="button"
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Format Painter"
          >
            <Paintbrush className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-[1px] h-14 bg-zinc-200 dark:bg-zinc-700 mx-1" />

      {/* SECTION 2: Typography, Size & Styles */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          {/* Font Family */}
          <select
            onChange={(e) => editor?.chain()?.focus()?.setFontFamily(e.target.value)?.run()}
            className="h-6 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 px-1 focus:outline-none"
            title="Font Family"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>

          {/* Font Size */}
          <select
            value={editor?.getAttributes('textStyle')?.fontSize || '16px'}
            onChange={(e) => editor?.chain()?.focus()?.setFontSize(e.target.value)?.run()}
            className="h-6 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 px-1 focus:outline-none"
            title="Font Size"
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size.replace('px', '')}
              </option>
            ))}
          </select>

          {/* Step Size Buttons */}
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

          {/* Change Case Dropdown */}
          <div className="relative group">
            <button type="button" className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800" title="Change Case">
              <CaseSensitive className="w-4 h-4" />
            </button>
            <div className="absolute left-0 top-full hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg py-1 z-20 min-w-[130px]">
              <button type="button" onClick={() => applyCaseChange('sentence')} className="px-3 py-1 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700">Sentence case</button>
              <button type="button" onClick={() => applyCaseChange('lowercase')} className="px-3 py-1 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700">lowercase</button>
              <button type="button" onClick={() => applyCaseChange('uppercase')} className="px-3 py-1 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700">UPPERCASE</button>
              <button type="button" onClick={() => applyCaseChange('capitalize')} className="px-3 py-1 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700">Capitalize Words</button>
              <button type="button" onClick={() => applyCaseChange('toggle')} className="px-3 py-1 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700">tOGGLE cASE</button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
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
            onClick={() => editor?.chain()?.focus()?.toggleSuperscript()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('superscript') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Superscript"
          >
            <Superscript className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleSubscript()?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive('subscript') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Subscript"
          >
            <Subscript className="w-4 h-4" />
          </button>

          {/* Color & Highlight */}
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

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.unsetAllMarks()?.clearNodes()?.run()}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Clear Formatting"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-[1px] h-14 bg-zinc-200 dark:bg-zinc-700 mx-1" />

      {/* SECTION 3: Lists, Indentation & Alignment */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
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
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor?.isActive('orderedList') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Multilevel List"
          >
            <ListTree className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.liftListItem('listItem')?.run()}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Decrease Indent"
          >
            <IndentDecrease className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.sinkListItem('listItem')?.run()}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Increase Indent"
          >
            <IndentIncrease className="w-4 h-4" />
          </button>

          {/* Line Spacing Menu */}
          <div className="relative group">
            <button type="button" className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800" title="Line Spacing">
              <BetweenVerticalStart className="w-4 h-4" />
            </button>
            <div className="absolute left-0 top-full hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-lg py-1 z-20 min-w-[100px]">
              {['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'].map((spacing) => (
                <button
                  key={spacing}
                  type="button"
                  onClick={() => editor?.chain()?.focus()?.run()} // Add custom BetweenVerticalStart extension call here if installed
                  className="px-3 py-1 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  {spacing}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Text Direction"
          >
            <Pilcrow className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.setTextAlign('left')?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive({ textAlign: 'left' }) ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.setTextAlign('center').run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive({ textAlign: 'center' }) ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.setTextAlign('right')?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive({ textAlign: 'right' }) ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.setTextAlign('justify')?.run()}
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''}`}
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Shading"
          >
            <PaintBucket className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Borders"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-[1px] h-14 bg-zinc-200 dark:bg-zinc-700 mx-1" />

      {/* SECTION 4: Headings, Links & Media */}
      <div className="flex flex-col gap-1.5">
        <select
          onChange={(e) => {
            const level = parseInt(e.target.value, 10);
            if (level === 0) {
              editor?.chain()?.focus()?.setParagraph()?.run();
            } else {
              editor?.chain()?.focus()?.toggleHeading({ level: level as any })?.run();
            }
          }}
          className="h-6 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 px-1 focus:outline-none"
          title="Styles / Headings"
        >
          <option value="0">Normal Text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
        </select>

        <div className="flex items-center gap-1.5">
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
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Add Comment"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleImageAdd}
            className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Insert Custom Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-[1px] h-14 bg-zinc-200 dark:bg-zinc-700 mx-1" />

      {/* SECTION 5: Tables & Selection */}
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => editor?.chain()?.focus()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true })?.run()}
          className="p-1.5.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center gap-1 text-xs"
          title="Insert Table (3x3)"
        >
          <TableIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor?.chain()?.focus()?.selectAll()?.run()}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
          title="Select All"
        >
          <CheckSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;