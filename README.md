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

1. Copy `.env.example` to `.env` (or `.env.local`) and point `LARAVEL_API_URL` at your
   Laravel app. Adjust the `LARAVEL_*_PATH` vars if your routes differ from the
   defaults documented in that file.
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

- `app/api/auth/login` and `app/api/auth/logout` forward credentials to Laravel and
  store the returned token in a secure, httpOnly cookie — the browser never sees it.
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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
