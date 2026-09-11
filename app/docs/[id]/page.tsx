import { redirect } from 'next/navigation';
import { getCurrentUser, getSessionToken } from '@/lib/auth/session';
import { getDisplayName, getColorForUser, type CollabUser } from '@/lib/auth/user';
import { authorizeDocument } from '@/lib/documents/laravel-documents';
import NoDocumentAccess from '@/components/NoDocumentAccess';
import DocsWorkspace from './DocsWorkspace';

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/docs/${documentId}`);
  }

  const token = await getSessionToken();
  const document = token ? await authorizeDocument(token, documentId) : null;

  if (!document) {
    return <NoDocumentAccess />;
  }

  const collabUser: CollabUser = {
    id: user.id,
    displayName: getDisplayName(user) || user.email,
    color: getColorForUser(user.id),
  };

  return <DocsWorkspace user={collabUser} documentId={documentId} documentTitle={document.title} />;
}
