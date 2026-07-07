'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { api, ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

function Sidebar() {
  const pathname = usePathname();
  const t = useTranslation();

  const navItems = [
    { href: '/admin', label: t.admin.dashboard, icon: '▦' },
    { href: '/admin/seasons', label: t.admin.seasons, icon: '◈' },
    { href: '/admin/security', label: t.admin.security, icon: '◈' },
    { href: '/admin/tournaments', label: t.admin.tournaments, icon: '🏆' },
    { href: '/admin/users', label: t.admin.users, icon: '◎' },
    { href: '/admin/moderators', label: t.admin.moderators, icon: '★' },
    { href: '/admin/banned', label: t.admin.banned, icon: '⊘' },
    { href: '/admin/tables', label: t.admin.liveTables, icon: '⊞' },
    { href: '/admin/games', label: t.admin.liveGames, icon: '♟' },
    { href: '/admin/audit', label: t.admin.auditLog, icon: '☰' },
  ];

  return (
    <aside className="w-56 shrink-0 border-r border-stone-800 bg-stone-900 p-4">
      <Link href="/admin" className="mb-6 block text-sm font-bold tracking-tight text-amber-500">
        {t.admin.title}
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    let cancelled = false;

    async function checkAdmin() {
      try {
        await api('/api/admin/users?limit=1');
        if (!cancelled) {
          setIsAdmin(true);
          setChecking(false);
        }
      } catch (err) {
        if (!cancelled) {
          setIsAdmin(false);
          setChecking(false);
          if (err instanceof ApiError && err.status === 401) {
            router.push('/login');
          }
        }
      }
    }

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || checking) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (isAdmin === false) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-100">{t.admin.unauthorized}</h1>
          <p className="mt-2 text-stone-400">{t.admin.noAccess}</p>
          <Link href="/lobby" className="mt-4 inline-block text-amber-500 hover:text-amber-400">
            {t.admin.returnToLobby}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
