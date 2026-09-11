import { NextResponse } from 'next/server';
import { laravelLogout } from '@/lib/auth/laravel';
import { clearSessionCookie, getSessionToken } from '@/lib/auth/session';

export async function POST() {
  const token = await getSessionToken();
  if (token) {
    await laravelLogout(token);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
