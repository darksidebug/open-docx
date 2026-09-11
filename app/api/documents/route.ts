import { NextResponse } from 'next/server';
import { LaravelApiError } from '@/lib/auth/laravel';
import { getSessionToken } from '@/lib/auth/session';
import { createDocument } from '@/lib/documents/laravel-documents';

export async function POST(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const document = await createDocument(token, {
      templateId: body.templateId,
      title: body.title,
    });
    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof LaravelApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: 'Unexpected error creating the document.' }, { status: 500 });
  }
}
