'use client';

import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';
import { useTranslation } from '@/lib/i18n';

const navLinks = [
  { href: '/', key: 'home' as const },
  { href: '/register', key: 'signUp' as const },
  { href: '/login', key: 'login' as const },
  { href: '/guest-login', key: 'guestLogin' as const },
  { href: '/lobby', key: 'lobby' as const },
  { href: '/leaderboard', key: 'leaderboard' as const },
  { href: '/seasons', key: 'seasons' as const },
  { href: '/battle-pass', key: 'battlePass' as const },
  { href: '/progression', key: 'progression' as const },
  { href: '/settings', key: 'settings' as const },
] as const;

export default function NavBar() {
  const t = useTranslation();
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-amber-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-stone-950"
      >
        {t.app.skipToMain}
      </a>
      <header
        className="border-b border-stone-800"
        style={{ borderColor: 'rgb(var(--color-border))' }}
      >
        <nav
          className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-amber-500 hover:text-amber-400"
            aria-label={t.app.logoAria}
            style={{ color: 'rgb(var(--color-accent))' }}
          >
            {t.app.title}
          </Link>
          <ul className="flex items-center gap-4 text-sm sm:gap-6" role="list">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-stone-400 transition-colors hover:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-950 rounded"
                >
                  {t.nav[link.key]}
                </Link>
              </li>
            ))}
            <li>
              <NotificationBell />
            </li>
          </ul>
        </nav>
      </header>
    </>
  );
}
