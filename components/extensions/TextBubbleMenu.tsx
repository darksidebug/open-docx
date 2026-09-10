'use client'

import React, { useEffect, useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Editor } from '@tiptap/core';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  AlignCenter,
  AlignRight,
  AlignJustify,
  AlignLeft,
  ListChevronsUpDownIcon,
  Pipette,
  PaintRoller,
  Highlighter,
  Baseline,
  List,
  ListOrdered,
  ListTodo,
  IndentIncrease,
  IndentDecrease,
  AArrowUp,
  AArrowDown,
  CaseSensitive,
  Underline,
  Eraser
} from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { useDebounce } from '@/hooks/useDebounce';
import FontSize from '../ui/toolbars/FontSize';
import FontFamily from '../ui/toolbars/FontFamily';
import { cn } from '@/lib/utils';
import Dropdown from '../ui/customs/Dropdown';

export const TextBubbleMenu = () => {
  const {
    editor,
    fontSizes,
    formatBuffer,
    handleCopyFormat,
    handlePasteFormat,
    colorSet,
    typographies,
    applyCaseChange,
    changeFontSizeStep
  } = useEditorStore();
  const [isScrolling, setIsScrolling] = useState(false);

  const handleSetFontSize = useDebounce((size: string) => {
    editor?.chain()?.focus()?.setFontSize(`${size?.toString()?.trim()}px`)?.run()
  }, 300);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout);

      // Re-enable the menu shortly after scrolling stops (150ms)
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  if (!editor || isScrolling) {
    return null;
  }

  if (editor.isActive('table') || editor.isActive('customImage')) return null;

  const getCurrentValue = () => {
    if (!editor) return 0;

    // Get the level attribute if a heading is currently selected
    const headingLevel = editor.getAttributes('heading')?.level;
    if (headingLevel) {
      return headingLevel.toString();
    }

    return 0;
  };

  return (
    <BubbleMenu
      editor={editor}
      className='z-20'
    >
      <div className="flex flex-col gap-y-0.75 bg-white dark:bg-zinc-800 p-1 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200">
        <div className='flex items-center gap-x-1'>
          <FontFamily />
          <FontSize
            value={editor?.getAttributes('textStyle')?.fontSize?.replace('px', '') || '13'}
            onChange={handleSetFontSize}
            items={fontSizes}
            className='w-12'
            title='Font Size'
          />
          <div className="w-px h-4 border-l border-zinc-200 dark:bg-zinc-800 mr-0.5 ml-1" />
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
            className='w-25.5'
            title="Styles / Headings"
          />
          <button
            type="button"
            onClick={() => changeFontSizeStep(1)}
            className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
            title="Increase Font Size"
          >
            <AArrowUp className="size-3.75" />
          </button>
          <button
            type="button"
            onClick={() => changeFontSizeStep(-1)}
            className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
            title="Decrease Font Size"
          >
            <AArrowDown className="size-3.75" />
          </button>

          <div className="relative group font-medium">
            <button type="button" className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800" title="Change Case">
              <CaseSensitive className="size-3.75" />
            </button>
            <div className="absolute left-0 top-full text-[13px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20 min-w-32.5 overflow-hidden">
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
        </div>
        <div className='flex items-center gap-x-1'>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer ${
              editor.isActive('bold') ? 'text-blue-600 bg-zinc-200 dark:bg-zinc-700' : ''
            }`}
            title="Bold"
          >
            <Bold className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer ${
              editor.isActive('italic') ? 'text-blue-600 bg-zinc-200 dark:bg-zinc-700' : ''
            }`}
            title="Italic"
          >
            <Italic className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer ${
              editor.isActive('underline') ? 'text-blue-500 bg-zinc-200 dark:bg-zinc-700' : ''
            }`}
            title="Underline"
          >
            <Underline className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer ${
              editor.isActive('strike') ? 'text-blue-600 bg-zinc-200 dark:bg-zinc-700' : ''
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="size-3.5" />
          </button>
          <div className='relative top-0.5 group font-medium'>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className='px-1 py-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-blue-500 bg-zinc-200 dark:bg-zinc-700'
              title="Text Align"
            >
              {(() => {
                if ((editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) === 'center') {
                  return <AlignCenter className="size-3.75" />;
                }

                if ((editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) === 'right') {
                  return <AlignRight className="size-3.75" />;
                }

                if ((editor.getAttributes('paragraph').textAlign || editor.getAttributes('heading').textAlign) === 'justify') {
                  return <AlignJustify className="size-3.75" />;
                }

                return <AlignLeft className="size-3.75" />;
              })()}
            </button>
            <div className="absolute -left-2 top-6 min-w-37.5 text-[12px] hidden group-hover:flex flex-col p-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20 overflow-hidden">
              <button
                onClick={() => editor?.chain()?.focus()?.setTextAlign('left')?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                Align Left
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.setTextAlign('center')?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                Align Center
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.setTextAlign('right')?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                Align Right
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.setTextAlign('justify')?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                Justify Text
              </button>
            </div>
          </div>
          <div className='relative group font-medium'>
            <button
              className='relative w-full flex items-center gap-x-2 text-left px-1.25 py-1 rounded hover:bg-zinc-200'
            >
              <ListChevronsUpDownIcon className='size-3.75' />
            </button>
            <div className="absolute -left-2 top-6 min-w-37.5 text-[12px] hidden group-hover:flex flex-col p-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20 overflow-hidden">
              {['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'].map((spacing) => (
                <button
                  key={spacing}
                  type="button"
                  onClick={() => editor?.chain()?.focus()?.setLineHeight(spacing)?.run()}
                  className={cn(
                    'px-3 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded cursor-pointer'
                  )}
                >
                  {spacing}
                </button>
              ))}
              <div className="h-px border-t border-zinc-100 dark:border-zinc-700" />
              <button
                type="button"
                onClick={() => editor?.chain()?.focus()?.unsetLineHeight()?.run()}
                className="px-3 py-1.25 text-left hover:bg-zinc-100 rounded dark:hover:bg-zinc-700 cursor-pointer"
              >
                Reset text spacing
              </button>
            </div>
          </div>
          <div className="w-px h-4 border-l border-zinc-200 dark:bg-zinc-800 mx-0.5" />
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.toggleBulletList()?.run()}
            className={cn(
              'p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer',
              editor.isActive('bulletList') ? 'bg-zinc-200 dark:bg-zinc-700 text-blue-600 dark:text-blue-400' : ''
            )}
            title="Bullet List"
          >
            <List className="size-3.5" />
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
            <ListOrdered className="size-3.5" />
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
            <ListTodo className="size-3.5" />
          </button>
          <button
            disabled={!(editor.isActive('bulletList') || editor.isActive('orderedList'))}
            type="button"
            onClick={() => editor?.chain()?.focus()?.sinkListItem('listItem')?.run()}
            className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer disabled:hover:bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
            title="List Item Increase Indent"
          >
            <IndentIncrease className="size-3.5" />
          </button>
          <button
            disabled={!(editor.isActive('bulletList') || editor.isActive('orderedList'))}
            type="button"
            onClick={() => editor?.chain()?.focus()?.liftListItem('listItem')?.run()}
            className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer disabled:hover:bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
            title="List Item Decrease Indent"
          >
            <IndentDecrease className="size-3.5" />
          </button>
          <div className="w-px h-4 border-l border-zinc-200 dark:bg-zinc-800 mx-0.5" />
          {/* <button
            type="button"
            onClick={handleCopyFormat}
            className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer ${
              formatBuffer ? "bg-zinc-200 dark:bg-zinc-800 text-blue-500" : ""
            }`}
            title="Copy Format"
          >
            <Pipette className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={handlePasteFormat}
            disabled={!formatBuffer}
            className={`p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:hover:bg-transparent ${
              !formatBuffer ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            }`}
            title="Paste Format"
          >
            <PaintRoller className="size-3.5" />
          </button> */}
          <div className='relative group'>
            <button
              className="p-1.25 rounded hover:bg-zinc-200 group-hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Highlight Color"
            >
              <Highlighter className="size-3.5" />
            </button>
            <div className='hidden group-hover:block absolute top-6 z-10 py-2.5 px-3 rounded-md shadow-lg border border-gray-200 bg-white text-[13px] -translate-x-1/2'>
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
          <div className='relative top-px group'>
            <button
              className="p-1.25 rounded hover:bg-zinc-200 group-hover:bg-zinc-200 dark:hover:bg-zinc-800"
              title="Font Color"
            >
              <Baseline className="size-3.5" />
            </button>
            <div className='hidden group-hover:block absolute top-6 z-10 py-2.5 px-3 rounded-md shadow-lg border border-gray-200 bg-white text-[13px] -translate-x-1/2'>
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
          <button
            type="button"
            onClick={() => editor?.chain()?.focus()?.unsetAllMarks()?.clearNodes()?.run()}
            className="p-1.25 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed"
            title="Clear Formatting"
          >
            <Eraser className="size-3.5" />
          </button>
        </div>
      </div>
    </BubbleMenu>
  );
};

export default TextBubbleMenu;