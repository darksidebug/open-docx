'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Grid2x2,
  List,
  ArrowDownAZ,
  FileText,
  Plus,
  MoreVertical,
  Trash2,
  ExternalLink,
  CornerUpRight,
  Search
} from 'lucide-react';
import type { DocumentSummary, FormOption, ServiceTemplate } from '@/lib/documents/laravel-documents';
import { formatRelativeTime } from '@/lib/format-relative-time';
import { useEditorStore } from '@/store/useEditorStore';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DocsHomeProps {
  documents: DocumentSummary[];
  templates: ServiceTemplate[];
  loadError: boolean;
}

const PLACEHOLDER_COLORS = [
  '#60A5FA', '#34D399', '#FBBF24', '#F472B6',
  '#A78BFA', '#FB923C', '#22D3EE', '#A3E635',
];

function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

export default function DocsHome({ documents, templates, loadError }: DocsHomeProps) {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortAz, setSortAz] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { documentName } = useEditorStore();

  console.log('object-document', documents)

  const sortedDocuments = useMemo(() => {
    const copy = [...documents];
    if (sortAz) {
      copy.sort((a, b) => a.document_name.localeCompare(b.document_name));
    } else {
      copy.sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime());
    }
    return copy;
  }, [documents, sortAz]);

  async function handleCreate(option: FormOption) {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...option }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || 'Could not create a new document.');
        return;
      }

      router.push(`/docs/${data.document.uuid}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className='h-screen bg-[#F9FBFD]'>
      <div className='flex items-center justify-between px-6 py-2.5 border-b border-gray-300'>
        <div className='flex items-center gap-2'>
          <Link href='/docs'>
            <Image
              src='/logo/docx.png'
              alt='logo'
              height={40}
              width={40}
            />
          </Link>
          <h3 className='font-extrabold text-xl'>
            <span className=''>Open</span>
            <span className='font-serif text-blue-500'>Docx</span>
          </h3>
        </div>
        <div className='relative'>
          <Search className='absolute left-4 top-3 size-4 text-gray-500' />
          <input
            className='focus:outline-0 pl-10 pr-2 py-2 border border-gray-300 rounded-full min-w-200 bg-white'
            placeholder='Search document'
          />
        </div>
        <div className='size-10 rounded-full bg-gray-300'></div>
      </div>
      <div className="min-h-full w-full lg:w-10/12 xl:w-8/12 2xl:7/12 mx-auto px-8 py-6 font-medium">
        {/* Start a new document */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-md text-gray-800">Start a new document</h1>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => {
                handleCreate({
                  service_id: 1,
                  document_name: documentName,
                  document_content: null
                })
              }}
              disabled={creating}
              className="w-40 shrink-0 min-w-40 rounded-md border border-gray-300 bg-white text-left hover:shadow-md disabled:opacity-50 overflow-hidden"
            >
              <div className="flex aspect-3/3.5 items-center justify-center bg-white">
                <Plus className="size-10 text-gray-500" />
              </div>
              <div className="border-t border-gray-200 px-2 py-1.5 text-xs text-gray-700 font-medium">Blank template</div>
            </button>

            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                // onClick={() => handleCreate(template.id)}
                disabled={creating}
                className="w-36 shrink-0 rounded-md border border-gray-300 bg-white text-left hover:shadow-md disabled:opacity-50 overflow-hidden"
              >
                <div className="relative flex aspect-3/4 items-center justify-center overflow-hidden bg-gray-50">
                  {template.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external, unknown-host Laravel media; next/image requires a known remotePattern
                    <img src={template.thumbnail_url} alt={template.name} className="size-full object-cover" />
                  ) : (
                    <div
                      className="flex size-10 items-center justify-center rounded text-sm font-medium text-white"
                      style={{ backgroundColor: colorForId(template.id) }}
                    >
                      {template.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-200 px-2 py-1.5">
                  <div className="truncate text-xs text-gray-700">{template.name}</div>
                  {template.category && <div className="truncate text-[11px] text-gray-400">{template.category}</div>}
                </div>
              </button>
            ))}
          </div>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="h-px w-full border-b border-gray-200" />

        {/* Recent documents */}
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm text-gray-600">Recent documents</h2>

            <div className="flex items-center gap-x-1">
              <button
                type="button"
                onClick={() => setSortAz((v) => !v)}
                title={sortAz ? 'Sorted A-Z' : 'Sorted by last modified'}
                className={`rounded p-1.5 hover:bg-zinc-200 cursor-pointer ${sortAz ? 'text-blue-600' : 'text-gray-500'}`}
              >
                <ArrowDownAZ className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                title="List view"
                className={`rounded p-1.5 hover:bg-zinc-200 cursor-pointer ${view === 'list' ? 'text-blue-600' : 'text-gray-500'}`}
              >
                <List className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('grid')}
                title="Grid view"
                className={`rounded p-1.5 hover:bg-zinc-200 cursor-pointer ${view === 'grid' ? 'text-blue-600' : 'text-gray-500'}`}
              >
                <Grid2x2 className="size-4" />
              </button>
            </div>
          </div>

          {loadError && (
            <p className="text-sm text-gray-400">Couldn&apos;t load your documents right now. Try again shortly.</p>
          )}

          {!loadError && sortedDocuments.length === 0 && (
            <p className="text-sm text-gray-400">No documents yet — start one above.</p>
          )}

          {!loadError && sortedDocuments.length > 0 && (
            <div
              className={
                view === 'grid'
                  ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 rounded-xl'
                  : 'flex flex-col gap-y-1 bg-white p-2 border border-gray-200 rounded-xl'
              }
            >
              {sortedDocuments.map((doc, index) =>
                view === 'grid' ? (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => router.push(`/docs/${doc.uuid}`)}
                    className="rounded-lg border border-gray-300 bg-white text-left hover:shadow-md"
                  >
                    <div className="flex aspect-3/3.5 items-center justify-center overflow-hidden rounded-lg bg-white">
                      {doc.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external, unknown-host Laravel media; next/image requires a known remotePattern
                        <img src={doc.thumbnail_url} alt={doc.document_name || 'Untitled document'} className="size-full object-cover" />
                      ) : (
                        <Image
                          src='/logo/docx.png'
                          alt='logo'
                          height={90}
                          width={90}
                          className='opacity-95'
                        />
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-x-1 border-t border-gray-200 px-2 py-1.5">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] text-gray-800 font-medium">{doc.document_name || 'Untitled document'}</div>
                        <div className="truncate text-[11px] text-gray-400">
                          Last opened {formatRelativeTime(doc.opened_at ?? doc.updated_at)}
                        </div>
                      </div>
                      <div className='relative group'>
                        <div
                          role='button'
                          className='p-2 group-hover:bg-gray-200 border border-gray-200 rounded-full cursor-pointer'
                        >
                          <MoreVertical className='size-4' />
                        </div>
                        <div className='hidden absolute z-10 group-hover:flex flex-col gap-y-1 min-w-45 text-[13px] bg-white p-0.5 rounded-lg shadow-lg border border-gray-200 font-medium'>
                          <Link
                            href={`/docs/${doc.uuid}`}
                            onClick={e => e.stopPropagation()}
                            className='flex items-center gap-x-2 px-2 py-1.5 hover:bg-gray-100 rounded rounded-tl-md rounded-tr-md'
                          >
                            <CornerUpRight className='size-4' />
                            Open
                          </Link>
                          <Link
                            href={`/docs/${doc.uuid}`}
                            onClick={e => e.stopPropagation()}
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            className='flex items-center gap-x-2 px-2 py-1.5 hover:bg-gray-100 rounded'
                          >
                            <ExternalLink className='size-4' />
                            Open in new window
                          </Link>
                          <div
                            role='button'
                            className='flex items-center gap-x-2 px-2 py-1.5 hover:bg-red-50 hover:text-red-500 rounded rounded-bl-md rounded-br-md cursor-pointer'
                          >
                            <Trash2 className='size-4' />
                            Delete
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ) : (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => router.push(`/docs/${doc.uuid}`)}
                    className={cn(
                      "flex items-center justify-between gap-x-3 px-3 py-2 text-left rounded border border-gray-100 bg-gray-50 hover:bg-gray-100",
                      index === 0 ? 'rounded-tr-lg rounded-tl-lg' : '',
                      index === sortedDocuments?.length - 1 ? 'rounded-br-lg rounded-bl-lg' : '',
                    )}
                  >
                    <div className='flex gap-2'>
                      <Image
                        src='/logo/docx.png'
                        alt='logo'
                        height={40}
                        width={40}
                        className='opacity-95'
                      />
                      <div className='flex flex-col'>
                        <span className="min-w-0 truncate text-sm text-gray-800 font-medium">{doc.document_name || 'Untitled document'}</span>
                        <span className="shrink-0 text-xs text-gray-400">
                          Last opened {formatRelativeTime(doc.opened_at ?? doc.updated_at)}
                        </span>
                      </div>
                    </div>
                    <div className='relative group'>
                      <div
                        role='button'
                        className='p-2 group-hover:bg-gray-300 border border-gray-200 hover:border-gray-300 rounded-full cursor-pointer'
                      >
                        <MoreVertical className='size-4' />
                      </div>
                      <div className='hidden absolute z-10 group-hover:flex flex-col gap-y-1 min-w-45 text-[13px] bg-white p-0.5 rounded-lg shadow-lg border border-gray-200 font-medium'>
                        <Link
                          href={`/docs/${doc.uuid}`}
                          onClick={e => e.stopPropagation()}
                          className='flex items-center gap-x-2 px-2 py-1.5 hover:bg-gray-100 rounded rounded-tl-md rounded-tr-md'
                        >
                          <CornerUpRight className='size-4' />
                          Open
                        </Link>
                        <Link
                          href={`/docs/${doc.uuid}`}
                          onClick={e => e.stopPropagation()}
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          className='flex items-center gap-x-2 px-2 py-1.5 hover:bg-gray-100 rounded'
                        >
                          <ExternalLink className='size-4' />
                          Open in new window
                        </Link>
                        <div
                          role='button'
                          className='flex items-center gap-x-2 px-2 py-1.5 hover:bg-red-50 hover:text-red-500 rounded rounded-bl-md rounded-br-md cursor-pointer'
                        >
                          <Trash2 className='size-4' />
                          Delete
                        </div>
                      </div>
                    </div>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
