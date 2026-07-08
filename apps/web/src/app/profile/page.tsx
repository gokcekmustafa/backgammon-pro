'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { api, ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import type { AuthUser } from '@/lib/auth';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border border-stone-800 bg-stone-900 p-5"
      style={{
        borderColor: 'rgb(var(--color-border))',
        backgroundColor: 'rgb(var(--color-bg-secondary))',
      }}
    >
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const t = useTranslation();
  const { user, isAuthenticated, isLoading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  if (authLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-stone-700" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-stone-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setProfileError('');
    setProfileMsg('');
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const result = await api<{ avatarUrl: string }>('/auth/avatar', {
        method: 'POST',
        body: fd as unknown as BodyInit,
        headers: {} as Record<string, string>,
      });
      const updated: AuthUser = {
        id: user!.id,
        type: user!.type,
        displayName: user!.displayName,
        username: user!.username,
        avatar: result.avatarUrl,
      };
      updateUser(updated);
      setProfileMsg(t.profile.profileUpdated);
    } catch {
      setProfileError(t.profile.uploadFailed);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileError('');
    setProfileMsg('');
    try {
      const result = await api<{ user: { displayName: string; username?: string } }>(
        '/auth/profile',
        {
          method: 'PUT',
          body: JSON.stringify({ displayName }),
        },
      );
      const updated: AuthUser = {
        id: user!.id,
        type: user!.type,
        displayName: result.user.displayName,
        username: result.user.username ?? user!.username,
        avatar: user!.avatar,
      };
      updateUser(updated);
      setProfileMsg(t.profile.profileUpdated);
    } catch (err) {
      setProfileError(err instanceof ApiError ? String(err.body || err.message) : t.common.error);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setChangingPassword(true);
    setPasswordError('');
    setPasswordMsg('');
    try {
      await api('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg(t.profile.passwordChanged);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err instanceof ApiError ? String(err.body || err.message) : t.common.error);
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-stone-100">{t.profile.editTitle}</h1>

      <div className="space-y-6">
        {/* Avatar */}
        <SectionCard>
          <h2 className="mb-4 text-sm font-semibold text-stone-300">{t.profile.changeAvatar}</h2>
          <div className="flex items-center gap-5">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt=""
                className="h-20 w-20 rounded-full object-cover ring-2 ring-amber-600/40"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-600 text-2xl font-bold text-stone-950 ring-2 ring-amber-600/40">
                {initials(user.displayName)}
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarUploading}
                className="rounded-lg border border-stone-700 px-4 py-2 text-sm text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100 disabled:opacity-50"
              >
                {avatarUploading ? t.common.loading : t.profile.changeAvatar}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>
        </SectionCard>

        {/* Profile Info */}
        <SectionCard>
          <h2 className="mb-4 text-sm font-semibold text-stone-300">{t.profile.editTitle}</h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            {profileMsg && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
                {profileMsg}
              </div>
            )}
            {profileError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {profileError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-300">
                {t.auth.displayName}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
              />
            </div>

            {user.username && (
              <div>
                <label className="block text-sm font-medium text-stone-300">
                  {t.auth.username}
                </label>
                <input
                  type="text"
                  defaultValue={user.username}
                  className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-2 text-sm text-stone-500 outline-none cursor-not-allowed"
                  disabled
                />
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !displayName.trim()}
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? t.common.loading : t.profile.saveChanges}
            </button>
          </form>
        </SectionCard>

        {/* Password Change */}
        <SectionCard>
          <h2 className="mb-4 text-sm font-semibold text-stone-300">
            {t.profile.changePasswordSection}
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordMsg && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400">
                {passwordMsg}
              </div>
            )}
            {passwordError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {passwordError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-300">
                {t.profile.currentPassword}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300">
                {t.profile.newPassword}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-700 bg-stone-950 px-4 py-2 text-sm text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword}
              className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changingPassword ? t.common.loading : t.profile.changePasswordSection}
            </button>
          </form>
        </SectionCard>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-amber-500 hover:text-amber-400"
        >
          &larr; {t.common.back}
        </button>
      </div>
    </div>
  );
}
