import 'server-only';

const LARAVEL_API_URL = process.env.LARAVEL_API_URL || 'http://localhost:8000';
const LOGIN_PATH = process.env.LARAVEL_LOGIN_PATH || '/api/login';
const USER_PATH = process.env.LARAVEL_USER_PATH || '/api/user';
const LOGOUT_PATH = process.env.LARAVEL_LOGOUT_PATH || '/api/logout';

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
 * Expects Laravel to respond with `{ token, user }` from a Sanctum-style
 * personal access token login endpoint. Adjust LARAVEL_LOGIN_PATH / this
 * parsing if your app's response shape differs.
 */
export async function laravelLogin(email: string, password: string) {
  const response = await laravelFetch(LOGIN_PATH, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.message || 'Invalid email or password.';
    throw new LaravelApiError(message, response.status);
  }

  const data = await response.json();
  const token: string | undefined = data.token ?? data.access_token ?? data.data?.token;
  const user: LaravelUser | undefined = data.user ?? data.data?.user;

  if (!token || !user) {
    throw new LaravelApiError(
      'Laravel login response did not include the expected "token" and "user" fields.',
      502,
    );
  }

  return { token, user };
}

export async function laravelGetUser(token: string): Promise<LaravelUser | null> {
  const response = await laravelFetch(USER_PATH, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) return null;

  if (!response.ok) {
    throw new LaravelApiError('Failed to load the current user from Laravel.', response.status);
  }

  const data = await response.json();
  return data.user ?? data.data ?? data;
}

export async function laravelLogout(token: string) {
  await laravelFetch(LOGOUT_PATH, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {
    // Best-effort: the local session cookie is cleared regardless.
  });
}
