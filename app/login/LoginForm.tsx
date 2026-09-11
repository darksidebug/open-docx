'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const DUMMY_EMAIL = process.env.NEXT_PUBLIC_DUMMY_USER_EMAIL;
const DUMMY_PASSWORD = process.env.NEXT_PUBLIC_DUMMY_USER_PASSWORD;

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || 'Could not log in.');
        return;
      }

      router.push('/docs');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h1 className="mb-4 text-lg font-medium text-gray-800">Sign in</h1>

      <label className="mb-1 block text-sm text-gray-600" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-3 w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      <label className="mb-1 block text-sm text-gray-600" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-3 w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? 'Signing in...' : 'Sign in'}
      </button>

      {DUMMY_EMAIL && DUMMY_PASSWORD && (
        <button
          type="button"
          onClick={() => {
            setEmail(DUMMY_EMAIL);
            setPassword(DUMMY_PASSWORD);
          }}
          className="mt-2 w-full rounded border border-gray-300 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Use dummy test account
        </button>
      )}
    </form>
  );
}
