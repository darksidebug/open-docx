'use client';

import { useEffect, useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

interface PresenceUser {
  clientId: number;
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

      const next: PresenceUser[] = [];
      states.forEach((state: Record<string, unknown>, clientId: number) => {
        const user = state?.user as { name: string; color: string } | undefined;
        if (user) {
          next.push({ clientId, name: user.name, color: user.color });
        }
      });
      setUsers(next);
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
            key={user.clientId}
            title={user.name}
            className="flex size-7 items-center justify-center rounded-full border-2 border-white text-[11px] font-medium text-white shadow-sm"
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
