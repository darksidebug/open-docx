'use client';

import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import { getBaseExtensions } from '@/lib/editor/base-extensions';
import { downloadDocx } from '@/lib/export-to-docx';
import { downloadPdf } from '@/lib/export-to-pdf';
import Link from 'next/link';
import { Printer, FileDown, ArrowLeft } from 'lucide-react';

interface DocumentViewerProps {
  documentId: string;
  documentTitle: string;
  content: JSONContent | null;
  updatedAt: string | null;
}

export default function DocumentViewer({ documentId, documentTitle, content, updatedAt }: DocumentViewerProps) {
  const editor = useEditor({
    editable: false,
    editorProps: {
      attributes: {
        style: 'padding-left: 56px; padding-right: 56px;',
        class: 'overflow-x-visible focus:outline-none print:border-0 bg-white border border-gray-200 flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 text-[13px]',
      },
    },
    extensions: getBaseExtensions(),
    content: content ?? '',
    immediatelyRender: false,
  });

  const handlePrint = () => window.print();

  const handleDownloadDocx = async () => {
    if (!editor) return;
    await downloadDocx(editor.getJSON(), `${documentTitle}.docx`);
  };

  const handleDownloadPdf = async () => {
    if (!editor) return;
    await downloadPdf(editor.getJSON(), `${documentTitle}.pdf`);
  };

  return (
    <div className="bg-[#F9FBFD]">
      <div className="print:hidden sticky top-0 left-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-x-3">
          <Link
            href={`/docs/${documentId}`}
            className="flex items-center gap-x-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="size-4" />
            Back to editor
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <div>
            <div className="text-sm font-medium text-gray-800">{documentTitle}</div>
            {updatedAt && (
              <div className="text-xs text-gray-400">Last saved {new Date(updatedAt).toLocaleString()}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-x-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!editor}
            className="flex items-center gap-x-1.5 rounded border border-gray-300 px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Printer className="size-3.75" />
            Print
          </button>
          <button
            type="button"
            onClick={handleDownloadDocx}
            disabled={!editor}
            className="flex items-center gap-x-1.5 rounded border border-gray-300 px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <FileDown className="size-3.75" />
            Word
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={!editor}
            className="flex items-center gap-x-1.5 rounded border border-gray-300 px-2.5 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <FileDown className="size-3.75" />
            PDF
          </button>
        </div>
      </div>

      {!content && (
        <p className="print:hidden px-4 py-2 text-center text-sm text-gray-400">
          This document has no saved content yet.
        </p>
      )}

      <div className="document-workspace mb-8">
        <div className="size-full bg-[#F9FBFD] px-4 print:p-0 print:bg-white print:overflow-auto">
          <div className="mx-auto min-w-max flex justify-center w-204 py-4 print:py-0 print:w-full print:min-w-0">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
