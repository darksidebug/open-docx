import { redirect } from 'next/navigation';
import { getCurrentUser, getSessionToken } from '@/lib/auth/session';
import { listDocuments, listTemplates, type DocumentSummary, type ServiceTemplate } from '@/lib/documents/laravel-documents';
import DocsHome from './DocsHome';

export default async function DocsHomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=/docs');
  }

  const token = await getSessionToken();

  let documents: DocumentSummary[] = [];
  let templates: ServiceTemplate[] = [];
  let loadError = false;

  if (token) {
    try {
      [documents] = await Promise.all([listDocuments(token)]);
    } catch {
      loadError = true;
    }
  }

  return <DocsHome documents={documents} templates={templates} loadError={loadError} />;
}
