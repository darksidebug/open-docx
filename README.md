This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Collaboration & Auth

Each document is a service template identified by a UUID (`/docs/[id]`), tied to an
ordered service in Laravel/Postgres. The editor supports real-time multiplayer editing
(live cursors + presence) for everyone assigned to that ordered service, and
auto-saves the result to a separate reporting table.

Setup:

1. Copy `.env.example` to `.env` (or `.env.local`), set `SESSION_SECRET` (generate one
   with `openssl rand -base64 32` — the app won't start without it), and point
   `LARAVEL_API_URL` at your Laravel app. Adjust the `LARAVEL_*_PATH` vars if your
   routes differ from the defaults documented in that file.
2. Create a test account: `npm run dummy-user` (registers the account defined by the
   `DUMMY_USER_*` env vars against your Laravel API's register endpoint; if that route
   doesn't exist, it prints a `php artisan tinker` snippet to create the row directly).
3. Run the app and the real-time collaboration server together:
   ```bash
   npm run dev:all
   ```
   or separately in two terminals: `npm run dev` and `npm run collab-server`.
4. Sign in at `/login` (the dummy account button fills in the test credentials), then
   open `/docs/<some-document-uuid>` in two browser windows to see live cursors and
   presence on the same document.

How it fits together:

- `app/api/auth/login` forwards credentials to Laravel, then stores `{ token, user }`
  from its response together in one signed (`SESSION_SECRET`), httpOnly session
  cookie — the browser never sees the raw token, and it can't tamper with the user
  data since the cookie is signed. `getCurrentUser()` decodes this cookie directly on
  each request with no further network call, since this API has no confirmed "get
  current user by token" endpoint to call instead (its login response already
  includes the full user). `getSessionToken()` pulls the raw Laravel token back out
  of that same cookie for calls that do need it (documents, templates, reports).
  `app/api/auth/logout` clears it and best-effort notifies Laravel.
- `proxy.ts` redirects unauthenticated visitors away from `/docs/*`.
- `app/docs/[id]/page.tsx` fetches the current user, then calls Laravel
  (`LARAVEL_DOCUMENT_PATH`) to check they're assigned to that document's ordered
  service — eligible users get the editor, everyone else gets a plain "no access"
  message (not a redirect to login, since they *are* logged in, just not eligible
  for this specific document).
- `server/collab-server.ts` is a standalone Yjs/Hocuspocus WebSocket server, run via
  `tsx`. Every connection for a given document UUID is checked twice against Laravel:
  who is this (session cookie → current-user endpoint), and are they eligible for
  *this* document (document endpoint) — independently of the Next.js page check,
  since the WebSocket port is directly reachable on its own.
- **Auto-save, not on every keystroke**: Hocuspocus's built-in `onStoreDocument` hook
  is debounced (`COLLAB_SAVE_DEBOUNCE_MS` after the last edit, but at least every
  `COLLAB_SAVE_MAX_DEBOUNCE_MS` while someone keeps typing). Each fire converts the
  live document to Tiptap JSON + HTML and `PUT`s it to Laravel's `LARAVEL_REPORT_PATH`,
  which is expected to write it into a separate "final reporting" table — distinct
  from whatever table holds the document/template/order itself. A local disk snapshot
  (`.data/documents/<uuid>.bin`) is also kept as a fast-reload cache for this process;
  that's not the reporting table, just a resilience layer.

**Known limitation**: the auto-saved JSON/HTML is generated headlessly in Node (no
browser), using the extension list in `lib/collab/report-extensions.ts`. That list
deliberately leaves out the Details/expandable-section extension, because its
`renderHTML` calls the bare global `document.createElement` instead of the schema's
own document — that only resolves in a real browser or live editor, not a plain Node
process. Any details blocks in a document won't appear in the saved report until
that extension is made headless-safe. Every other custom extension (tables with
custom cell colors, columns, resizable images, etc.) has been verified to round-trip
correctly through this pipeline.

### Read-only view, download, print

`/docs/[id]/view` renders the same document in a non-editable Tiptap instance
(`editable: false`), sourced from the last auto-saved report (`getDocumentReport`) —
it doesn't open a live collaboration/WebSocket connection at all. Same access check
as the editor (must be logged in and assigned to the document's ordered service).

Its action bar (hidden on print via `print:hidden`) has:
- **Print** — `window.print()`, reusing the app's existing print stylesheet.
- **Word** / **PDF** — reuse the same `downloadDocx`/`downloadPdf` converters the
  live editor's own File > Download menu uses, fed from the read-only editor's
  `getJSON()`.
- **Back to editor** — link to `/docs/[id]`.

The live editor's File menu also links to `/docs/[id]/view` ("Open view-only").

Both the live editor and the viewer share one extension list
(`lib/editor/base-extensions.ts`) so they always render content identically —
the editor adds `Collaboration`/`CollaborationCaret` on top of it.

### eSignature (Insert > eSignature)

`lib/extensions/esignature.ts` is a Tiptap node that floats freely over the
page instead of sitting in the text flow — drag it anywhere by its box, resize
it from the corner handle, then either draw a signature into a small canvas
pad (`components/extensions/SignaturePad.tsx`, works with mouse, trackpad, or
touch via the Pointer Events API) or upload an existing signature image.
Position/size (`x`, `y`, `width`, `height`) are plain pixels from the page's
top-left corner, the same coordinate space the editor already renders at
(816×1054px, 96dpi).

Included in both exports as a floating/absolutely-positioned image at that
same page position (converted to EMUs for docx, to pt for PDF) — an unsigned
field (no drawn signature yet) exports as nothing, same as an empty image.
Also included in the auto-saved report pipeline
(`lib/collab/report-extensions.ts`), verified round-trip end to end.

### Docs dashboard (`/docs`)

A Google-Docs-style home page: a "Start a new document" gallery (a blank-document
tile plus one tile per service template) and a "Recent documents" grid/list of the
documents this user is assigned to, sortable and switchable between views.

New Laravel routes this needs, alongside the ones documented above:
- `GET  {LARAVEL_DOCUMENTS_LIST_PATH}` (default `/api/documents`) → `{ documents: [...] }`,
  each `{ id, title, updated_at, opened_at?, thumbnail_url? }` — documents this
  user is assigned to.
- `GET  {LARAVEL_TEMPLATES_LIST_PATH}` (default `/api/service-templates`) →
  `{ templates: [...] }`, each `{ id, name, category?, thumbnail_url? }` — the
  service templates that populate the gallery.
- `POST {LARAVEL_DOCUMENTS_LIST_PATH}` body `{ template_id, title }` (both
  nullable — omitted `template_id` means blank) → `{ document: { id, ... } }`.
  Laravel owns whatever business rules decide how a newly created document
  relates to an order/service; this app just asks for one and navigates to
  `/docs/{id}` with the id it gets back.

Thumbnails fall back to a plain icon (documents) or a colored initial (templates)
when Laravel doesn't provide a `thumbnail_url` — real thumbnail *generation*
(rendering a preview image of a document) isn't implemented.

## Docker

```bash
cp .env.example .env   # fill in your LARAVEL_API_URL etc.
docker compose up --build
```

Runs the Next.js app and the collaboration server in one container (see
`ecosystem.config.js`), on ports 3000 and 1234.

**If your Laravel API is also dockerized on the same machine** (a separate,
independent `docker-compose.yml` you don't want this project entangled with),
don't point `LARAVEL_API_URL` at `127.0.0.1`/`localhost` — inside a container
that always means "this container itself," never the host or a sibling
container. Use `http://host.docker.internal:<port>` instead, where `<port>`
is whatever port Laravel's nginx is published to the *host* as (the same port
you'd use from a browser on that machine, e.g. `8000`) — `docker-compose.yml`
already has the one line (`extra_hosts`) plain Docker Engine on Linux needs to
make that DNS name resolve (Docker Desktop provides it for free).

This treats the Laravel API as an independent, already-running service reached
over the network — the same relationship it'll have in production once this
app and Laravel are deployed to separate hosts — rather than merging the two
projects' Compose files together.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
