'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Grid2x2, List, ArrowDownAZ, FileText, Plus, MoreVertical } from 'lucide-react';
import type { DocumentSummary, ServiceTemplate } from '@/lib/documents/laravel-documents';
import { formatRelativeTime } from '@/lib/format-relative-time';

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

  const sortedDocuments = useMemo(() => {
    const copy = [...documents];
    if (sortAz) {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      copy.sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime());
    }
    return copy;
  }, [documents, sortAz]);

  async function handleCreate(templateId?: string) {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || 'Could not create a new document.');
        return;
      }
      router.push(`/docs/${data.document.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className='h-screen bg-[#F9FBFD]'>
      <div className="min-h-full w-7/12 mx-auto px-8 py-6">
        {/* Start a new document */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg text-gray-800">Start a new document</h1>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => handleCreate()}
              disabled={creating}
              className="w-36 shrink-0 rounded-md border border-gray-300 bg-white text-left hover:shadow-md disabled:opacity-50 overflow-hidden"
            >
              <div className="flex aspect-3/4 items-center justify-center bg-white">
                <Plus className="size-10 text-blue-500" />
              </div>
              <div className="border-t border-gray-200 px-2 py-1.5 text-xs text-gray-700 font-medium">Blank template</div>
            </button>

            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleCreate(template.id)}
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
                className={`rounded p-1.5 hover:bg-gray-100 ${sortAz ? 'text-blue-600' : 'text-gray-500'}`}
              >
                <ArrowDownAZ className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                title="List view"
                className={`rounded p-1.5 hover:bg-gray-100 ${view === 'list' ? 'text-blue-600' : 'text-gray-500'}`}
              >
                <List className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setView('grid')}
                title="Grid view"
                className={`rounded p-1.5 hover:bg-gray-100 ${view === 'grid' ? 'text-blue-600' : 'text-gray-500'}`}
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
                  ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                  : 'flex flex-col divide-y divide-gray-100 rounded border border-gray-200 bg-white'
              }
            >
              {sortedDocuments.map((doc) =>
                view === 'grid' ? (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => router.push(`/docs/${doc.id}`)}
                    className="rounded border border-gray-200 bg-white text-left hover:shadow-md"
                  >
                    <div className="flex aspect-3/4 items-center justify-center overflow-hidden rounded-t bg-gray-50">
                      {doc.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external, unknown-host Laravel media; next/image requires a known remotePattern
                        <img src={doc.thumbnail_url} alt={doc.title} className="size-full object-cover" />
                      ) : (
                        <FileText className="size-8 text-gray-300" />
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-x-1 border-t border-gray-200 px-2 py-1.5">
                      <div className="min-w-0">
                        <div className="truncate text-xs text-gray-800">{doc.title}</div>
                        <div className="truncate text-[11px] text-gray-400">
                          Opened {formatRelativeTime(doc.opened_at ?? doc.updated_at)}
                        </div>
                      </div>
                      <MoreVertical className="size-3.5 shrink-0 text-gray-400" />
                    </div>
                  </button>
                ) : (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => router.push(`/docs/${doc.id}`)}
                    className="flex items-center gap-x-3 px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <FileText className="size-4 shrink-0 text-gray-400" />
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{doc.title}</span>
                    <span className="shrink-0 text-xs text-gray-400">
                      Opened {formatRelativeTime(doc.opened_at ?? doc.updated_at)}
                    </span>
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
