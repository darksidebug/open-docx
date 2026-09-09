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
  Underline,
  Upload,
  ChevronRight,
  AlignCenter,
  AlignRight,
  ListOrdered,
  ListTodo,
  Signature,
  Paperclip
} from 'lucide-react'
import Image from 'next/image'
import { useContext, useState } from 'react'
import { ActiveMarks } from './Toolbar2'
import { cn } from '@/lib/utils'
import { DocxParser } from '@/lib/docx/docx-parser';
import { tiptapToDocx, downloadDocx } from "@/lib/export-to-docx";
import { tiptapToPdf, downloadPdf } from "@/lib/export-to-pdf";
import { downloadHtml } from "@/lib/export-to-html";
import { importDocxFile } from "@/lib/import-docx";

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
    setEnableToolbar,
    colorSet,
    documentName,
    setDocumentName
  } = useEditorStore();
  const [isEditingDocName, setIsEditingDocName] = useState(false);

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

  const handleDocxUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    const docxParser = new DocxParser();
    const result = await docxParser.parse(file);

    editor.commands.setContent(result.html);
  }

  const exportToDocx = async () => {
    await downloadDocx(editor.getJSON(), "document.docx");
  }

  const exportToPDF = async () => {
    console.log('object', editor.getJSON())
    await downloadPdf(editor.getJSON(), "document.pdf");
  }

  const exportToJson = () => {
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
    link.download = "editor-debug.json";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const exportToHtml = () => {
    if (!editor) return;

    downloadHtml(editor, "document.html")
  }

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
        {isEditingDocName && (
          <input
            onChange={e => {
              const { value } = e.target;
              setDocumentName(value);
            }}
            onBlur={() => setIsEditingDocName(false)}
            value={documentName}
            className='ml-2 text-lg focus:outline-0'
            autoFocus
          />
        )}

        {!isEditingDocName && (
          <div
            className="ml-2 text-lg max-w-62.5 truncate"
            onClick={() => setIsEditingDocName(true)}
            title={documentName}
          >
            {documentName}
          </div>
        )}
        <div className="flex items-center gap-0.5 text-[13px]">
          <div className='relative group'>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200'>File</button>
            <div className='hidden group-hover:flex absolute -left-2 top-full flex-col gap-y-0.5 z-20 min-w-60 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
              <div className='relative group/sub'>
                <button
                  onClick={() => window.print()}
                  className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
                >
                  <File className='size-3.75' />
                  New
                  <ChevronRight className='absolute right-2 size-3.75' />
                </button>
                <div className='hidden group-hover/sub:flex absolute left-full top-0 flex-col gap-y-0.5 z-20 min-w-50 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
                  <button
                    // onClick={selectCurrentText}
                    // disabled={isBlockEmpty()}
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
                  >
                    Blank Document
                  </button>
                  <button
                    // onClick={selectCurrentText}
                    // disabled={isBlockEmpty()}
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-gray-100 cursor-pointer'
                  >
                    From Service Template
                  </button>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Folder className='size-3.75' />
                Open
              </button>
              <label className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'>
                <Upload className='size-3.75' />
                Upload docx
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleDocxUpload}
                />
              </label>
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
              <div className='relative group/sub'>
                <button
                  onClick={() => window.print()}
                  className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
                >
                  <Download className='size-3.75' />
                  Download
                  <ChevronRight className='absolute right-2 size-3.75' />
                </button>
                <div className='hidden group-hover/sub:flex absolute left-full -top-4 flex-col gap-y-0.5 z-20 min-w-60 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
                  <button
                    onClick={exportToDocx}
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
                  >
                    MS Word Document (.docx)
                  </button>
                  <button
                    onClick={exportToPDF}
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
                  >
                    PDF Document (.pdf)
                  </button>
                  <button
                    onClick={exportToHtml}
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
                  >
                    Html Web Format (.html)
                  </button>
                  <button
                    onClick={exportToJson}
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-gray-100 cursor-pointer'
                  >
                    JSON Structured Format (.json)
                  </button>
                </div>
              </div>
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
            <button className='px-2 py-0.5 rounded hover:bg-gray-200'>Edit</button>
            <div className='hidden group-hover:flex absolute -left-2 top-full flex-col gap-y-0.5 z-20 min-w-70 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
              <button
                onClick={() => editor?.chain()?.focus()?.undo()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
              >
                <Undo2 className='size-3.75' />
                Undo
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.redo()?.run()}
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
              <div className='relative group/sub'>
                <button
                  className="relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100"
                >
                  <Highlighter className="size-3.75" />
                  Highlight
                  <ChevronRight className='absolute right-2 size-3.75' />
                </button>
                <div className='hidden group-hover/sub:block absolute left-full -top-4 py-2.5 px-3 rounded-lg shadow-lg bg-white'>
                  <div className='flex flex-col gap-y-0.75 p-1'>
                    {colorSet.map((colors, index) => (
                      <div
                        key={index}
                        className='flex items-center gap-x-0.75'
                      >
                        {colors.map(color => (
                          <button
                            key={color}
                            className='size-5 rounded-full border border-gray-300'
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
                        className="sr-only absolute left-full -top-4 shadow-lg"
                        onChange={(e) => editor?.chain()?.focus()?.toggleHighlight({ color: e.target.value })?.run()}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className='relative group/sub'>
                <button
                  className="relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100"
                >
                  <Baseline className="size-4" />
                  Font color
                  <ChevronRight className='absolute right-2 size-3.75' />
                </button>
                <div className='hidden group-hover/sub:block absolute left-full -top-4 py-2.5 px-3 rounded-lg shadow-lg bg-white'>
                  <div className='flex flex-col gap-y-0.75 p-1'>
                    {colorSet.map((colors, index) => (
                      <div
                        key={index}
                        className='flex items-center gap-x-0.75'
                      >
                        {colors.map(color => (
                          <button
                            key={color}
                            className='size-5 rounded-full border border-gray-300'
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
                        className="sr-only absolute left-full -top-4 shadow-lg"
                        onChange={(e) => editor?.chain()?.focus()?.setColor(e.target.value)?.run()}
                      />
                    </label>
                  </div>
                </div>
              </div>
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
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
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
            <button className='px-2 py-0.5 rounded hover:bg-gray-200'>View</button>
            <div className='hidden group-hover:flex absolute -left-2 top-full flex-col gap-y-0.5 z-20 min-w-60 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
              <button
                onClick={() => {
                  setEnableImageBubble(!enableImageBubble);
                  editor.commands.setBubbleVisibility(!enableImageBubble)
                }}
                className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
              >
                <RotateCwSquare className='size-3.75' />
                {enableImageBubble ? 'Hide' : 'Show'} image bubble
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
                {enableTableBubble ? 'Hide' : 'Show'} table bubble
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
                {enableTextBubble ? 'Hide' : 'Show'} text bubble
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
                {enableRuler ? 'Hide' : 'Show'} show ruler
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
                {enableToolbar ? 'Hide' : 'Show'} show toolbar
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
            <button className='px-2 py-0.5 rounded hover:bg-gray-200'>Insert</button>
            <div className='hidden group-hover:flex absolute -left-2 top-full flex-col gap-y-0.5 z-20 min-w-70 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
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
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <SquareCenterlineDashedVertical className='size-3.75' />
                Page break
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={() => editor?.chain()?.focus()?.toggleCodeBlock()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Signature className='size-3.75' />
                eSignature
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.toggleCodeBlock()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-gray-100 cursor-pointer'
              >
                <Paperclip className='size-3.75' />
                Attach file
              </button>
            </div>
          </div>
          <div className='relative group'>
            <button className='px-2 py-0.5 rounded hover:bg-gray-200'>Format</button>
            <div className='hidden group-hover:flex absolute -left-2 top-full flex-col gap-y-0.5 z-20 min-w-70 p-0.5 bg-white shadow-2xl border border-gray-300 rounded-lg'>
              <button
                onClick={() => editor?.chain()?.focus()?.toggleBold()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
              >
                <Bold className='size-3.75' />
                Bold text
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.toggleItalic()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Italic className='size-3.75' />
                Italic
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.toggleUnderline()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Underline className='size-3.75' />
                Underline
              </button>
              <button
                onClick={() => editor?.chain()?.focus()?.toggleStrike()?.run()}
                className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
              >
                <Strikethrough className='size-3.75' />
                Strikethrough
              </button>
              <div className="h-px border-b border-gray-200 w-full" />
              <div className='relative group/sub'>
                <button
                  className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100'
                >
                  <ListChevronsUpDownIcon className='size-3.75' />
                  Line spacing
                  <ChevronRight className='absolute right-2 size-3.75' />
                </button>
                <div className="absolute left-full -top-2 min-w-37.5 text-[13px] hidden group-hover/sub:flex flex-col p-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 overflow-hidden">
                  {['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'].map((spacing) => (
                    <button
                      key={spacing}
                      type="button"
                      onClick={() => editor?.chain()?.focus()?.setLineHeight(spacing)?.run()}
                      className={cn(
                        'px-3 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded cursor-pointer', 
                        spacing === '1.0' ? 'rounded-tl-md rounded-tr-md' : '',
                      )}
                    >
                      {spacing}
                    </button>
                  ))}
                  <div className="h-px border-t border-zinc-100 dark:border-zinc-700" />
                  <button
                    type="button"
                    onClick={() => editor?.chain()?.focus()?.unsetLineHeight()?.run()}
                    className="px-3 py-1.25 text-left hover:bg-zinc-100 rounded rounded-bl-md rounded-br-md dark:hover:bg-zinc-700 cursor-pointer"
                  >
                    Reset text spacing
                  </button>
                </div>
              </div>
              <div className='relative group/sub'>
                <button
                  onClick={() => window.print()}
                  className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100'
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
                  Text alignment
                  <ChevronRight className='absolute right-2 size-3.75' />
                </button>
                <div className="absolute left-full -top-2 min-w-37.5 text-[13px] hidden group-hover/sub:flex flex-col p-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => editor?.chain()?.focus()?.setTextAlign('left')?.run()}
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
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
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-gray-100 cursor-pointer'
                  >
                    Justify Text
                  </button>
                </div>
              </div>
              <div className='relative group/sub'>
                <button
                  className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100'
                >
                  <AlignJustify className='size-3.75' />
                  Paragraph styles
                  <ChevronRight className='absolute right-2 size-3.75' />
                </button>
                <div className="absolute left-full -top-2 min-w-37.5 text-[13px] hidden group-hover/sub:flex flex-col p-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => {
                      editor?.chain()?.focus()?.unsetAllMarks()?.run();
                      editor?.chain()?.focus()
                        ?.toggleHeading({ level: 1 })
                        ?.run();
                    }}  
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
                  >
                    Heading 1
                  </button>
                  <button
                    onClick={() => {
                      editor?.chain()?.focus()?.unsetAllMarks()?.run();
                      editor?.chain()?.focus()
                        ?.toggleHeading({ level: 2 })
                        ?.run();
                    }} 
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
                  >
                    Heading 2
                  </button>
                  <button
                    onClick={() => {
                      editor?.chain()?.focus()?.unsetAllMarks()?.run();
                      editor?.chain()?.focus()
                        ?.toggleHeading({ level: 3 })
                        ?.run();
                    }} 
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
                  >
                    Heading 3
                  </button>
                  <button
                    onClick={() => {
                      editor?.chain()?.focus()?.unsetAllMarks()?.run();
                      editor?.chain()?.focus()
                        ?.toggleHeading({ level: 4 })
                        ?.run();
                    }} 
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
                  >
                    Heading 4
                  </button>
                  <button
                    onClick={() => {
                      editor?.chain()?.focus()?.unsetAllMarks()?.run();
                      editor?.chain()?.focus()
                        ?.toggleHeading({ level: 4 })
                        ?.run();
                    }} 
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
                  >
                    Heading 5
                  </button>
                  <button
                    onClick={() => {
                      editor?.chain()?.focus()?.setParagraph()?.run();
                    }} 
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-gray-100 cursor-pointer'
                  >
                    Paragraph
                  </button>
                </div>
              </div>
              <div className="h-px border-b border-gray-200 w-full" />
              <div className='relative group/sub'>
                <button
                  onClick={() => window.print()}
                  className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100'
                >
                  {(() => {
                    if (editor.isActive('bulletList')) {
                      return <List className='size-3.75' />
                    }

                    if (editor?.isActive('orderedList')) {
                      return <ListOrdered className="size-3.75" />
                    }

                    return <ListTodo className="size-3.75" />
                  })()}
                  Bullet and numbering
                  <ChevronRight className='absolute right-2 size-3.75' />
                </button>
                <div className="absolute left-full -top-2 min-w-37.5 text-[13px] hidden group-hover/sub:flex flex-col p-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => editor?.chain()?.focus()?.toggleBulletList()?.run()}
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
                  >
                    Unordered List
                  </button>
                  <button
                    onClick={() => editor?.chain()?.focus()?.toggleOrderedList().run()}
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
                  >
                    Ordered List
                  </button>
                  <button
                    onClick={() => editor?.chain()?.focus()?.toggleTaskList().run()}
                    className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-gray-100 cursor-pointer'
                  >
                    Task List
                  </button>
                </div>
              </div>
              <div className='relative group/sub'>
                <button
                  disabled={!(editor.isActive('bulletList') || editor.isActive('orderedList'))}
                  className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed'
                >
                  <IndentIncrease className='size-3.75' />
                  Indentation
                  <ChevronRight className='absolute right-2 size-3.75' />
                </button>
                {(editor.isActive('bulletList') || editor.isActive('orderedList')) && (
                  <div className="absolute left-full -top-2 min-w-37.5 text-[13px] hidden group-hover/sub:flex flex-col p-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 overflow-hidden">
                    <button
                      onClick={() => editor?.chain()?.focus()?.sinkListItem('listItem')?.run()}
                      className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
                    >
                      Increase indentation
                    </button>
                    <button
                      onClick={() => editor?.chain()?.focus()?.liftListItem('listItem')?.run()}
                      className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-gray-100 cursor-pointer'
                    >
                      Decrease indentation
                    </button>
                  </div>
                )}
              </div>
              <div className="h-px border-b border-gray-200 w-full" />
              <div className='relative group/sub'>
                <button
                  disabled={!editor.isActive('table')}
                  className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed'
                >
                  <Table className='size-3.75' />
                  Table
                  <ChevronRight className='absolute right-2 size-3.75' />
                </button>
                {editor.isActive('table') && (
                  <div className="absolute left-full -top-4 p-0.5 min-w-45 text-[12px] hidden group-hover/sub:flex flex-col bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-20">
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().addColumnBefore().run()
                      }}
                      className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer dark:hover:bg-zinc-700 rounded rounded-tl-md rounded-tr-md"
                    >
                      Insert Column Left
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().addColumnAfter().run()
                      }}
                      className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded"
                    >
                      Insert Column Right
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().addRowBefore().run()
                      }}
                      className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded"
                    >
                      Insert Row Before
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().addRowAfter().run()
                      }}
                      className="px-3 py-1.25 text-left hover:bg-zinc-100 cursor-pointer rounded"
                    >
                      Insert Row After
                    </button>

                    <div className="h-px w-full border-t border-gray-200 dark:bg-zinc-800" />

                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().deleteColumn().run()
                      }}
                      className="px-3 py-1.25 text-left hover:bg-red-50 hover:text-red-600 rounded cursor-pointer"
                    >
                      Remove Column
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().deleteRow().run()
                      }}
                      className="px-3 py-1.25 text-left hover:bg-red-50 hover:text-red-600 rounded rounded-bl-md rounded-br-md cursor-pointer"
                    >
                      Remove Row
                    </button>
                  </div>
                )}
              </div>
              <div className='relative group/sub'>
                <button
                  disabled={!editor.isActive('customImage')}
                  className='relative w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:bg-transparent'
                >
                  <ImageIcon className='size-3.75' />
                  Image
                  <ChevronRight className='absolute right-2 size-3.75' />
                </button>
                {editor.isActive('customImage') && (
                  <div className="absolute left-full -top-2 min-w-37.5 text-[13px] hidden group-hover/sub:flex flex-col p-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 overflow-hidden">
                    <button
                      onClick={() => editor?.commands.setImageAlignment('left')}
                      className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-tl-md rounded-tr-md hover:bg-gray-100 cursor-pointer'
                    >
                      Align Left
                    </button>
                    <button
                      onClick={() => editor?.commands.setImageAlignment('center')}
                      className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded hover:bg-gray-100 cursor-pointer'
                    >
                      Align Center
                    </button>
                    <button
                      onClick={() => editor?.commands.setImageAlignment('right')}
                      className='w-full flex items-center gap-x-2 text-left px-2.5 py-1 rounded rounded-bl-md rounded-br-md hover:bg-gray-100 cursor-pointer'
                    >
                      Align Right
                    </button>
                  </div>
                )}
              </div>
              <div className="h-px border-b border-gray-200 w-full" />
              <button
                onClick={() => editor?.chain()?.focus()?.unsetAllMarks()?.clearNodes()?.run()}
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
