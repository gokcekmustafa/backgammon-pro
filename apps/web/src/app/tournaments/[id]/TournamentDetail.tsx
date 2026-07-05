'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTournament, useTournamentStatus, useRegisterTournament, useUnregisterTournament } from '@/hooks/useTournaments';
import Button from '@/components/Button';

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  REGISTRATION: 'Registration Open',
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  FINISHED: 'Finished',
  CANCELLED: 'Cancelled',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-stone-800 text-stone-400',
  REGISTRATION: 'bg-blue-900/30 text-blue-400',
  READY: 'bg-yellow-900/30 text-yellow-400',
  IN_PROGRESS: 'bg-green-900/30 text-green-400',
  FINISHED: 'bg-stone-800 text-stone-500',
  CANCELLED: 'bg-red-900/30 text-red-400',
};

const typeLabels: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  ROUND_ROBIN: 'Round Robin',
};

function BracketView({ bracket }: { bracket: { round: number; matches: {
  id: string; round: number; matchIndex: number; player1Id: string | null; player2Id: string | null;
  winnerId: string | null; status: string; player1Score: number; player2Score: number;
  player1Name?: string; player2Name?: string;
}[] }[] }) {
  return (
    <div className="space-y-6">
      {bracket.map((round) => (
        <div key={round.round}>
          <h3 className="mb-2 text-sm font-semibold text-stone-400">Round {round.round}</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {round.matches.map((match) => (
              <div key={match.id} className="rounded-lg border border-stone-800 bg-stone-900/50 p-3">
                <div className="flex items-center justify-between">
                  <span className={match.winnerId === match.player1Id ? 'font-medium text-amber-500' : 'text-stone-300'}>
                    {match.player1Name ?? 'TBD'}
                  </span>
                  <span className="text-xs text-stone-500">{match.player1Score}</span>
                </div>
                <div className="my-1 border-t border-stone-800" />
                <div className="flex items-center justify-between">
                  <span className={match.winnerId === match.player2Id ? 'font-medium text-amber-500' : 'text-stone-300'}>
                    {match.player2Name ?? 'TBD'}
                  </span>
                  <span className="text-xs text-stone-500">{match.player2Score}</span>
                </div>
                <div className="mt-1 text-center">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    match.status === 'PENDING' ? 'bg-stone-800 text-stone-400' :
                    match.status === 'IN_PROGRESS' ? 'bg-green-900/30 text-green-400' :
                    match.status === 'COMPLETED' ? 'bg-blue-900/30 text-blue-400' :
                    'bg-red-900/30 text-red-400'
                  }`}>
                    {match.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TournamentDetail() {
  const params = useParams();
  const id = params.id as string;
  const { data: tournament, isLoading, isError } = useTournament(id);
  const { data: statusData } = useTournamentStatus(id);
  const register = useRegisterTournament();
  const unregister = useUnregisterTournament();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      </div>
    );
  }

  if (isError || !tournament) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-stone-100">Tournament Not Found</h1>
        <Link href="/tournaments" className="mt-4 inline-block text-amber-500 hover:text-amber-400">
          &larr; Back to Tournaments
        </Link>
      </div>
    );
  }

  const isRegistered = statusData?.registered ?? false;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/tournaments" className="text-sm text-amber-500 hover:text-amber-400">&larr; Back to Tournaments</Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">{tournament.name}</h1>
          {tournament.description && (
            <p className="mt-1 text-sm text-stone-400">{tournament.description}</p>
          )}
        </div>
        <span className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium ${statusColors[tournament.status] ?? ''}`}>
          {statusLabels[tournament.status] ?? tournament.status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
          <p className="text-xs text-stone-500">Type</p>
          <p className="text-sm font-medium text-stone-100">{typeLabels[tournament.type]}</p>
        </div>
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
          <p className="text-xs text-stone-500">Players</p>
          <p className="text-sm font-medium text-stone-100">{tournament.playerCount}/{tournament.maxPlayers}</p>
        </div>
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
          <p className="text-xs text-stone-500">Prize Pool</p>
          <p className="text-sm font-medium text-stone-100">{tournament.prizePool > 0 ? `$${tournament.prizePool}` : '-'}</p>
        </div>
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
          <p className="text-xs text-stone-500">Entry Fee</p>
          <p className="text-sm font-medium text-stone-100">{tournament.entryFee > 0 ? `$${tournament.entryFee}` : 'Free'}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
          <p className="text-xs text-stone-500">Starts</p>
          <p className="text-sm font-medium text-stone-100">{new Date(tournament.startsAt).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
          <p className="text-xs text-stone-500">Registration Ends</p>
          <p className="text-sm font-medium text-stone-100">
            {tournament.registrationEndsAt ? new Date(tournament.registrationEndsAt).toLocaleString() : '-'}
          </p>
        </div>
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
          <p className="text-xs text-stone-500">Created By</p>
          <p className="text-sm font-medium text-stone-100">{tournament.createdBy?.displayName ?? 'System'}</p>
        </div>
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
          <p className="text-xs text-stone-500">Visibility</p>
          <p className="text-sm font-medium text-stone-100">{tournament.visibility}</p>
        </div>
      </div>

      {tournament.status === 'REGISTRATION' && (
        <div className="mt-6">
          {isRegistered ? (
            <Button variant="secondary" onClick={() => unregister.mutate(id)} disabled={unregister.isPending}>
              Unregister
            </Button>
          ) : (
            <Button onClick={() => register.mutate(id)} disabled={register.isPending}>
              Register
            </Button>
          )}
        </div>
      )}

      {tournament.prizes.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-stone-100">Prizes</h2>
          <div className="overflow-x-auto rounded-lg border border-stone-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900">
                  <th className="px-4 py-2 font-semibold text-stone-400">Position</th>
                  <th className="px-4 py-2 font-semibold text-stone-400">Label</th>
                  <th className="px-4 py-2 font-semibold text-stone-400">Amount</th>
                </tr>
              </thead>
              <tbody>
                {tournament.prizes.map((p) => (
                  <tr key={p.id} className="border-b border-stone-800 last:border-0">
                    <td className="px-4 py-2 text-stone-300">#{p.position}</td>
                    <td className="px-4 py-2 text-stone-100">{p.label ?? '-'}</td>
                    <td className="px-4 py-2 text-stone-300">${p.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tournament.players.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-stone-100">Players ({tournament.players.length})</h2>
          <div className="space-y-1">
            {tournament.players.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-2">
                <div>
                  <Link href={`/players/${p.userId}`} className="text-sm font-medium text-stone-100 hover:text-amber-500">
                    {p.displayName}
                  </Link>
                  <span className="ml-2 text-xs text-stone-500">@{p.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">Seed #{p.seed}</span>
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    p.status === 'ACTIVE' ? 'bg-green-900/30 text-green-400' :
                    p.status === 'ELIMINATED' ? 'bg-red-900/30 text-red-400' :
                    p.status === 'REGISTERED' ? 'bg-blue-900/30 text-blue-400' :
                    'bg-stone-800 text-stone-400'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tournament.bracket.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-stone-100">Bracket</h2>
          <BracketView bracket={tournament.bracket} />
        </div>
      )}
    </div>
  );
}
