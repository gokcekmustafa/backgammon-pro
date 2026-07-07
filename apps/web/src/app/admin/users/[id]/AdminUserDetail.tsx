'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useAdminUser,
  useToggleStatus,
  useToggleBan,
  useDeleteUser,
  useChangeRole,
} from '@/hooks/useAdmin';
import Button from '@/components/Button';
import { useTranslation } from '@/lib/i18n';

const roles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'] as const;

export default function AdminUserDetail() {
  const t = useTranslation();
  const params = useParams();
  const userId = params.id as string;

  const { data: user, isLoading, isError } = useAdminUser(userId);
  const toggleStatus = useToggleStatus();
  const toggleBan = useToggleBan();
  const deleteUser = useDeleteUser();
  const changeRole = useChangeRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-400">{t.admin.userNotFound}</p>
        <Link href="/admin/users" className="mt-4 inline-block text-amber-500 hover:text-amber-400">
          &larr; {t.admin.backToUsers}
        </Link>
      </div>
    );
  }

  const statusBadges: Array<{ label: string; active: boolean; style: string }> = [
    {
      label: user.isActive ? t.admin.status_active : t.admin.status_disabled,
      active: user.isActive,
      style: user.isActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400',
    },
    { label: t.admin.status_banned, active: !!user.bannedAt, style: 'bg-red-900/30 text-red-400' },
    {
      label: t.admin.status_deleted,
      active: !!user.deletedAt,
      style: 'bg-stone-800 text-stone-400',
    },
  ];

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-4 inline-block text-sm text-amber-500 hover:text-amber-400"
      >
        &larr; {t.admin.backToUsers}
      </Link>

      <div className="mt-2 rounded-lg border border-stone-800 bg-stone-900 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-100">{user.displayName}</h1>
            <p className="mt-1 text-sm text-stone-500">
              @{user.username} &middot; {user.email}
            </p>
            <div className="mt-3 flex gap-2">
              {statusBadges
                .filter((b) => b.active || b.label === 'Active' || b.label === 'Disabled')
                .map((b) => (
                  <span
                    key={b.label}
                    className={`inline-block rounded px-2 py-0.5 text-xs ${b.style}`}
                  >
                    {b.label}
                  </span>
                ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">{t.admin.role}</span>
              <select
                value={user.role}
                onChange={(e) => changeRole.mutate({ id: user.id, role: e.target.value })}
                className="rounded border border-stone-700 bg-stone-800 px-2 py-1 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="ghost"
              onClick={() => toggleStatus.mutate({ id: userId, isActive: !user.isActive })}
            >
              {user.isActive ? t.admin.disable : t.admin.enable}
            </Button>
            <Button
              variant="ghost"
              onClick={() => toggleBan.mutate({ id: userId, banned: !user.bannedAt })}
            >
              {user.bannedAt ? t.admin.unban : t.admin.ban}
            </Button>
            <Button variant="ghost" onClick={() => deleteUser.mutate(userId)}>
              {t.admin.delete}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-stone-800 bg-stone-900 p-5">
          <h2 className="mb-3 text-sm font-bold text-stone-100">{t.admin.profile}</h2>
          {user.profile ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">{t.admin.avatar}</dt>
                <dd className="text-stone-300">
                  {user.profile.avatarUrl ? t.common.yes : t.common.no}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">{t.admin.bio}</dt>
                <dd className="text-stone-300">{user.profile.bio ?? '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">{t.admin.location}</dt>
                <dd className="text-stone-300">{user.profile.location ?? '—'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-stone-500">{t.admin.noProfile}</p>
          )}
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900 p-5">
          <h2 className="mb-3 text-sm font-bold text-stone-100">{t.admin.statistics}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">{t.admin.guestConversions}</dt>
              <dd className="text-stone-300">{user._count.convertedGuests}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">{t.admin.emailVerified}</dt>
              <dd className="text-stone-300">
                {user.emailVerifiedAt
                  ? new Date(user.emailVerifiedAt).toLocaleDateString()
                  : t.common.no}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">{t.admin.lastLogin}</dt>
              <dd className="text-stone-300">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString()
                  : t.common.never}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-stone-800 bg-stone-900 p-5">
        <h2 className="mb-3 text-sm font-bold text-stone-100">{t.admin.timeline}</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">{t.admin.created}</dt>
            <dd className="text-stone-300">{new Date(user.createdAt).toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">{t.admin.updated}</dt>
            <dd className="text-stone-300">{new Date(user.updatedAt).toLocaleString()}</dd>
          </div>
          {user.bannedAt && (
            <div className="flex justify-between">
              <dt className="text-stone-500">{t.admin.bannedLabel}</dt>
              <dd className="text-red-400">{new Date(user.bannedAt).toLocaleString()}</dd>
            </div>
          )}
          {user.deletedAt && (
            <div className="flex justify-between">
              <dt className="text-stone-500">{t.admin.deletedLabel}</dt>
              <dd className="text-red-400">{new Date(user.deletedAt).toLocaleString()}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
