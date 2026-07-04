'use client';

import { useInvitations, useRespondToInvitation } from '@/hooks/useSocial';
import Button from '@/components/Button';
import Link from 'next/link';

const typeLabels: Record<string, string> = {
  MATCH: 'Match',
  TABLE: 'Table',
  TOURNAMENT: 'Tournament',
};

export default function InvitationsPage() {
  const { data, isLoading, isError } = useInvitations();
  const respond = useRespondToInvitation();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-amber-500 hover:text-amber-400">&larr; Back</Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-100">Invitations</h1>

      <div className="mt-6">
        {isLoading && <p className="text-sm text-stone-500">Loading...</p>}
        {isError && <p className="text-sm text-red-400">Failed to load invitations.</p>}

        {data?.invitations.length === 0 && <p className="py-8 text-center text-sm text-stone-500">No invitations.</p>}
        <div className="space-y-2">
          {data?.invitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-stone-100">
                  {inv.senderDisplayName} invites you to a {typeLabels[inv.type] ?? inv.type}
                </p>
                {inv.targetName && <p className="text-xs text-stone-500">{inv.targetName}</p>}
                <p className="text-[10px] text-stone-600">{new Date(inv.createdAt).toLocaleString()}</p>
              </div>
              {inv.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => respond.mutate({ invitationId: inv.id, accept: true })} disabled={respond.isPending}>Accept</Button>
                  <Button variant="ghost" onClick={() => respond.mutate({ invitationId: inv.id, accept: false })} disabled={respond.isPending}>Reject</Button>
                </div>
              )}
              {inv.status !== 'PENDING' && (
                <span className={`text-xs ${inv.status === 'ACCEPTED' ? 'text-green-400' : 'text-stone-500'}`}>{inv.status}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}