'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useAdminUsers,
  useToggleStatus,
  useToggleBan,
  useDeleteUser,
  useChangeRole,
} from '@/hooks/useAdmin';
import Button from '@/components/Button';
import { useTranslation } from '@/lib/i18n';

const roles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'] as const;

export default function AdminUsers() {
  const t = useTranslation();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [deletedFilter, setDeletedFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [changingRole, setChangingRole] = useState<{ id: string; role: string } | null>(null);

  const { data, isLoading, isError } = useAdminUsers({
    offset,
    limit,
    search: search || undefined,
    role: roleFilter || undefined,
    banned: bannedFilter || undefined,
    deleted: deletedFilter || undefined,
  });

  const toggleStatus = useToggleStatus();
  const toggleBan = useToggleBan();
  const deleteUser = useDeleteUser();
  const changeRole = useChangeRole();

  function handleSearch() {
    setSearch(searchInput);
    setOffset(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

  function handleRoleChange(id: string, role: string) {
    setChangingRole({ id, role });
    changeRole.mutate({ id, role }, { onSettled: () => setChangingRole(null) });
  }

  const filters = [
    { label: 'Role', value: roleFilter, onChange: setRoleFilter, options: ['', ...roles] },
    {
      label: 'Banned',
      value: bannedFilter,
      onChange: setBannedFilter,
      options: ['', 'true', 'false'],
    },
    {
      label: 'Deleted',
      value: deletedFilter,
      onChange: setDeletedFilter,
      options: ['', 'true', 'false'],
    },
  ] as const;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-stone-100">{t.admin.usersTitle}</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t.admin.searchUsers}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
          />
          <Button variant="secondary" onClick={handleSearch}>
            {t.admin.searchBtn}
          </Button>
        </div>

        {filters.map((f) => (
          <select
            key={f.label}
            value={f.value}
            onChange={(e) => {
              f.onChange(e.target.value);
              setOffset(0);
            }}
            className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
          >
            <option value="">
              {f.label}
              {t.admin.filterAll}
            </option>
            {f.options.slice(1).map((o) => (
              <option key={String(o)} value={String(o)}>
                {f.label}: {o}
              </option>
            ))}
          </select>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
        </div>
      )}

      {isError && <p className="py-8 text-center text-sm text-red-400">{t.admin.failedLoad}</p>}

      {data && (
        <>
          <div className="overflow-x-auto rounded-lg border border-stone-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900">
                  <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_user}</th>
                  <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_role}</th>
                  <th className="px-4 py-3 font-semibold text-stone-400">
                    {t.admin.column_status}
                  </th>
                  <th className="px-4 py-3 font-semibold text-stone-400">
                    {t.admin.column_joined}
                  </th>
                  <th className="px-4 py-3 font-semibold text-stone-400">
                    {t.admin.column_actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-stone-800 last:border-0 hover:bg-stone-900/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="font-medium text-amber-500 hover:text-amber-400"
                      >
                        {user.displayName}
                      </Link>
                      <p className="text-xs text-stone-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={changingRole?.id === user.id}
                        className="rounded border border-stone-700 bg-stone-800 px-2 py-1 text-xs text-stone-100 focus:border-amber-500 focus:outline-none disabled:opacity-50"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs ${
                            user.isActive
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {user.isActive ? t.admin.status_active : t.admin.status_disabled}
                        </span>
                        {user.bannedAt && (
                          <span className="inline-block rounded bg-red-900/30 px-2 py-0.5 text-xs text-red-400">
                            {t.admin.status_banned}
                          </span>
                        )}
                        {user.deletedAt && (
                          <span className="inline-block rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-400">
                            {t.admin.status_deleted}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            toggleStatus.mutate({ id: user.id, isActive: !user.isActive })
                          }
                        >
                          {user.isActive ? t.admin.disable : t.admin.enable}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => toggleBan.mutate({ id: user.id, banned: !user.bannedAt })}
                        >
                          {user.bannedAt ? t.admin.unban : t.admin.ban}
                        </Button>
                        <Button variant="ghost" onClick={() => deleteUser.mutate(user.id)}>
                          {t.admin.delete}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      )}
    </div>
  );
}
