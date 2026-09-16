'use client';

import { useEffect, useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

interface PresenceUser {
  clientId: number;
  id: string | number;
  name: string;
  color: string;
}

export default function CollabPresence() {
  const collabProvider = useEditorStore((state) => state.collabProvider);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    if (!collabProvider) return;

    const updatePresence = () => {
      const states = collabProvider.awareness?.getStates();
      if (!states) return;

      // Keyed by the account id (not clientId): the same logged-in user
      // opening the doc in a second tab/browser gets its own Yjs clientId,
      // but should still only show up once in the toolbar.
      const byUserId = new Map<string | number, PresenceUser>();
      states.forEach((state: Record<string, unknown>, clientId: number) => {
        const user = state?.user as { id?: string | number; name: string; color: string } | undefined;
        if (user) {
          const dedupeKey = user.id ?? clientId;
          if (!byUserId.has(dedupeKey)) {
            byUserId.set(dedupeKey, { clientId, id: dedupeKey, name: user.name, color: user.color });
          }
        }
      });
      setUsers(Array.from(byUserId.values()));
    };

    const handleStatus = ({ status }: { status: string }) => {
      setStatus(status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting' : 'disconnected');
    };

    collabProvider.awareness?.on('change', updatePresence);
    collabProvider.on('status', handleStatus);
    updatePresence();

    return () => {
      collabProvider.awareness?.off('change', updatePresence);
      collabProvider.off('status', handleStatus);
    };
  }, [collabProvider]);

  if (!collabProvider) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {users.map((user) => (
          <div
            key={user.id}
            title={user.name}
            className="flex size-9 items-center justify-center rounded-full pt-px border-2 border-[#F9FBFD] font-medium text-white"
            style={{ backgroundColor: user.color }}
          >
            {user.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        ))}
      </div>
      <span
        className="size-1.5 rounded-full"
        title={status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting…' : 'Disconnected'}
        style={{
          backgroundColor:
            status === 'connected' ? '#22C55E' : status === 'connecting' ? '#F59E0B' : '#9CA3AF',
        }}
      />
    </div>
  );
}
