'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFriends, useRemoveFriend, usePlayerSearch } from '@/hooks/useSocial';
import Button from '@/components/Button';
import { useTranslation } from '@/lib/i18n';

export default function FriendsPage() {
  const { data: friendsData, isLoading, isError } = useFriends();
  const removeFriend = useRemoveFriend();
  const [search, setSearch] = useState('');
  const { data: searchData } = usePlayerSearch(search);
  const t = useTranslation();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-amber-500 hover:text-amber-400">
        &larr; {t.common.back}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-stone-100">{t.social.title}</h1>

      <div className="mt-4">
        <input
          type="text"
          placeholder={t.social.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
        />
      </div>

      {search.length >= 2 && searchData?.results && (
        <div className="mt-4 space-y-1">
          <p className="text-xs font-semibold text-stone-500">{t.social.searchResults}</p>
          {searchData.results.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-2"
            >
              <div>
                <Link
                  href={`/players/${p.id}`}
                  className="text-sm font-medium text-stone-100 hover:text-amber-500"
                >
                  {p.displayName}
                </Link>
                <span className="ml-2 text-xs text-stone-500">@{p.username}</span>
              </div>
              <span className="text-xs text-stone-400">{p.rating}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-stone-100">{t.social.friendList}</h2>

        {isLoading && <p className="text-sm text-stone-500">{t.common.loading}</p>}
        {isError && <p className="text-sm text-red-400">{t.social.failedLoad}</p>}

        {friendsData?.friends.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-500">{t.social.noFriends}</p>
        )}

        <div className="space-y-2">
          {friendsData?.friends.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${f.online ? 'bg-green-500' : 'bg-stone-600'}`}
                  title={f.online ? t.common.online : t.common.offline}
                />
                <div>
                  <Link
                    href={`/players/${f.userId}`}
                    className="text-sm font-medium text-stone-100 hover:text-amber-500"
                  >
                    {f.displayName}
                  </Link>
                  <span className="ml-2 text-xs text-stone-500">@{f.username}</span>
                  <span className="ml-2 text-xs text-stone-500">
                    {t.social.ratingPrefix}
                    {f.rating}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => removeFriend.mutate(f.userId)}
                disabled={removeFriend.isPending}
              >
                {t.social.remove}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
