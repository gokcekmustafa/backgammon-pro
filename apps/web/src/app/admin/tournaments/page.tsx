'use client';

import { useState } from 'react';
import {
  useAdminTournaments,
  useCreateTournament,
  useAdminTournamentAction,
} from '@/hooks/useTournaments';
import Button from '@/components/Button';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

const statusLabels: Record<string, string> = {};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-stone-800 text-stone-400',
  REGISTRATION: 'bg-blue-900/30 text-blue-400',
  READY: 'bg-yellow-900/30 text-yellow-400',
  IN_PROGRESS: 'bg-green-900/30 text-green-400',
  FINISHED: 'bg-stone-800 text-stone-500',
  CANCELLED: 'bg-red-900/30 text-red-400',
};

export default function AdminTournaments() {
  const t = useTranslation();
  const statusLabels: Record<string, string> = {
    DRAFT: t.tournaments.status_draft,
    REGISTRATION: t.tournaments.status_open,
    READY: t.tournaments.status_ready,
    IN_PROGRESS: t.tournaments.status_inProgress,
    FINISHED: t.tournaments.status_finished,
    CANCELLED: t.tournaments.status_cancelled,
  };
  const { data, isLoading, isError } = useAdminTournaments();
  const create = useCreateTournament();
  const action = useAdminTournamentAction();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'SINGLE_ELIMINATION',
    maxPlayers: '16',
    minPlayers: '2',
    startsAt: '',
    entryFee: '0',
    prizePool: '0',
  });

  function handleCreate() {
    create.mutate(
      {
        name: form.name,
        type: form.type,
        maxPlayers: parseInt(form.maxPlayers),
        minPlayers: parseInt(form.minPlayers),
        startsAt: new Date(form.startsAt).toISOString(),
        entryFee: parseFloat(form.entryFee),
        prizePool: parseFloat(form.prizePool),
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setForm({
            name: '',
            type: 'SINGLE_ELIMINATION',
            maxPlayers: '16',
            minPlayers: '2',
            startsAt: '',
            entryFee: '0',
            prizePool: '0',
          });
        },
      },
    );
  }

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      </div>
    );
  if (isError)
    return <p className="py-8 text-center text-sm text-red-400">{t.tournaments.failedLoad}</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-100">{t.tournaments.pageHeader}</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? t.tournaments.cancelTournament : t.tournaments.newTournament}
        </Button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-lg border border-amber-800/30 bg-stone-900 p-4">
          <h2 className="mb-3 text-sm font-bold text-amber-500">{t.tournaments.newTournament}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder={t.tournaments.name}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
            >
              <option value="SINGLE_ELIMINATION">{t.tournaments.singleElim}</option>
              <option value="ROUND_ROBIN">{t.tournaments.roundRobin}</option>
            </select>
            <input
              type="number"
              placeholder={t.tournaments.maxPlayers}
              value={form.maxPlayers}
              onChange={(e) => setForm({ ...form, maxPlayers: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder={t.tournaments.minPlayers}
              value={form.minPlayers}
              onChange={(e) => setForm({ ...form, minPlayers: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
            />
            <input
              type="datetime-local"
              placeholder={t.tournaments.startsAt}
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
            />
            <input
              type="number"
              step="0.01"
              placeholder={t.tournaments.entryFee}
              value={form.entryFee}
              onChange={(e) => setForm({ ...form, entryFee: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
            />
            <input
              type="number"
              step="0.01"
              placeholder={t.tournaments.prizePool}
              value={form.prizePool}
              onChange={(e) => setForm({ ...form, prizePool: e.target.value })}
              className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <Button
            className="mt-3"
            onClick={handleCreate}
            disabled={!form.name || !form.startsAt || create.isPending}
          >
            {create.isPending ? t.tournaments.creating : t.tournaments.create}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-stone-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-900">
              <th className="px-4 py-3 font-semibold text-stone-400">{t.tournaments.name}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_type}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_status}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.tournaments.players}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.entry}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_actions}</th>
            </tr>
          </thead>
          <tbody>
            {data?.tournaments.map((tourn) => (
              <tr
                key={tourn.id}
                className="border-b border-stone-800 last:border-0 hover:bg-stone-900/50"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/tournaments/${tourn.id}`}
                    className="font-medium text-amber-500 hover:text-amber-400"
                  >
                    {tourn.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-stone-400">{tourn.type.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ${statusColors[tourn.status] ?? ''}`}
                  >
                    {statusLabels[tourn.status] ?? tourn.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-300">
                  {tourn.playerCount}/{tourn.maxPlayers}
                </td>
                <td className="px-4 py-3 text-stone-300">
                  {tourn.entryFee > 0 ? `$${tourn.entryFee}` : t.common.free}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {tourn.status === 'DRAFT' && (
                      <Button
                        variant="ghost"
                        onClick={() => action.mutate({ id: tourn.id, action: 'open' })}
                        disabled={action.isPending}
                      >
                        {t.admin.openToggle}
                      </Button>
                    )}
                    {tourn.status === 'REGISTRATION' && (
                      <Button
                        variant="ghost"
                        onClick={() => action.mutate({ id: tourn.id, action: 'close' })}
                        disabled={action.isPending}
                      >
                        {t.admin.closeToggle}
                      </Button>
                    )}
                    {tourn.status === 'READY' && (
                      <Button
                        variant="ghost"
                        onClick={() => action.mutate({ id: tourn.id, action: 'start' })}
                        disabled={action.isPending}
                      >
                        {t.admin.start}
                      </Button>
                    )}
                    {tourn.status === 'IN_PROGRESS' && (
                      <Button
                        variant="ghost"
                        onClick={() => action.mutate({ id: tourn.id, action: 'finish' })}
                        disabled={action.isPending}
                      >
                        {t.admin.finish}
                      </Button>
                    )}
                    {!['FINISHED', 'CANCELLED'].includes(tourn.status) && (
                      <Button
                        variant="ghost"
                        onClick={() => action.mutate({ id: tourn.id, action: 'cancel' })}
                        disabled={action.isPending}
                      >
                        {t.admin.cancelTournament}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.tournaments.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-500">{t.admin.noTournaments}</p>
      )}
    </div>
  );
}
