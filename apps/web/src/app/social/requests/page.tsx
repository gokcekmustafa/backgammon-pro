'use client';

import { useFriendRequests, useRespondToRequest, useCancelRequest } from '@/hooks/useSocial';
import Button from '@/components/Button';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export default function FriendRequestsPage() {
  const { data, isLoading, isError } = useFriendRequests();
  const respond = useRespondToRequest();
  const cancel = useCancelRequest();
  const t = useTranslation();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/social" className="text-sm text-amber-500 hover:text-amber-400">
        &larr; {t.nav.friends}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-100">{t.social.friendRequests}</h1>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-stone-100">{t.social.incoming}</h2>
        {isLoading && <p className="text-sm text-stone-500">{t.common.loading}</p>}
        {isError && <p className="text-sm text-red-400">{t.social.failedRequests}</p>}

        {data?.requests.length === 0 && (
          <p className="py-4 text-sm text-stone-500">{t.social.noPendingRequests}</p>
        )}
        <div className="space-y-2">
          {data?.requests.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-stone-100">{r.senderDisplayName}</p>
                <p className="text-xs text-stone-500">@{r.senderUsername}</p>
                <p className="text-[10px] text-stone-600">
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => respond.mutate({ senderId: r.senderId, accept: true })}
                  disabled={respond.isPending}
                >
                  {t.social.accept}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => respond.mutate({ senderId: r.senderId, accept: false })}
                  disabled={respond.isPending}
                >
                  {t.social.reject}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-stone-100">{t.social.sentRequests}</h2>
        {data?.sent.length === 0 && (
          <p className="text-sm text-stone-500">{t.social.noSentRequests}</p>
        )}
        <div className="space-y-2">
          {data?.sent.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-stone-100">{r.senderDisplayName}</p>
                <p className="text-xs text-stone-500">@{r.senderUsername}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs ${r.status === 'PENDING' ? 'text-yellow-400' : r.status === 'ACCEPTED' ? 'text-green-400' : 'text-stone-500'}`}
                >
                  {r.status}
                </span>
                {r.status === 'PENDING' && (
                  <Button
                    variant="ghost"
                    onClick={() => cancel.mutate(r.senderId)}
                    disabled={cancel.isPending}
                  >
                    {t.social.cancelRequest}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
