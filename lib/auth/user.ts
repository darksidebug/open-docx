import type { LaravelUser } from './laravel';

/** Plain, serializable subset of a Laravel user safe to pass to Client Components. */
export interface CollabUser {
  id: string | number;
  displayName: string;
  color: string;
}

export function getDisplayName(user: Pick<LaravelUser, 'first_name' | 'middle_name' | 'last_name' | 'suffix'>) {
  return [user.first_name, user.middle_name, user.last_name, user.suffix]
    .filter(Boolean)
    .join(' ');
}

export function getInitials(user: Pick<LaravelUser, 'first_name' | 'last_name'>) {
  return `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();
}

const PRESENCE_COLORS = [
  '#F87171', '#FB923C', '#FBBF24', '#A3E635',
  '#34D399', '#22D3EE', '#60A5FA', '#A78BFA',
  '#F472B6', '#FB7185',
];

/** Deterministic color per user id, so the same person always gets the same cursor/avatar color. */
export function getColorForUser(userId: string | number) {
  const key = String(userId);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}
