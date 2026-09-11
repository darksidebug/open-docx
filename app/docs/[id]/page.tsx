import { redirect } from 'next/navigation';
import { getCurrentUser, getSessionToken } from '@/lib/auth/session';
import { getDisplayName, getColorForUser, type CollabUser } from '@/lib/auth/user';
import { authorizeDocument } from '@/lib/documents/laravel-documents';
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
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <h1 className="mb-2 text-lg font-medium text-gray-800">You don&apos;t have access to this document</h1>
          <p className="text-sm text-gray-500">
            Only users assigned to this document&apos;s ordered service can open it.
          </p>
        </div>
      </div>
    );
  }

  const collabUser: CollabUser = {
    id: user.id,
    displayName: getDisplayName(user) || user.email,
    color: getColorForUser(user.id),
  };

  return <DocsWorkspace user={collabUser} documentId={documentId} documentTitle={document.title} />;
}
