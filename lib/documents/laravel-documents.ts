import 'server-only';

import { laravelFetch, LaravelApiError } from '@/lib/auth/laravel';

const DOCUMENT_PATH_TEMPLATE = process.env.LARAVEL_DOCUMENT_PATH || '/api/documents/:id';

export interface ServiceDocument {
  id: string; // UUID
  title?: string;
  order_id?: string | number;
  [key: string]: unknown;
}

function documentPath(id: string) {
  return DOCUMENT_PATH_TEMPLATE.replace(':id', encodeURIComponent(id));
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
