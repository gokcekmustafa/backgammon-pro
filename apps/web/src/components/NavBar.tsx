'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import NotificationBell from '@/components/NotificationBell';
import { useTranslation } from '@/lib/i18n';
import { useState, useRef, useEffect } from 'react';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

export default function NavBar() {
  const t = useTranslation();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

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

          {/* Right side — only render after auth check resolves */}
          <div className="flex items-center gap-4 text-sm">
            {isLoading ? (
              /* Skeleton placeholder — keeps layout stable, prevents flicker */
              <div className="flex items-center gap-3">
                <div className="h-4 w-16 animate-pulse rounded bg-stone-700" />
                <div className="h-4 w-12 animate-pulse rounded bg-stone-700" />
              </div>
            ) : isAuthenticated && user ? (
              <>
                <Link
                  href="/lobby"
                  className="text-stone-400 transition-colors hover:text-stone-100"
                >
                  {t.nav.lobby}
                </Link>
                <div className="flex items-center gap-3">
                  <NotificationBell />
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen(!menuOpen)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-stone-950 hover:bg-amber-500 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-950"
                      aria-label={t.nav.profile}
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        initials(user.displayName)
                      )}
                    </button>

                    {menuOpen && (
                      <div
                        className="absolute right-0 top-full mt-2 w-48 origin-top-right rounded-lg border border-stone-700 bg-stone-900 py-1 shadow-xl shadow-black/40"
                        role="menu"
                      >
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                        >
                          {t.profile.myProfile}
                        </Link>
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                        >
                          {t.profile.editTitle}
                        </Link>
                        <Link
                          href="/settings"
                          className="block px-4 py-2 text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                        >
                          {t.nav.settings}
                        </Link>
                        <hr className="my-1 border-stone-700" />
                        <button
                          type="button"
                          className="block w-full px-4 py-2 text-left text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            logout();
                          }}
                        >
                          {t.nav.logout}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <ul className="flex items-center gap-4 sm:gap-6" role="list">
                <li>
                  <Link
                    href="/login"
                    className="text-stone-400 transition-colors hover:text-stone-100"
                  >
                    {t.nav.login}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400"
                  >
                    {t.nav.signUp}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/guest-login"
                    className="text-stone-400 transition-colors hover:text-stone-100"
                  >
                    {t.nav.guestLogin}
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </nav>
      </header>
    </>
  );
}
