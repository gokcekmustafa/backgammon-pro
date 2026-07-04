'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';
import { api, ApiError } from '@/lib/api';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '▦' },
  { href: '/admin/seasons', label: 'Seasons', icon: '◈' },
  { href: '/admin/security', label: 'Security', icon: '◈' },
  { href: '/admin/tournaments', label: 'Tournaments', icon: '🏆' },
  { href: '/admin/users', label: 'Users', icon: '◎' },
  { href: '/admin/moderators', label: 'Moderators', icon: '★' },
  { href: '/admin/banned', label: 'Banned', icon: '⊘' },
  { href: '/admin/tables', label: 'Live Tables', icon: '⊞' },
  { href: '/admin/games', label: 'Live Games', icon: '♟' },
  { href: '/admin/audit', label: 'Audit Log', icon: '☰' },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-stone-800 bg-stone-900 p-4">
      <Link href="/admin" className="mb-6 block text-sm font-bold tracking-tight text-amber-500">
        Admin Panel
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
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

    return () => { cancelled = true; };
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
          <h1 className="text-2xl font-bold text-stone-100">Unauthorized</h1>
          <p className="mt-2 text-stone-400">You do not have access to this area.</p>
          <Link href="/lobby" className="mt-4 inline-block text-amber-500 hover:text-amber-400">
            Return to Lobby
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
