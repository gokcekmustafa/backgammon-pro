'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useArchiveNotification,
  useDeleteNotification,
} from '@/hooks/useNotifications';
import Button from '@/components/Button';
import { useTranslation } from '@/lib/i18n';

const priorityColors: Record<string, string> = {
  LOW: 'bg-stone-800 text-stone-400',
  MEDIUM: 'bg-blue-900/30 text-blue-400',
  HIGH: 'bg-yellow-900/30 text-yellow-400',
  URGENT: 'bg-red-900/30 text-red-400',
};

const typeIcons: Record<string, string> = {
  SYSTEM_ANNOUNCEMENT: '📢',
  MAINTENANCE_NOTICE: '🔧',
  USER_WARNING: '⚠️',
  MODERATOR_MESSAGE: '🛡️',
  FRIEND_REQUEST: '👥',
  TOURNAMENT_INVITATION: '🏆',
  MATCH_INVITATION: '🎲',
  ACHIEVEMENT_UNLOCKED: '⭐',
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const t = useTranslation();
  const typeLabels: Record<string, string> = {
    SYSTEM_ANNOUNCEMENT: t.notifications.type_announcement,
    MAINTENANCE_NOTICE: t.notifications.type_maintenance,
    USER_WARNING: t.notifications.type_warning,
    MODERATOR_MESSAGE: t.notifications.type_moderator,
    FRIEND_REQUEST: t.notifications.type_friendRequest,
    TOURNAMENT_INVITATION: t.notifications.type_tournament,
    MATCH_INVITATION: t.notifications.type_match,
    ACHIEVEMENT_UNLOCKED: t.notifications.type_achievement,
  };

  const params: {
    offset?: number;
    limit?: number;
    isRead?: boolean;
    isArchived?: boolean;
    priority?: string;
  } = { offset, limit };
  if (filter === 'unread') params.isRead = false;
  else if (filter === 'read') params.isRead = true;
  else if (filter === 'archived') params.isArchived = true;
  if (priorityFilter) params.priority = priorityFilter;

  const { data, isLoading, isError } = useNotifications(params);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const archive = useArchiveNotification();
  const del = useDeleteNotification();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-amber-500 hover:text-amber-400">
            &larr; {t.common.back}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-stone-100">{t.notifications.title}</h1>
        </div>
        <Button
          variant="secondary"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
        >
          {t.notifications.markAllRead}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['all', 'unread', 'read', 'archived'] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setOffset(0);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-amber-500/10 text-amber-500'
                : 'bg-stone-900 text-stone-400 hover:text-stone-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setOffset(0);
          }}
          className="rounded-lg border border-stone-700 bg-stone-900 px-2 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
        >
          <option value="">{t.notifications.allPriority}</option>
          <option value="LOW">{t.notifications.low}</option>
          <option value="MEDIUM">{t.notifications.medium}</option>
          <option value="HIGH">{t.notifications.high}</option>
          <option value="URGENT">{t.notifications.urgent}</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
        </div>
      )}

      {isError && (
        <p className="py-8 text-center text-sm text-red-400">{t.notifications.failedLoad}</p>
      )}

      {data && (
        <>
          {data.notifications.length === 0 ? (
            <p className="py-12 text-center text-sm text-stone-500">
              {t.notifications.noNotifications}
            </p>
          ) : (
            <div className="space-y-2">
              {data.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    n.isRead
                      ? 'border-stone-800 bg-stone-900/50'
                      : 'border-amber-800/30 bg-stone-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{typeIcons[n.type] ?? '📋'}</span>
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${priorityColors[n.priority] ?? priorityColors.MEDIUM}`}
                        >
                          {n.priority}
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {typeLabels[n.type] ?? n.type}
                        </span>
                        {!n.isRead && (
                          <span
                            className="h-2 w-2 rounded-full bg-amber-500"
                            title={t.notifications.unread}
                          />
                        )}
                      </div>
                      <p
                        className={`mt-1 text-sm ${n.isRead ? 'text-stone-400' : 'font-medium text-stone-100'}`}
                      >
                        {n.title}
                      </p>
                      {n.body && <p className="mt-0.5 text-xs text-stone-500">{n.body}</p>}
                      <p className="mt-1 text-[10px] text-stone-600">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      {!n.isRead && (
                        <Button
                          variant="ghost"
                          onClick={() => markRead.mutate(n.id)}
                          disabled={markRead.isPending}
                        >
                          {t.notifications.read}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => archive.mutate(n.id)}
                        disabled={archive.isPending}
                      >
                        {t.notifications.archive}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => del.mutate(n.id)}
                        disabled={del.isPending}
                      >
                        {t.notifications.delete}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.total > limit && (
            <div className="mt-4 flex items-center justify-between text-sm text-stone-400">
              <span>
                {t.common.showing}
                {offset + 1}–{Math.min(offset + limit, data.total)} of {data.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  {t.common.previous}
                </Button>
                <Button
                  variant="secondary"
                  disabled={offset + limit >= data.total}
                  onClick={() => setOffset(offset + limit)}
                >
                  {t.common.next}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
