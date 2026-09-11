import 'server-only';

import type { JSONContent } from '@tiptap/core';
import { laravelFetch, LaravelApiError } from '@/lib/auth/laravel';

const DOCUMENT_PATH_TEMPLATE = process.env.LARAVEL_DOCUMENT_PATH || '/api/documents/:id';
const REPORT_PATH_TEMPLATE = process.env.LARAVEL_REPORT_PATH || '/api/documents/:id/report';
const DOCUMENTS_LIST_PATH = process.env.LARAVEL_DOCUMENTS_LIST_PATH || '/api/documents';
const TEMPLATES_LIST_PATH = process.env.LARAVEL_TEMPLATES_LIST_PATH || '/api/service-templates';

export interface ServiceDocument {
  id: string; // UUID
  title?: string;
  order_id?: string | number;
  [key: string]: unknown;
}

export interface DocumentReport {
  content: JSONContent;
  html: string;
  updated_at: string | null;
}

/** One row in the "Recent documents" list — documents this user is assigned to. */
export interface DocumentSummary {
  id: string;
  title: string;
  updated_at: string | null;
  opened_at?: string | null;
  owner_name?: string | null;
  thumbnail_url?: string | null;
}

/** One card in the "Start a new document" template gallery — a service template. */
export interface ServiceTemplate {
  id: string;
  name: string;
  category?: string | null;
  thumbnail_url?: string | null;
}

function documentPath(id: string) {
  return DOCUMENT_PATH_TEMPLATE.replace(':id', encodeURIComponent(id));
}

function reportPath(id: string) {
  return REPORT_PATH_TEMPLATE.replace(':id', encodeURIComponent(id));
}

/**
 * Checks whether the given token's user is eligible to open this document —
 * i.e. Laravel says they're assigned to the ordered service this document
 * template belongs to. Expects Laravel to respond 200 with the document if
 * eligible, and 403/404 otherwise (any other status is treated as an error,
 * not "ineligible", so a Laravel outage doesn't silently look like a
 * permissions failure to the user).
 */
export async function authorizeDocument(token: string, documentId: string): Promise<ServiceDocument | null> {
  const response = await laravelFetch(documentPath(documentId), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 403 || response.status === 404) return null;

  if (!response.ok) {
    throw new LaravelApiError(`Failed to load document ${documentId} from Laravel.`, response.status);
  }

  const data = await response.json();
  return data.document ?? data.data ?? data;
}

/**
 * Fetches the most recently auto-saved content for a document — the same
 * `{ content, html, updated_at }` shape the collab server PUTs to this same
 * path (see server/collab-server.ts). Used to render the read-only view page
 * without needing a live collaboration/WebSocket connection. Returns null if
 * the document has never been saved yet (e.g. a brand-new, never-opened
 * document), which callers should render as "no content yet" rather than an
 * error.
 */
export async function getDocumentReport(token: string, documentId: string): Promise<DocumentReport | null> {
  const response = await laravelFetch(reportPath(documentId), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new LaravelApiError(`Failed to load the saved report for document ${documentId}.`, response.status);
  }

  const data = await response.json();
  return data.report ?? data.data ?? data;
}

/** Documents the current user is assigned to (i.e. eligible to open), most-recent first. */
export async function listDocuments(token: string): Promise<DocumentSummary[]> {
  const response = await laravelFetch(DOCUMENTS_LIST_PATH, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new LaravelApiError('Failed to load documents from Laravel.', response.status);
  }

  const data = await response.json();
  return data.documents ?? data.data ?? (Array.isArray(data) ? data : []);
}

/** Service templates available to start a new document from. */
export async function listTemplates(token: string): Promise<ServiceTemplate[]> {
  const response = await laravelFetch(TEMPLATES_LIST_PATH, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new LaravelApiError('Failed to load service templates from Laravel.', response.status);
  }

  const data = await response.json();
  return data.templates ?? data.data ?? (Array.isArray(data) ? data : []);
}

/**
 * Creates a new document, optionally from a template (blank if omitted).
 * Laravel is responsible for deciding how the new document relates to
 * orders/services — this call just asks for one and gets an id back.
 */
export async function createDocument(
  token: string,
  options: { templateId?: string; title?: string } = {},
): Promise<DocumentSummary> {
  const response = await laravelFetch(DOCUMENTS_LIST_PATH, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ template_id: options.templateId ?? null, title: options.title ?? null }),
  });

  if (!response.ok) {
    throw new LaravelApiError('Failed to create a new document.', response.status);
  }

  const data = await response.json();
  return data.document ?? data.data ?? data;
}
