import { redirect } from 'next/navigation';
import { getCurrentUser, getSessionToken } from '@/lib/auth/session';
import { authorizeDocument, getDocumentReport } from '@/lib/documents/laravel-documents';
import NoDocumentAccess from '@/components/NoDocumentAccess';
import DocumentViewer from './DocumentViewer';

export default async function DocumentViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/docs/${documentId}/view`);
  }

  const token = await getSessionToken();
  const document = token ? await authorizeDocument(token, documentId) : null;

  if (!document || !token) {
    return <NoDocumentAccess />;
  }

  const report = await getDocumentReport(token, documentId);

  return (
    <DocumentViewer
      documentId={documentId}
      documentTitle={document.title ?? 'Untitled document'}
      content={report?.content ?? null}
      updatedAt={report?.updated_at ?? null}
    />
  );
}
