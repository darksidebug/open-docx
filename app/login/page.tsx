import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/docs');
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <LoginForm />
    </div>
  );
}
