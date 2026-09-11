// Standalone real-time collaboration server (Yjs via Hocuspocus).
//
// Runs as its own process, separate from `next dev`/`next start`, since
// Next.js Route Handlers can't hold a persistent WebSocket server. Run it
// alongside the Next.js app with `npm run collab-server` (or `npm run dev:all`
// to start both together).
//
// Each document is a service-template docx tied to an ordered service in
// Laravel/Postgres, identified by its UUID (the same id used in the
// `/docs/[id]` URL). Every connecting browser tab is checked twice against
// Laravel, using the same session cookie the Next.js app set after login
// (`ldx_token`, see lib/auth/session.ts):
//   1. Who is this? (GET LARAVEL_USER_PATH)
//   2. Are they assigned to this document's ordered service? (GET LARAVEL_DOCUMENT_PATH)
// Anyone who fails either check is rejected before they can see or edit
// anything in that document.
//
// Edits are NOT saved on every keystroke. Hocuspocus's own `onStoreDocument`
// hook is debounced (COLLAB_SAVE_DEBOUNCE_MS after the last edit, but at
// least every COLLAB_SAVE_MAX_DEBOUNCE_MS while someone keeps typing) — see
// https://tiptap.dev/docs/hocuspocus/server/hooks#onstoredocument. Each fire
// converts the live Yjs document into Tiptap JSON + HTML and PUTs it to
// Laravel's reporting endpoint (LARAVEL_REPORT_PATH), which is expected to
// write it to a separate "final reporting" table, distinct from whatever
// table stores the document/order/template. A local disk snapshot is also
// kept as a fast-reload cache — that one is *not* the reporting table, just
// a resilience layer for this process (see STORAGE_DIR below).
import { config } from 'dotenv';
import { Server } from '@hocuspocus/server';
import { TiptapTransformer } from '@hocuspocus/transformer';
import { generateHTML } from '@tiptap/html/server';
import type { Extensions, JSONContent } from '@tiptap/core';
import * as Y from 'yjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { REPORT_EXTENSIONS } from '../lib/collab/report-extensions';

const reportExtensions = REPORT_EXTENSIONS as Extensions;

// Loads .env.local (if present) then .env, matching how Next.js resolves env files,
// so this standalone process reads the same values as `next dev`.
config({ path: '.env.local' });
config({ path: '.env' });

const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'http://localhost:8000';
const LARAVEL_USER_PATH = process.env.LARAVEL_USER_PATH || '/api/user';
const LARAVEL_DOCUMENT_PATH = process.env.LARAVEL_DOCUMENT_PATH || '/api/documents/:id';
const LARAVEL_REPORT_PATH = process.env.LARAVEL_REPORT_PATH || '/api/documents/:id/report';
const SESSION_COOKIE = 'ldx_token'; // must match lib/auth/session.ts SESSION_COOKIE
const PORT = Number(process.env.COLLAB_WS_PORT || 1234);
const SAVE_DEBOUNCE_MS = Number(process.env.COLLAB_SAVE_DEBOUNCE_MS || 4000);
const SAVE_MAX_DEBOUNCE_MS = Number(process.env.COLLAB_SAVE_MAX_DEBOUNCE_MS || 20000);
const STORAGE_DIR = path.resolve(process.cwd(), '.data', 'documents');

interface AuthContext {
  user: Record<string, unknown>;
  token: string;
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  }
  return out;
}

async function getUserForToken(token: string) {
  const response = await fetch(`${LARAVEL_API_URL}${LARAVEL_USER_PATH}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.user ?? data.data ?? data;
}

/** Is this user assigned to the ordered service this document UUID belongs to? */
async function canAccessDocument(token: string, documentId: string) {
  const documentPath = LARAVEL_DOCUMENT_PATH.replace(':id', encodeURIComponent(documentId));
  const response = await fetch(`${LARAVEL_API_URL}${documentPath}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  return response.ok;
}

function storagePath(documentName: string) {
  return path.join(STORAGE_DIR, `${documentName}.bin`);
}

const server = new Server({
  port: PORT,
  debounce: SAVE_DEBOUNCE_MS,
  maxDebounce: SAVE_MAX_DEBOUNCE_MS,

  async onAuthenticate({ requestHeaders, documentName }): Promise<AuthContext> {
    const cookies = parseCookies(requestHeaders.get('cookie'));
    const token = cookies[SESSION_COOKIE];

    if (!token) {
      throw new Error('Not authenticated: missing session cookie.');
    }

    const user = await getUserForToken(token);
    if (!user) {
      throw new Error('Not authenticated: invalid or expired session.');
    }

    const eligible = await canAccessDocument(token, documentName);
    if (!eligible) {
      throw new Error('Not authorized: not assigned to this document\'s ordered service.');
    }

    // Presence display (name/color) comes from the client's own awareness
    // state via CollaborationCaret. This context is what onStoreDocument uses
    // to attribute (and authenticate) the debounced save back to Laravel.
    return { user, token };
  },

  async onLoadDocument({ documentName, document }) {
    try {
      const saved = await readFile(storagePath(documentName));
      Y.applyUpdate(document, saved);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`[collab-server] Failed to load cached snapshot for "${documentName}":`, error);
      }
    }
  },

  async onStoreDocument({ documentName, document, lastContext }) {
    // 1. Local disk snapshot: a fast-reload cache for this process, not the
    //    reporting table. Best-effort — failures here don't block the report save.
    try {
      await mkdir(STORAGE_DIR, { recursive: true });
      await writeFile(storagePath(documentName), Y.encodeStateAsUpdate(document));
    } catch (error) {
      console.error(`[collab-server] Failed to write local snapshot for "${documentName}":`, error);
    }

    // 2. Convert the live Yjs content to Tiptap JSON + HTML, then push to
    //    Laravel's reporting endpoint — the actual "final reporting" save.
    const token = (lastContext as AuthContext | undefined)?.token;
    if (!token) {
      console.warn(`[collab-server] No authenticated context for "${documentName}"; skipping report save.`);
      return;
    }

    let json: JSONContent;
    let html: string;
    try {
      json = TiptapTransformer.fromYdoc(document, 'default');
      html = generateHTML(json, reportExtensions);
    } catch (error) {
      console.error(`[collab-server] Failed to render report content for "${documentName}":`, error);
      return;
    }

    const reportPath = LARAVEL_REPORT_PATH.replace(':id', encodeURIComponent(documentName));
    try {
      const response = await fetch(`${LARAVEL_API_URL}${reportPath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: json, html, updated_at: new Date().toISOString() }),
      });
      if (!response.ok) {
        console.error(`[collab-server] Report save for "${documentName}" failed: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`[collab-server] Could not reach Laravel to save report for "${documentName}":`, error);
    }
  },
});

server.listen().then(() => {
  console.log(`[collab-server] listening on ws://localhost:${PORT}`);
  console.log(`[collab-server] auth: ${LARAVEL_API_URL}${LARAVEL_USER_PATH}`);
  console.log(`[collab-server] document access check: ${LARAVEL_API_URL}${LARAVEL_DOCUMENT_PATH}`);
  console.log(`[collab-server] report save: ${LARAVEL_API_URL}${LARAVEL_REPORT_PATH} (debounce ${SAVE_DEBOUNCE_MS}ms / max ${SAVE_MAX_DEBOUNCE_MS}ms)`);
});
