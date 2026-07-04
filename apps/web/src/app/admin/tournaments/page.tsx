'use client';

import { useState } from 'react';
import { useAdminTournaments, useCreateTournament, useAdminTournamentAction } from '@/hooks/useTournaments';
import Button from '@/components/Button';
import Link from 'next/link';

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft', REGISTRATION: 'Open', READY: 'Ready',
  IN_PROGRESS: 'In Progress', FINISHED: 'Finished', CANCELLED: 'Cancelled',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-stone-800 text-stone-400', REGISTRATION: 'bg-blue-900/30 text-blue-400',
  READY: 'bg-yellow-900/30 text-yellow-400', IN_PROGRESS: 'bg-green-900/30 text-green-400',
  FINISHED: 'bg-stone-800 text-stone-500', CANCELLED: 'bg-red-900/30 text-red-400',
};

export default function AdminTournaments() {
  const { data, isLoading, isError } = useAdminTournaments();
  const create = useCreateTournament();
  const action = useAdminTournamentAction();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'SINGLE_ELIMINATION', maxPlayers: '16', minPlayers: '2',
    startsAt: '', entryFee: '0', prizePool: '0',
  });

  function handleCreate() {
    create.mutate({
      name: form.name, type: form.type,
      maxPlayers: parseInt(form.maxPlayers), minPlayers: parseInt(form.minPlayers),
      startsAt: new Date(form.startsAt).toISOString(),
      entryFee: parseFloat(form.entryFee), prizePool: parseFloat(form.prizePool),
    }, {
      onSuccess: () => {
        setShowCreate(false);
        setForm({ name: '', type: 'SINGLE_ELIMINATION', maxPlayers: '16', minPlayers: '2', startsAt: '', entryFee: '0', prizePool: '0' });
      },
    });
  }

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" /></div>;
  if (isError) return <p className="py-8 text-center text-sm text-red-400">Failed to load tournaments.</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-100">Tournaments</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'Create Tournament'}</Button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-lg border border-amber-800/30 bg-stone-900 p-4">
          <h2 className="mb-3 text-sm font-bold text-amber-500">New Tournament</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none">
              <option value="SINGLE_ELIMINATION">Single Elimination</option>
              <option value="ROUND_ROBIN">Round Robin</option>
            </select>
            <input type="number" placeholder="Max Players" value={form.maxPlayers} onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
            <input type="number" placeholder="Min Players" value={form.minPlayers} onChange={(e) => setForm({ ...form, minPlayers: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
            <input type="datetime-local" placeholder="Starts At" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none" />
            <input type="number" step="0.01" placeholder="Entry Fee" value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
            <input type="number" step="0.01" placeholder="Prize Pool" value={form.prizePool} onChange={(e) => setForm({ ...form, prizePool: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
          </div>
          <Button className="mt-3" onClick={handleCreate} disabled={!form.name || !form.startsAt || create.isPending}>
            {create.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-stone-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-900">
              <th className="px-4 py-3 font-semibold text-stone-400">Name</th>
              <th className="px-4 py-3 font-semibold text-stone-400">Type</th>
              <th className="px-4 py-3 font-semibold text-stone-400">Status</th>
              <th className="px-4 py-3 font-semibold text-stone-400">Players</th>
              <th className="px-4 py-3 font-semibold text-stone-400">Entry</th>
              <th className="px-4 py-3 font-semibold text-stone-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.tournaments.map((t) => (
              <tr key={t.id} className="border-b border-stone-800 last:border-0 hover:bg-stone-900/50">
                <td className="px-4 py-3">
                  <Link href={`/tournaments/${t.id}`} className="font-medium text-amber-500 hover:text-amber-400">{t.name}</Link>
                </td>
                <td className="px-4 py-3 text-xs text-stone-400">{t.type.replace('_', ' ')}</td>
                <td className="px-4 py-3"><span className={`inline-block rounded px-2 py-0.5 text-xs ${statusColors[t.status] ?? ''}`}>{statusLabels[t.status] ?? t.status}</span></td>
                <td className="px-4 py-3 text-stone-300">{t.playerCount}/{t.maxPlayers}</td>
                <td className="px-4 py-3 text-stone-300">{t.entryFee > 0 ? `$${t.entryFee}` : 'Free'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {t.status === 'DRAFT' && (
                      <Button variant="ghost" onClick={() => action.mutate({ id: t.id, action: 'open' })} disabled={action.isPending}>
                        Open
                      </Button>
                    )}
                    {t.status === 'REGISTRATION' && (
                      <Button variant="ghost" onClick={() => action.mutate({ id: t.id, action: 'close' })} disabled={action.isPending}>
                        Close
                      </Button>
                    )}
                    {t.status === 'READY' && (
                      <Button variant="ghost" onClick={() => action.mutate({ id: t.id, action: 'start' })} disabled={action.isPending}>
                        Start
                      </Button>
                    )}
                    {t.status === 'IN_PROGRESS' && (
                      <Button variant="ghost" onClick={() => action.mutate({ id: t.id, action: 'finish' })} disabled={action.isPending}>
                        Finish
                      </Button>
                    )}
                    {!['FINISHED', 'CANCELLED'].includes(t.status) && (
                      <Button variant="ghost" onClick={() => action.mutate({ id: t.id, action: 'cancel' })} disabled={action.isPending}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.tournaments.length === 0 && <p className="py-8 text-center text-sm text-stone-500">No tournaments.</p>}
    </div>
  );
}