import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { laravelGetUser, type LaravelUser } from './laravel';

export const SESSION_COOKIE = 'ldx_token';

export async function createSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Fetches the currently logged-in user from the Laravel API using the
 * session token cookie. Memoized per request so multiple components
 * (layout, page, editor) can call it without duplicate network requests.
 */
export const getCurrentUser = cache(async (): Promise<LaravelUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    return await laravelGetUser(token);
  } catch {
    return null;
  }
});
