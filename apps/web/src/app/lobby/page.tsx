'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import RoomCard from '@/components/lobby/RoomCard';
import ChatPanel from '@/components/lobby/ChatPanel';

interface Room {
  id: string;
  name: string;
  description: string;
}

const rooms: Room[] = [
  { id: 'beginners', name: 'Beginners', description: 'For new players' },
  { id: 'advanced', name: 'Advanced', description: 'Experienced players' },
  { id: 'tournament', name: 'Tournament', description: 'Competitive play' },
];

export default function Lobby() {
  const [activeRoom, setActiveRoom] = useState(rooms[0].id);

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-6xl flex-col lg:flex-row">
      <aside className="border-stone-800 p-4 lg:w-56 lg:border-r">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Rooms
        </h2>
        <div className="flex gap-2 overflow-x-auto lg:flex-col">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              name={room.name}
              description={room.description}
              tableCount={0}
              isActive={activeRoom === room.id}
              onClick={() => setActiveRoom(room.id)}
            />
          ))}
        </div>
      </aside>

      <section className="flex flex-1 flex-col overflow-hidden p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-100">
            {rooms.find((r) => r.id === activeRoom)?.name}
          </h2>
          <Button variant="primary">Create Table</Button>
        </div>

        <p className="mt-1 text-xs text-stone-500">No open tables in this room.</p>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          <EmptyState
            title="No tables yet"
            description="Create a table to start playing."
            action={<Button variant="secondary">Create Table</Button>}
          />
        </div>
      </section>

      <aside className="border-stone-800 p-4 lg:w-72 lg:border-l">
        <div className="h-full">
          <ChatPanel />
        </div>
      </aside>
    </div>
  );
}
