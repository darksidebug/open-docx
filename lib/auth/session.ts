import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { LaravelUser } from './laravel';

export const SESSION_COOKIE = 'ldx_token';

// Deliberately lazy: reading process.env.SESSION_SECRET and throwing here at
// module scope would fire the instant this file is imported — including
// during `next build`'s page-data collection, which imports every route
// module (this one included) without any real runtime env available (.env
// is intentionally excluded from the Docker build context so secrets never
// end up baked into image layers). Evaluated only when a session is actually
// created/read, i.e. at real runtime, when it should genuinely be set.
function getEncodedKey() {
  const secretKey = process.env.SESSION_SECRET;
  if (!secretKey) {
    throw new Error(
      'SESSION_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to your .env.',
    );
  }
  return new TextEncoder().encode(secretKey);
}

interface SessionPayload {
  token: string; // the raw Laravel bearer token, for calling other Laravel endpoints
  user: LaravelUser;
}

/**
 * The session cookie holds a *signed* blob of `{ token, user }` — both
 * captured once at login time — rather than just the bare Laravel token.
 * This app's Laravel API has no confirmed "get current user by token"
 * endpoint (login already returns the full user), so re-deriving the user on
 * every request by calling one back would mean depending on a route that may
 * not exist. Signing (not just storing as JSON) stops the client from being
 * able to forge/edit the user data, since it's httpOnly but not otherwise
 * tamper-proof on its own.
 */
export async function createSession(token: string, user: LaravelUser) {
  const session = await new SignJWT({ token, user } satisfies SessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getEncodedKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days, matching setExpirationTime above
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const { payload } = await jwtVerify<SessionPayload>(cookie, getEncodedKey(), { algorithms: ['HS256'] });
    return { token: payload.token, user: payload.user };
  } catch (error) {
    console.error('[getSession] Invalid or expired session cookie:', error);
    return null;
  }
});

/** The raw Laravel bearer token, for calling other Laravel endpoints (documents, templates, reports, ...). */
export async function getSessionToken(): Promise<string | null> {
  const session = await getSession();
  return session?.token ?? null;
}

/** The currently logged-in user, decoded straight from the session cookie — no network call. */
export async function getCurrentUser(): Promise<LaravelUser | null> {
  const session = await getSession();
  return session?.user ?? null;
}
