import 'server-only';

const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'http://localhost:8000';
const LOGIN_PATH = process.env.LARAVEL_LOGIN_PATH || '/v1/auth/login';
const LOGOUT_PATH = process.env.LARAVEL_LOGOUT_PATH || '/v1/auth/logout';

export interface LaravelUser {
  id: number | string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  email_verified_at: string | null;
  [key: string]: unknown;
}

export class LaravelApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function laravelFetch(path: string, init: RequestInit = {}) {
  try {
    return await fetch(`${LARAVEL_API_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init.headers,
      },
      cache: 'no-store',
    });
  } catch {
    throw new LaravelApiError(
      `Could not reach the Laravel API at ${LARAVEL_API_URL}${path}. Is it running?`,
      503,
    );
  }
}

/**
 * Matches this API's actual login response shape (confirmed from the main
 * app's own axios client, main-app.md):
 *   { status: "success", user: {...}, authorization: { token: "..." }, ... }
 * Some endpoints on this API return HTTP 200 even for a logical failure
 * (`status` something other than "success"), so that's checked explicitly
 * rather than relying on `response.ok` alone.
 */
export async function laravelLogin(email: string, password: string) {
  const response = await laravelFetch(LOGIN_PATH, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || (data?.status && data.status !== 'success')) {
    const message = data?.message || data?.error || 'Invalid email or password.';
    throw new LaravelApiError(message, response.ok ? 401 : response.status);
  }

  const token: string | undefined =
    data?.authorization?.token ?? data?.token ?? data?.access_token ?? data?.data?.token;
  const user: LaravelUser | undefined = data?.user ?? data?.data?.user;

  if (!token || !user) {
    throw new LaravelApiError(
      'Laravel login response did not include the expected "token" and "user" fields.',
      502,
    );
  }

  return { token, user };
}

export async function laravelLogout(token: string) {
  await laravelFetch(LOGOUT_PATH, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {
    // Best-effort: the local session cookie is cleared regardless.
  });
}
