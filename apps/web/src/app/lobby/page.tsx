'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import RoomCard from '@/components/lobby/RoomCard';
import TableCard from '@/components/lobby/TableCard';
import ChatPanel from '@/components/lobby/ChatPanel';
import { useAuth } from '@/providers/AuthProvider';
import { useRooms, type Room } from '@/hooks/useRooms';
import {
  useTables,
  useCreateTable,
  useJoinTable,
  useLeaveTable,
  useCloseTable,
  type TableData,
} from '@/hooks/useTables';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
    </div>
  );
}

export default function Lobby() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const { data: roomsData, isLoading: roomsLoading, isError: roomsError } = useRooms();
  const rooms: Room[] = roomsData?.rooms ?? [];

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (rooms.length > 0 && !activeRoomId) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  const {
    data: tablesData,
    isLoading: tablesLoading,
    isError: tablesError,
  } = useTables(activeRoomId);

  const createTable = useCreateTable();
  const joinTable = useJoinTable();
  const leaveTable = useLeaveTable();
  const closeTable = useCloseTable();

  const tables: TableData[] = tablesData?.tables ?? [];

  // Auto-navigate to table when game starts (status becomes 'playing')
  useEffect(() => {
    if (!user) return;
    const playingTable = tables.find(
      (t) =>
        t.status === 'playing' &&
        t.participants.some((p) => p.playerType === user.type && p.playerId === user.id),
    );
    if (playingTable) {
      router.push(`/table?id=${playingTable.id}`);
    }
  }, [tables, user, router]);

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  function isUserParticipant(participants: Array<{ playerType: string; playerId: string }>) {
    if (!user) return false;
    return participants.some((p) => p.playerType === user.type && p.playerId === user.id);
  }

  function handleCreateTable() {
    if (!activeRoomId) return;
    createTable.mutate({ roomId: activeRoomId });
  }

  async function handleJoinTable(tableId: string) {
    joinTable.mutate(tableId);
  }

  async function handleLeaveTable(tableId: string) {
    leaveTable.mutate(tableId);
  }

  async function handleCancelTable(tableId: string) {
    closeTable.mutate(tableId);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl flex-col lg:flex-row">
      <aside className="border-stone-800 p-4 lg:w-56 lg:border-r">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Rooms
        </h2>
        {roomsLoading ? (
          <LoadingSpinner />
        ) : roomsError ? (
          <p className="text-xs text-red-400">Failed to load rooms</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto lg:flex-col">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                name={room.name}
                description={room.description ?? undefined}
                tableCount={room.openTableCount}
                isActive={activeRoomId === room.id}
                onClick={() => setActiveRoomId(room.id)}
              />
            ))}
          </div>
        )}
      </aside>

      <section className="flex flex-1 flex-col overflow-hidden p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-100">
            {activeRoom?.name ?? 'Select a room'}
          </h2>
          <div className="flex gap-2">
            <Button variant="ghost" href="/leaderboard">
              Leaderboard
            </Button>
            <Button variant="ghost" onClick={() => router.push('/table?ai=true')}>
              Play vs Computer
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateTable}
              disabled={createTable.isPending || !activeRoomId}
            >
              Create Table
            </Button>
          </div>
        </div>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {tablesLoading ? (
            <LoadingSpinner />
          ) : tablesError ? (
            <div className="text-center text-sm text-red-400">
              Failed to load tables.{' '}
              <button
                onClick={() => window.location.reload()}
                className="text-amber-500 hover:text-amber-400"
              >
                Retry
              </button>
            </div>
          ) : tables.length === 0 ? (
            <EmptyState
              title="No tables yet"
              description="Create a table to start playing."
              action={
                <Button
                  variant="secondary"
                  onClick={handleCreateTable}
                  disabled={createTable.isPending}
                >
                  Create Table
                </Button>
              }
            />
          ) : (
            tables.map((table) => (
              <TableCard
                key={table.id}
                name={table.name ?? 'Unnamed'}
                status={table.status}
                playerCount={table.participantCount}
                maxPlayers={2}
                isRanked={table.isRanked}
                isJoined={isUserParticipant(table.participants)}
                isDisabled={joinTable.isPending || leaveTable.isPending || closeTable.isPending}
                onJoin={() => handleJoinTable(table.id)}
                onLeave={() => handleLeaveTable(table.id)}
                onCancel={() => handleCancelTable(table.id)}
              />
            ))
          )}
        </div>
      </section>

      <aside className="border-stone-800 p-4 lg:w-72 lg:border-l">
        <div className="h-full">
          <ChatPanel roomId={activeRoomId ?? undefined} username={user?.displayName} />
        </div>
      </aside>
    </div>
  );
}
