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
  TableCellsMergeIcon,
  TableCellsSplit,
  Grid2X2Plus,
  Grid2X2X,
  ChevronRight,
  AlignStartVertical,
  PaintBucket,
  Trash2,
  Columns2,
  Minus,
  ChevronUp,
  ChevronDown,
  Underline,
  Eraser
} from 'lucide-react';
import { useEditorStore } from '@/store/useEditorStore';
import { useDebounce } from '@/hooks/useDebounce';
import FontSize from '../ui/toolbars/FontSize';
import FontFamily from '../ui/toolbars/FontFamily';
import { cn } from '@/lib/utils';
import Dropdown from '../ui/customs/Dropdown';

export const TableBubbleMenu = () => {
  const {
    editor,
    fontSizes,
    formatBuffer,
    handleCopyFormat,
    handlePasteFormat,
    colorSet,
    typographies,
    applyCaseChange,
    changeFontSizeStep,
    clearCurrentBlockText
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

  if (!editor.isActive('table')) return null;

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
      // tippyOptions={{ duration: 10 }}
      className="-table flex flex-col gap-y-0.75 bg-white dark:bg-zinc-800 p-1 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 z-20"
    >
      <div className='flex items-center gap-x-1.25'>
        <FontFamily />
        <FontSize
          value={editor?.getAttributes('textStyle')?.fontSize?.replace('px', '') || '13'}
          onChange={handleSetFontSize}
          items={fontSizes}
          className='w-15'
          title='Font Size'
        />

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
                  'px-3 py-1 text-left hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded cursor-pointer',
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
        <div className="w-px h-4 border-l border-zinc-200 dark:bg-zinc-800 mr-0.5 ml-1" />
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
      </div>
      <div className='flex items-center gap-x-1'>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer ${
            editor.isActive('bold') ? 'text-blue-500 bg-zinc-200 dark:bg-zinc-700' : ''
          }`}
          title="Bold"
        >
          <Bold className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer ${
            editor.isActive('italic') ? 'text-blue-500 bg-zinc-200 dark:bg-zinc-700' : ''
          }`}
          title="Italic"
        >
          <Italic className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer ${
            editor.isActive('underline') ? 'text-blue-500 bg-zinc-200 dark:bg-zinc-700' : ''
          }`}
          title="Underline"
        >
          <Underline className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer ${
            editor.isActive('strike') ? 'text-blue-500 bg-zinc-200 dark:bg-zinc-700' : ''
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="size-3.5" />
        </button>
        <div className="w-px h-4 border-l border-zinc-200 dark:bg-zinc-800 mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().mergeCells().run()}
          disabled={!editor.can().mergeCells()}
          className="p-1.25 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:cursor-not-allowed"
          title="Merge Selected Cells"
        >
          <TableCellsMergeIcon className='size-3.5' />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().splitCell().run()}
          disabled={!editor.can().splitCell()}
          className="p-1.25 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-700 dark:text-zinc-300 cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:cursor-not-allowed"
          title="Undo Merge (Split Cell)"
        >
          <TableCellsSplit className='size-3.75' />
        </button>
        <div className='relative flex items-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800'>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="px-1 py-1 flex items-center gap-1 text-xs cursor-pointer"
            title="Add Column After"
          >
            <Grid2X2Plus className="size-3.5" />
          </button>
          <div className='relative group font-medium'>
            <button
              className='flex items-center py-1 px-px pr-0.75'
              title='Add Options'
            >
              <ChevronRight className='relative top-px size-3 rotate-90' />
            </button>
            <div className="absolute -left-6 top-5 min-w-45 p-0.5 text-[12px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20">
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().addColumnBefore().run()
                }}
                className="relative w-full px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700 rounded-tl-md rounded-tr-md"
              >
                No Border
              </button>
              <div className='relative group/sub'>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().addColumnBefore().run()
                  }}
                  className="relative w-full px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700"
                >
                  Border Options
                  <ChevronRight className='absolute top-1.75 right-2 size-3.5' />
                </button>
              </div>
              <div className='relative group/sub'>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().addColumnAfter().run()
                  }}
                  className="relative w-full px-3 py-1.25 text-left hover:bg-zinc-100 group-hover/sub:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700"
                >
                  Cell Spacing
                  <ChevronRight className='absolute top-1.75 right-2 size-3.5' />
                </button>
                <div className="absolute left-full -top-2 min-w-45 p-0.5 text-[12px] hidden group-hover/sub:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20">
                  <div className='flex items-center'>
                    <div className='p-1.5 gap-x-1'>
                      <div
                        className='relative border border-gray-300 py-0.75 px-5 text-[8px] bg-gray-100'
                        style={{}}
                      >
                        <div className='relative -top-px flex items-center justify-center font-semibold text-center'>
                          2px
                        </div>
                        <div className='absolute top-9 right-0.5 flex items-center justify-center font-semibold text-[9px] text-center -rotate-90'>
                          5px
                        </div>
                        <div className=' h-14 w-14 border border-gray-300 bg-white' />
                        <div className='absolute top-9 left-0.5 flex items-center justify-center font-semibold text-[9px] text-center -rotate-90'>
                          5px
                        </div>
                        <div className='relative top-px flex items-center justify-center font-semibold text-center'>
                          2px
                        </div>
                      </div>
                    </div>
                    <div className='p-1'>
                      <div className='flex items-center justify-between gap-x-1 py-px'>
                        <span>Top:</span>
                        <div className='flex gap-x-px'>
                          <input
                            className='px-1 py-px w-9 border border-gray-300 rounded focus:outline-0 text-[10px] font-medium'
                            value={2}
                            min={2}
                            onChange={() => {}}
                          />
                          <div className='flex flex-col'>
                            <button
                              type="button"
                              onClick={() => {
                                editor.chain().focus().addColumnAfter().run()
                              }}
                              className="px-px text-left hover:bg-zinc-100 cursor-pointer rounded"
                            >
                              <ChevronUp className='size-2.5 font-bold' />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                editor.chain().focus().addColumnAfter().run()
                              }}
                              className="px-px  text-left hover:bg-zinc-100 cursor-pointer rounded"
                            >
                              <ChevronDown className='size-2.5 font-bold' />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center justify-between gap-x-1 py-px'>
                        <span>Right:</span>
                        <div className='flex gap-x-px'>
                          <input
                            className='px-1 py-px w-9 border border-gray-300 rounded focus:outline-0 text-[10px] font-medium'
                            value={5}
                            min={5}
                            onChange={() => {}}
                          />
                          <div className='flex flex-col'>
                            <button
                              type="button"
                              onClick={() => {
                                editor.chain().focus().addColumnAfter().run()
                              }}
                              className="px-px text-left hover:bg-zinc-100 cursor-pointer rounded"
                            >
                              <ChevronUp className='size-2.5 font-bold' />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                editor.chain().focus().addColumnAfter().run()
                              }}
                              className="px-px  text-left hover:bg-zinc-100 cursor-pointer rounded"
                            >
                              <ChevronDown className='size-2.5 font-bold' />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center justify-between gap-x-1 py-px'>
                        <span>Bottom:</span>
                        <div className='flex gap-x-px'>
                          <input
                            className='px-1 py-px w-9 border border-gray-300 rounded focus:outline-0 text-[10px] font-medium'
                            value={2}
                            min={2}
                            onChange={() => {}}
                          />
                          <div className='flex flex-col'>
                            <button
                              type="button"
                              onClick={() => {
                                editor.chain().focus().addColumnAfter().run()
                              }}
                              className="px-px text-left hover:bg-zinc-100 cursor-pointer rounded"
                            >
                              <ChevronUp className='size-2.5 font-bold' />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                editor.chain().focus().addColumnAfter().run()
                              }}
                              className="px-px  text-left hover:bg-zinc-100 cursor-pointer rounded"
                            >
                              <ChevronDown className='size-2.5 font-bold' />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className='flex items-center justify-between gap-x-1 py-px'>
                        <span>Left:</span>
                        <div className='flex gap-x-px'>
                          <input
                            className='px-1 py-px w-9 border border-gray-300 rounded focus:outline-0 text-[10px] font-medium'
                            value={5}
                            min={5}
                            onChange={() => {}}
                          />
                          <div className='flex flex-col'>
                            <button
                              type="button"
                              onClick={() => {
                                editor.chain().focus().addColumnAfter().run()
                              }}
                              className="px-px text-left hover:bg-zinc-100 cursor-pointer rounded"
                            >
                              <ChevronUp className='size-2.5 font-bold' />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                editor.chain().focus().addColumnAfter().run()
                              }}
                              className="px-px  text-left hover:bg-zinc-100 cursor-pointer rounded"
                            >
                              <ChevronDown className='size-2.5 font-bold' />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().addColumnBefore().run()
                }}
                className="relative w-full px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700"
              >
                Reset Cell Style
              </button>
              <div className="w-full h-px border-t border-zinc-200 dark:bg-zinc-800 my-px" />
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().addColumnAfter().run()
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
            </div>
          </div>
        </div>
        <div className='relative flex items-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 font-medium'>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="px-1 py-1 flex items-center gap-1 text-xs cursor-pointer"
            title="Remove Column"
          >
            <Grid2X2X className="size-3.5" />
          </button>
          <div className='relative group'>
            <button
              className='flex items-center py-1 px-px pr-0.75'
              title='Remove Options'
            >
              <ChevronRight className='relative top-px size-3 rotate-90' />
            </button>
            <div className="absolute -left-6 top-5 p-0.5 min-w-40 text-[12px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20">
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().deleteSelection().run()
                }}
                className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer rounded"
              >
                Remove Text
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().deleteColumn().run()
                }}
                className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer rounded"
              >
                Remove Column
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().deleteRow().run()
                }}
                className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer rounded"
              >
                Remove Row
              </button>
              <div className="w-full h-px border-t border-zinc-200 dark:bg-zinc-800 my-px" />
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().deleteRow().run()
                }}
                className="px-3 py-1.25 text-left hover:bg-red-50 hover:text-red-500 dark:hover:bg-zinc-700 cursor-pointer rounded"
              >
                Delete Table
              </button>
            </div>
          </div>
        </div>
        <div className="relative top-0.5 group font-medium">
          <button
            disabled={!editor?.isActive('table')}
            type="button"
            className="p-1 rounded hover:bg-zinc-200 disabled:hover:bg-transparent dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Vertical Align"
          >
            <AlignStartVertical className="size-3.5" />
          </button>
          {editor?.isActive('table') && (
            <div className="absolute -left-2 top-5.5 p-0.5 text-[12px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20 min-w-35 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setVerticalAlign('top').run()
                }}
                className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer rounded"
              >
                Align Top
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().setVerticalAlign('middle').run()}
                className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer rounded"
              >
                Align Middle
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().setVerticalAlign('bottom').run()}
                className="px-3 py-1.25 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer rounded"
              >
                Align Bottom
              </button>
            </div>
          )}
        </div>

        <div className='relative flex items-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 font-medium'>
          <button
            onClick={() => {
              editor.chain().focus().insertColumns().run()
            }}
            type="button"
            className="p-1 rounded hover:bg-zinc-200 disabled:hover:bg-transparent dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Column Layout"
          >
            <Columns2 className="size-3.5" />
          </button>
          <div className='relative group'>
            <button
              disabled={editor.isActive('columnBlock')}
              className='flex items-center py-1 px-px pr-0.75'
              {...(editor.can().deleteGridColumn() ? { title: 'Column Options' } : {})}
            >
              <ChevronRight className='relative size-3 rotate-90' />
            </button>
            {editor.can().deleteGridColumn() && (
              <div className="absolute -left-6 top-5 min-w-45 p-0.5 text-[12px] hidden group-hover:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-20">
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().insertColumnBefore().run()
                  }}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700"
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
                <div className="w-full h-px border-t border-zinc-200 dark:bg-zinc-800 my-px" />
                <button
                  type="button"
                  onClick={clearCurrentBlockText}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700"
                >
                  Remove Text
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().deleteGridColumn().run()
                  }}
                  className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded dark:hover:bg-zinc-700"
                >
                  Remove Column
                </button>
                <div className="w-full h-px border-t border-zinc-200 dark:bg-zinc-800 my-px" />
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().deleteColumnBlock().run()
                  }}
                  className="px-3 py-1.25 text-left hover:bg-red-50 hover:text-red-500 cursor-pointer rounded dark:hover:bg-zinc-700"
                >
                  Delete Columns
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-px h-4 border-l border-zinc-200 dark:bg-zinc-800 mx-0.5" />

        <div className='relative top-0.5 group'>
          <button className="p-1 rounded hover:bg-zinc-200 group-hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer" title="Cell Background">
            <PaintBucket className='size-3.5' />
          </button>
          <div className='hidden group-hover:block absolute top-5.5 z-10 py-2.5 px-3 rounded-md shadow-lg border border-gray-200 bg-white text-[13px] -translate-x-1/2'>
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
        <div className='relative top-px group'>
          <button
            className="p-1 rounded hover:bg-zinc-200 group-hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Highlight Color"
          >
            <Highlighter className="size-3.5" />
          </button>
          <div className='hidden group-hover:block absolute top-5.5 z-10 py-2.5 px-3 rounded-md shadow-lg border border-gray-200 bg-white text-[13px] -translate-x-1/2'>
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
            className="p-1 rounded hover:bg-zinc-200 group-hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title="Font Color"
          >
            <Baseline className="size-3.5" />
          </button>
          <div className='hidden group-hover:block absolute top-5.5 z-10 py-2.5 px-3 rounded-md shadow-lg border border-gray-200 bg-white text-[13px] -translate-x-1/2'>
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
          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
          title="Clear Formatting"
        >
          <Eraser className="size-3.5" />
        </button>
      </div>
    </BubbleMenu>
  );
};

export default TableBubbleMenu;