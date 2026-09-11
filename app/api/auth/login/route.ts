import { NextResponse } from 'next/server';
import { laravelLogin, LaravelApiError } from '@/lib/auth/laravel';
import { createSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
  }

  try {
    const { token, user } = await laravelLogin(email, password);
    await createSession(token, user);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof LaravelApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'Unexpected error while logging in.' }, { status: 500 });
  }
}
