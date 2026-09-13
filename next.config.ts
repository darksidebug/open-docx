import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: React Strict Mode's synthetic mount -> effect cleanup -> remount
  // pass fights with the collab editor's stateful Yjs/WebSocket resources
  // (app/docs/[id]/Editor.tsx creates the Y.Doc/HocuspocusProvider via
  // useMemo but destroys them in a useEffect cleanup — Strict Mode runs that
  // cleanup once immediately on mount, destroying a live connection that
  // useMemo then doesn't recreate). Has no effect in production.
  reactStrictMode: false,
};

export default nextConfig;
